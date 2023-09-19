import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { t } from '../../../i18n/index.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { FormDependencies } from '../../components/formily/FormDependies/index.js'
import { AxisType, IAxisItem, IYAxisItemValue, Position } from './type.js'

import './index.scss'
import { concat_name_path } from '../utils.js'



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


const AxisItem = (props: IAxisItem) => { 
    const { name_path, col_names = [ ], list_name, initial_values } = props
    
    return <>
        <Form.Item
            name={concat_name_path(name_path, 'type')}
            label={t('类型')}
            initialValue='time'
            tooltip={t('数值轴，适用于连续数据\n类目轴，适用于离散的类目数据\n时间轴，适用于连续的时序数据\n对数轴，适用于对数数据')}>
            <Select disabled options={axis_type_options}  />
        </Form.Item>
        <Form.Item name={concat_name_path(name_path, 'name')} label={t('名称')} initialValue={ initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        {/* 类目轴从col_name中获取data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => { 
                const { type } = list_name ? value[list_name].find(item => !!item) : value[name_path] 
                if (!['category', 'time'].includes(type))
                    return null
                return <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                    <Select options={col_names.map(item => ({ label: item, value: item }))} />
                </Form.Item>
            } }
        </FormDependencies>
    </>
}


// 多y轴
const YAxis = (props: { col_names: string[], initial_values?: IYAxisItemValue[] }) => { 
    const { col_names, initial_values } = props
    
    const default_initial_values = [
        {
            type: 'category',
            name: t('名称'),
            col_name: col_names[0],
            position: 'left',
            offset: 0
        }
    ]
    
    return <Form.List name='yAxis' initialValue={initial_values || default_initial_values}>
        {fields =>      
            <>
                {
                    fields.map((field, index) => {
                        return <div key={field.name}>
                            <div className='wrapper'>
                                <Space size='small'>
                                    <div className='axis-wrapper'>
                                        <AxisItem col_names={col_names} name_path={field.name} list_name='yAxis' />
                                        <Form.Item name={[field.name, 'position']} label={t('位置')} initialValue='left'>
                                            <Select options={axis_position_options} />
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'offset']} label={t('偏移量')} initialValue={0}>
                                            <InputNumber />
                                        </Form.Item>
                                    </div>
                                </Space>
                            </div>
                            { index < fields.length - 1 &&  <Divider className='divider'/> }
                        </div>
                    })
                }
                    
            </>}
    </Form.List>
}


const Series = (props: { col_names: string[] }) => { 
    const { col_names } = props
    
    const series = [{ name: 'OHLC', key: 0, selected_cols: [ 'Open', 'High', 'Low', 'Close'] }, { name: '交易量', key: 1 }]
    
    return <Form.List name='series' initialValue={series}>
        {fields => <>
            {
                fields.map((field, index) => { 
                    return <div key={ field.name }>
                        <Space>
                            <div className='wrapper'>
                                {series[index].selected_cols ?
                                    series[index].selected_cols.map(col => 
                                        <Form.Item name={[field.name, col]} label={col} initialValue={col_names?.[0]} >
                                            <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                        </Form.Item>) 
                                                            :
                                    <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                        <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                    </Form.Item>
                                }
                               
                                <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={t('名称')}> 
                                    <Input />
                                </Form.Item>
                                {/* 数据关联的y轴选择 */}
                                <FormDependencies dependencies={['yAxis']}>
                                    {value => {
                                        const { yAxis } = value
                                        const options = yAxis.map((item, idx) => ({
                                            value: idx,
                                            label: item.name
                                        }))
                                        return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联Y轴')} initialValue={field.key}>
                                            <Select options={options} />
                                    </Form.Item>
                                    } }
                                </FormDependencies>
                            </div>
                        </Space>
                        { index < fields.length - 1 && <Divider className='divider'/> }
                    </div>
                })
            }
        </>}
    </Form.List>
}


export const OhlcFormFields = (props: IProps) => { 
    const { col_names = [ ] } = props
    
    const x_axis = { type: AxisType.TIME, name: '时间' }
    const y_axis = [{ type: AxisType.VALUE, name: 'OHLC', position: Position.LEFT }, 
                    { type: AxisType.VALUE, name: '交易量', position: Position.RIGHT }]
    
    return <Collapse className='' items={[{
        key: 'x_axis',
        label: t('X轴属性'),
        children: <div className='axis-wrapper'><AxisItem name_path='xAxis' col_names={col_names} initial_values={x_axis}/></div>,
        forceRender: true,
    },
    {
        key: 'y_axis',
        label: t('Y轴属性'),
        // children: <AxisItem name_path='yAxis' col_names={col_names}/>,
        children: <YAxis col_names={ col_names } initial_values={y_axis}/>,
        forceRender: true,
    },
    {
        key: 'series',
        label: t('数据列'),
        children: <Series col_names={col_names}/>,
        forceRender: true,
    }
    ]} />
     
}
