import './index.scss'

import { Form, Select, Input, Collapse, InputNumber, Space, Button } from 'antd'
import { t } from '../../../i18n/index.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { AxisType, type IAxisItem, type IYAxisItemValue, Position, ILineType } from './type.js'
import { concat_name_path, convert_list_to_options } from '../utils.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { useMemo } from 'react'
import { StringColorPicker } from '../../components/StringColorPicker/index.js'
import { chart_type_options, format_time_options, line_type_options, mark_line_options, mark_point_options } from './constant.js'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { WidgetChartType } from '../model.js'
import { PaddingSetting, VariableSetting } from './BasicFormFields.js'

interface IProps { 
    col_names: string[]
}

const axis_type_options = [
    {
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

export function BasicFormFields () { 
    
    return <Collapse
        items={[{
            key: 'basic',
            label: t('基本属性'),
            children: <div className='axis-wrapper'>
                <Form.Item name='title' label={ t('标题') } initialValue={ t('标题') }>
                    <Input />
                </Form.Item>
                <Form.Item name='title_size' label='标题字号'>
                    <InputNumber addonAfter='px'/>
                </Form.Item>
                
                <PaddingSetting />
                <Form.Item name='with_tooltip' label={t('气泡提示')} initialValue>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='x_datazoom' label={t('X 轴缩略轴')} initialValue>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='y_datazoom' label={t('Y 轴缩略轴')} initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
            </div>,
            forceRender: true
        },
        {
            key: 'variable',
            label: t('变量设置'),
            children: <VariableSetting />, 
            forceRender: true
        }]} />
}

function AxisItem (props: IAxisItem) { 
    const { name_path, col_names = [ ], list_name, initial_values } = props
    
    return <>
        <Form.Item
            name={concat_name_path(name_path, 'type')}
            label={t('类型')}
            initialValue='time'
            tooltip={t('数值轴，适用于连续数据\n类目轴，适用于离散的类目数据或者时序数据\n对数轴，适用于对数数据')}>
            <Select options={axis_type_options}  />
        </Form.Item>
        <Form.Item name={concat_name_path(name_path, 'name')} label={t('名称')} initialValue={initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        <Form.Item name={concat_name_path(name_path, 'fontsize')} label={t('字号')} initialValue={12}>
            <InputNumber addonAfter='px' />
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
        <Form.Item label={t('时间格式化')} name={concat_name_path(name_path, 'time_format')}>
            <Select options={format_time_options} allowClear/>
        </Form.Item>
    </>
}


// 多y轴
function YAxis ({ col_names, initial_values }: { col_names: string[], initial_values?: IYAxisItemValue[] }) { 
    // const { col_names, initial_values } = props
    
    const default_initial_values = useMemo(() => ([
        {
            type: AxisType.VALUE,
            name: t('名称'),
            col_name: col_names[0],
            position: 'left',
            offset: 0
        }
    ]), [col_names])
    
    
    return <Form.List name='yAxis' initialValue={initial_values || default_initial_values}>
        {(fields, { add, remove }) => {
            const items = fields.map((field, index) => {
                const children = <div className='field-wrapper' key={field.name}>
                    <Space>
                        <div className='axis-wrapper'>
                            <AxisItem col_names={col_names} name_path={field.name} list_name='yAxis'/>
                            <Form.Item name={[field.name, 'position']} label={t('位置')} initialValue='left'>
                                <Select options={axis_position_options} />
                            </Form.Item>
                            <Form.Item tooltip={t('Y 轴相对于左右默认位置的偏移')} name={[field.name, 'offset']} label={t('偏移量')} initialValue={0}>
                                <InputNumber />
                            </Form.Item>
                        </div>
                    </Space>
                </div>
                    
                return {
                    children,
                    key: field.name,
                    label: <div className='yaxis-collapse-label'>
                        {`${t('Y 轴')} ${field.name + 1}`}
                        {
                            index >= 2 &&
                            <DeleteOutlined
                                className='delete-icon'
                                onClick={() => { remove(field.name) }}
                            />
                        }
                    </div>,
                    forceRender: true,
                }
            })
            
            return <div className='yasix-collapse-wrapper'>
                <Collapse items={items} size='small'/>
            </div>
         }}
    </Form.List>
}


function Series (props: { col_names: string[] }) { 
    const { col_names } = props
    
    const series = useMemo(() => [{ name: '', key: 0, selected_cols: [ 'open', 'close', 'lowest', 'highest'] }, 
                                  { name: '', key: 1 }], [ ])
    
    return <Form.List name='series' initialValue={series}>
             {(fields, { add, remove }) => { 
            const items = fields.map((field, index) => { 
                const children = 
                    <div className='field-wrapper'>
                        {index <= 1 ?  (series[index]?.selected_cols ?
                                        series[index].selected_cols.map(col => 
                                            <Form.Item key={col} name={[field.name, col]} label={col} initialValue={col !== 'limit' ? col_names?.[0] : 0} >
                                                {
                                                    col !== 'limit' ?
                                                            <Select options={convert_list_to_options(col_names)} allowClear/>
                                                                :
                                                            <InputNumber />
                                                            
                                                }
                                            </Form.Item>) 
                                                                :
                                        <Form.Item name={[field.name, 'col_name']} label={t('交易量')} initialValue={col_names?.[0]} >
                                            <Select options={convert_list_to_options(col_names)} />
                                        </Form.Item>) 
                                    : 
                                        <>
                                            <Form.Item name={[field.name, 'col_name']} label={t('数据列')} initialValue={col_names?.[0]} >
                                                <Select options={col_names.map(item => ({ label: item, value: item })) } />
                                            </Form.Item>
                                            <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={`${t('数据列')} ${field.key + 1}`}> 
                                                <Input />
                                            </Form.Item>
                                            <Form.Item name={[field.name, 'type']} label={t('类型')} initialValue={WidgetChartType.LINE} >
                                                <Select options={chart_type_options} disabled />
                                            </Form.Item>
                                        </>
                        }
                        
                        
                        {/* 数据关联的y轴选择 */}
                        <FormDependencies dependencies={['yAxis']}>
                            { value => {
                                const { yAxis } = value
                                const options = yAxis.map((item, idx) => ({
                                    value: idx,
                                    label: item?.name
                                }))
                                return <Form.Item name={[field.name, 'yAxisIndex']} label={t('关联 Y 轴')} initialValue={0}>
                                    <Select options={options} />
                                </Form.Item>
                            } }
                        </FormDependencies>
                        
                        {
                          index <= 1 ?   
                          (series[index]?.selected_cols ? 
                                <>
                                    <Form.Item name={[field.name, 'kcolor']} label={t('k 线颜色（涨）')}>
                                        <StringColorPicker />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'kcolor0']} label={t('k 线颜色（跌）')}>
                                        <StringColorPicker />
                                    </Form.Item>
                                </> :  
                                <></>) :
                                <>
                                    <Form.Item name={[field.name, 'color']} label={t('线条颜色')} initialValue={null}>
                                        <StringColorPicker />
                                    </Form.Item>
                                    
                                    <Form.Item name={[field.name, 'mark_point']} label={t('标记点')}>
                                        <Select options={mark_point_options} mode='multiple'/>
                                    </Form.Item>
                                    
                                    <Form.Item label={t('水平线')} name={[field.name, 'mark_line']}>
                                        <Select options={mark_line_options} mode='tags' />
                                    </Form.Item>
                                </>
                        }
                        
                        
                        
                       
                        {/* 仅折线图可选择线类型 */}
                        
                        <FormDependencies dependencies={[['series', field.name, 'type']]}>
                            {({ series }) => { 
                                const { type: seriesType } = series.find(item => !!item)
                                { /**
                                    柱状图可以选择是否堆叠展示 
                                    折线图可以选择线类型
                                 */ 
                                }
                                if (seriesType === WidgetChartType.BAR)
                                    return <Form.Item tooltip={t('同个类目轴上为数据列配置相同的堆叠值可以堆叠放置')} label={t('堆叠值')} name={[field.name, 'stack']}>
                                        <Input />
                                    </Form.Item>
                                else if (seriesType === WidgetChartType.LINE)
                                    return <Form.Item label={t('线类型')} name={[field.name, 'line_type']} initialValue={ILineType.SOLID}>
                                        <Select options={line_type_options} />
                                    </Form.Item>
                                else
                                    return null
                            } }
                        </FormDependencies>
                    </div>
                 return {
                    key: field.name,
                    children,
                    label: <div className='series-collapse-label'>
                        {`${t('数据列')} ${field.name + 1}`}
                        {index >= 2 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} />}
                    </div>,
                    forceRender: true
                }
            })
            
            return <>
                <Collapse
                    size='small'
                    className='series-collapse'
                    items={items}
                /> 
                    <Button
                        className='add-series-btn'
                        type='dashed'
                        block
                        onClick={() => { add() }}
                        icon={<PlusCircleOutlined />}
                    >
                        {t('增加数据列')}
                    </Button> 
            </>
        }}
        </Form.List>
        
        { }
}


export function OhlcFormFields (props: IProps) {
    const { col_names = [ ] } = props
    
    const [x_axis, y_axis] = useMemo(
        () => [
            { type: AxisType.TIME, name: '' },
            [
                { type: AxisType.VALUE, name: t('k 线'), position: Position.LEFT },
                { type: AxisType.VALUE, name: t('交易量'), position: Position.RIGHT }
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
