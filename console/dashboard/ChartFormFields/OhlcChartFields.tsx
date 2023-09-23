import { Form, Select, Input, Collapse, Divider, InputNumber, Space } from 'antd'
import { t } from '../../../i18n/index.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { AxisType, type IAxisItem, type IYAxisItemValue, Position } from './type.js'

import './index.scss'
import { concat_name_path, convert_list_to_options } from '../utils.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { useMemo } from 'react'



interface IProps { 
    col_names: string[]
}

const axis_type_options = [{
    label: t('数据轴'),
    value: 'value'
},
{
    label: t('类目轴'),
    value: 'category'
},
{
    label: t('时间轴'),
    value: 'time'
},
{
    label: t('对数'),
    value: 'log'
}]

const axis_position_options = [
    { value: 'left', label: t('左侧') },
    { value: 'right', label: t('右侧') }
]

export function BasicFormFields (props: { type: 'chart' | 'table' | 'description' }) { 
    const { type  } = props
    const FormFields = useMemo(() => { 
        const is_table = type === 'table'
        const is_chart = type === 'chart'
        
        const BasicChartSetting = <>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='x_datazoom' label={t('X 轴缩略轴')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='y_datazoom' label={t('Y 轴缩略轴')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
        </>
  
        const BasicTableSetting =  <>
            <Form.Item initialValue={false} name='bordered' label={t('展示边框')}>
                <BoolRadioGroup />
            </Form.Item>
        </>
        
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={ t('标题') } initialValue={ t('标题') }>
                <Input />
            </Form.Item>
            {is_chart && BasicChartSetting}
            {is_table && BasicTableSetting}
        </div>
    }, [type])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}

function AxisItem (props: IAxisItem) { 
    const { name_path, col_names = [ ], list_name, initial_values } = props
    
    return <>
        <Form.Item
            name={concat_name_path(name_path, 'type')}
            label={t('类型')}
            initialValue='category'
            tooltip={t('数值轴，适用于连续数据\n类目轴，适用于离散的类目数据\n时间轴，适用于连续的时序数据\n对数轴，适用于对数数据')}>
            <Select disabled options={axis_type_options}  />
        </Form.Item>
        <Form.Item name={concat_name_path(name_path, 'name')} label={t('名称')} initialValue={ initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        {/* 类目轴从col_name中获取data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => { 
                const type = list_name ? value[list_name]?.find(item => !!item)?.type : value?.[name_path]?.type
                switch (type) { 
                    case AxisType.LOG:
                        return <Form.Item name={concat_name_path(name_path, 'log_base')} label={t('底数')} initialValue={10}>
                            <InputNumber />
                        </Form.Item>
                    case AxisType.TIME:
                    case AxisType.CATEGORY:
                        return <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                            <Select options={convert_list_to_options(col_names)} />
                        </Form.Item>
                    default: 
                        return null
                }
            } }
        </FormDependencies>
    </>
}


// 多y轴
function YAxis ({ col_names, initial_values }: { col_names: string[], initial_values?: IYAxisItemValue[] }) { 
    return <Form.List name='yAxis' initialValue={initial_values}>
        {fields =>      
            <>
                {
                    fields.map((field, index) => {
                        return <div key={field.name}>
                                <div className='axis-wrapper'>
                                    <AxisItem col_names={col_names} name_path={field.name} list_name='yAxis' />
                                    <Form.Item name={[field.name, 'position']} label={t('位置')} initialValue='left'>
                                        <Select options={axis_position_options} />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'offset']} label={t('偏移量')} initialValue={0}>
                                        <InputNumber />
                                    </Form.Item>
                                </div>
                            { index < fields.length - 1 &&  <Divider className='divider'/> }
                        </div>
                    })
                }
                    
            </>}
    </Form.List>
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    const series = useMemo(() => [{ name: 'OHLC', key: 0, selected_cols: [ 'open', 'high', 'low', 'close'] }, 
                                  { name: '交易量', key: 1 }], [ ])
    
    return <Form.List name='series' initialValue={series}>
        {fields => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name }>
                            <div className='axis-wrapper'>
                                {series[index].selected_cols ?
                                    series[index].selected_cols.map(col => 
                                        <Form.Item key={col} name={[field.name, col]} label={col} initialValue={col_names?.[0]} >
                                            <Select options={convert_list_to_options(col_names)} />
                                        </Form.Item>) 
                                                            :
                                    <Form.Item name={[field.name, 'col_name']} label={t('交易量')} initialValue={col_names?.[0]} >
                                        <Select options={convert_list_to_options(col_names)} />
                                    </Form.Item>
                                }
                               
                                {/* <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                    <Input />
                                </Form.Item> */}
                                {/* 数据关联的y轴选择 */}
                                <FormDependencies dependencies={['yAxis']}>
                                    {value => {
                                        const { yAxis } = value
                                        const options = yAxis.map((item, idx) => ({
                                            value: idx,
                                            label: item?.name
                                        }))
                                        return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联 Y 轴')} initialValue={field.key}>
                                            <Select options={options} />
                                    </Form.Item>
                                    } }
                                </FormDependencies>
                            </div>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    </div>
                })
            }
        </>}
    </Form.List>
}


export function OhlcFormFields (props: IProps) {
    const { col_names = [ ] } = props
    
    const [x_axis, y_axis] = useMemo(
        () => [
            { type: AxisType.TIME, name: '时间' },
            [
                { type: AxisType.VALUE, name: 'OHLC', position: Position.LEFT },
                { type: AxisType.VALUE, name: '交易量', position: Position.RIGHT }
            ]
        ],
        [ ]
    )
    
    return <Collapse
        items={[
            {
                key: 'x_axis',
                label: t('X 轴属性'),
                children: (
                    <div className='axis-wrapper'>
                        <AxisItem name_path='xAxis' col_names={col_names} initial_values={x_axis} />
                    </div>
                ),
                forceRender: true
            },
            {
                key: 'y_axis',
                label: t('Y 轴属性'),
                // children: <AxisItem name_path='yAxis' col_names={col_names}/>,
                children: <YAxis col_names={col_names} initial_values={y_axis} />,
                forceRender: true
            },
            {
                key: 'series',
                label: t('数据列'),
                children: <Series col_names={col_names} />,
                forceRender: true
            }
        ]} />
}
