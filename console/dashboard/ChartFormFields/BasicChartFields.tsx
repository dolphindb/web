import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'
import { concat_name_path, convert_list_to_options } from '../utils.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { AxisType, type IAxisItem, ILineType, type IYAxisItemValue, ITimeFormat } from './type.js'


import { axis_position_options, axis_type_options, chart_type_options, format_time_options, line_type_options, mark_line_options, mark_point_options } from './constant.js'
import { WidgetChartType, dashboard } from '../model.js'
import { StringColorPicker } from '../../components/StringColorPicker/index.js'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'
import { StringTimePicker } from '../../components/StringTimePicker.js'



export const DATE_SELECT_FORMAT = {
    [ITimeFormat.DAY_MINUTE]: <StringDatePicker submitFormat={ITimeFormat.DAY_MINUTE} format={ITimeFormat.DAY_MINUTE} showTime allowClear/>,
    [ITimeFormat.DATE]: <StringDatePicker submitFormat={ITimeFormat.DATE} format={ITimeFormat.DATE}  allowClear />,
    [ITimeFormat.DATE_HOUR]: <StringDatePicker submitFormat={ITimeFormat.DATE_HOUR} format={ITimeFormat.DATE_HOUR} showTime allowClear />,
    [ITimeFormat.DATE_MINUTE]: <StringDatePicker submitFormat={ITimeFormat.DATE_MINUTE} format={ITimeFormat.DATE_MINUTE} showTime allowClear />,
    [ITimeFormat.DATE_SECOND]: <StringDatePicker submitFormat={ITimeFormat.DATE_SECOND} format={ITimeFormat.DATE_SECOND} showTime allowClear />,
    [ITimeFormat.HOUR]: <StringTimePicker format={ITimeFormat.HOUR} allowClear />,
    [ITimeFormat.MINUTE]: <StringTimePicker format={ITimeFormat.MINUTE} allowClear />,
    [ITimeFormat.SECOND]: <StringTimePicker format={ITimeFormat.SECOND} allowClear />,
} 

// col 表示是否需要选择坐标列，x轴必须选择坐标列
export function AxisItem ({ name_path, col_names = [ ], list_name, initial_values, col }: IAxisItem) { 
    return <>
        <Form.Item
            label={t('类型')}
            name={concat_name_path(name_path, 'type')}
            initialValue={initial_values?.type ?? AxisType.CATEGORY}
            tooltip={<>
                {t('数值轴，适用于连续数据')}
                <br />
                {t('时间轴，适用于连续的时序数据')}
                <br />
                {t('类目轴，适用于离散的类目数据，或者时序数据')}
                <br />
                {t('对数轴，适用于对数数据')}
            </>}
        >
            <Select options={axis_type_options} />
        </Form.Item>
        <Form.Item label={t('名称')} name={concat_name_path(name_path, 'name')} initialValue={ initial_values?.name ?? t('名称')}>
            <Input />
        </Form.Item>
        <Form.Item label={t('字号')} name={ concat_name_path(name_path, 'fontsize')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        {/* 类目轴从 col_name 中获取 data */}
        <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'type')]}>
            {value => {
                const type = list_name ? value[list_name]?.find(item => item)?.type : value?.[name_path]?.type
                switch (type) { 
                    case AxisType.VALUE:
                        return <>
                            { col && <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                                <Select options={convert_list_to_options(col_names)} allowClear/>
                            </Form.Item> }
                            <Form.Item name={concat_name_path(name_path, 'with_zero')} label={t('强制包含零刻度')} initialValue={false}>
                                <BoolRadioGroup />
                            </Form.Item>
                            <Form.Item name={concat_name_path(name_path, 'min')} label={t('最小值')}>
                                <InputNumber />
                            </Form.Item>
                            <Form.Item name={concat_name_path(name_path, 'max')} label={t('最大值')}>
                                <InputNumber />
                            </Form.Item>
                        </>
                    case AxisType.LOG:
                        return <>
                            <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                                <Select options={convert_list_to_options(col_names)} allowClear/>
                            </Form.Item>
                            <Form.Item name={concat_name_path(name_path, 'log_base')} label={t('底数')} initialValue={10}>
                                <InputNumber />
                            </Form.Item>
                        </>
                    case AxisType.TIME:
                        return <>
                            <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                                <Select options={convert_list_to_options(col_names)} allowClear/>
                            </Form.Item>
                            <Form.Item name={concat_name_path(name_path, 'time_format')} label={t('时间格式化')}>
                                <Select options={format_time_options.slice(4)}/>
                            </Form.Item>
                            <FormDependencies dependencies={[concat_name_path(list_name, name_path, 'time_format')]}>
                                {value => { 
                                    const time_format = list_name ? value[list_name]?.find(item => item)?.time_format : value?.[name_path]?.time_format
                                    if (!time_format)
                                        return null
                                    else
                                        return <>
                                            <Form.Item name={concat_name_path(name_path, 'min')} label={t('开始时间')}>
                                                {DATE_SELECT_FORMAT[time_format]}
                                            </Form.Item>
                                            <Form.Item name={concat_name_path(name_path, 'max')} label={t('结束时间')}>
                                                {DATE_SELECT_FORMAT[time_format]}
                                            </Form.Item>
                                        </>
                                } }
                            </FormDependencies>
                        </>
                    case AxisType.CATEGORY:
                        return <>
                            <Form.Item name={concat_name_path(name_path, 'col_name')} label={t('坐标列')} initialValue={initial_values?.col_name ?? col_names?.[0]} >
                                <Select options={convert_list_to_options(col_names)} allowClear/>
                            </Form.Item>
                            <Form.Item name={concat_name_path(name_path, 'time_format')} label={t('时间格式化')}>
                                <Select options={format_time_options} allowClear/>
                            </Form.Item>
                        </>
                    default: 
                        return null
                }
            }}
        </FormDependencies>
        
                                                
       
    </>
}


function Series (props: { col_names: string[], single?: boolean }) { 
    const { col_names, single = false } = props
    const { widget: { type } } = dashboard.use(['widget'])
    
    const series = Form.useWatch('series')
    
    const is_heat_map = type === WidgetChartType.HEATMAP
    
    return <Form.List name='series' initialValue={[{ col_name: col_names[0], name: t('数据列 1'), yAxisIndex: 0, type: type === WidgetChartType.MIX ? WidgetChartType.LINE : type, color: null }]}>
        {(fields, { add, remove }) => { 
            const items = fields.map(field => { 
                const children = 
                    <div className='field-wrapper'>
                        <Form.Item name={[field.name, 'col_name']} label={type === WidgetChartType.HEATMAP ? t('热力值列') : t('数据列')} initialValue={col_names?.[0]} >
                            <Select options={col_names.map(item => ({ label: item, value: item })) } />
                        </Form.Item>
                        <Form.Item name={[field.name, 'name']} label={t('名称')} initialValue={`${t('数据列')} ${field.key + 1}`}> 
                            <Input />
                        </Form.Item>
                        
                        {type !== WidgetChartType.HEATMAP && <>
                            <Form.Item name={[field.name, 'type']} label={t('类型')} initialValue={type === WidgetChartType.MIX ? WidgetChartType.LINE : type}>
                                <Select options={chart_type_options} disabled={type !== WidgetChartType.MIX} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'color']} label={t('颜色')} initialValue={null}>
                                <StringColorPicker />
                            </Form.Item>
                        </>}
                        
                       
                        
                        {/* 数据关联的y轴选择 */}
                        {!is_heat_map && <FormDependencies dependencies={['yAxis']}>
                            { value => {
                                const { yAxis, series } = value
                                const options = yAxis.map((item, idx) => ({
                                    value: idx,
                                    label: item?.name
                                }))
                                return <Form.Item hidden={is_heat_map} name={[field.name, 'yAxisIndex']} label={t('关联 Y 轴')} initialValue={0}>
                                    <Select options={options} />
                                </Form.Item>
                            } }
                        </FormDependencies> }
                        
                        { !is_heat_map && <>
                            <Form.Item name={[field.name, 'mark_point']} label={t('标记点')}>
                                <Select options={mark_point_options} mode='multiple'/>
                            </Form.Item>
                            
                            <Form.Item label={t('水平线')} name={[field.name, 'mark_line']}>
                                <Select options={mark_line_options} mode='tags' />
                            </Form.Item>
                        </> }
                        {/* 仅折线图可选择线类型 */}
                        
                        <FormDependencies dependencies={[['series', field.name, 'type']]}>
                            {({ series }) => { 
                                const { type: seriesType } = series.find(item => !!item)
                                { /**
                                    柱状图可以选择是否堆叠展示 
                                    折线图可以选择线类型
                                 */ 
                                }
                                
                                const ThresholdSelect = <>
                                    <Form.Item name={[field.name, 'threshold', 'value']} label={t('阈值')}>
                                        <InputNumber />
                                    </Form.Item>
                                    <FormDependencies dependencies={[['series', field.name, 'threshold', 'value']]}>
                                        {({ series }) => { 
                                            const { threshold } = series?.[field.name] || { }
                                            if (isNaN(threshold?.value))
                                                return null
                                                
                                            return <>
                                                <Form.Item label={t('低于阈值配色')} name={[field.name, 'threshold', 'low_color']}>
                                                    <StringColorPicker />
                                                </Form.Item>
                                                <Form.Item label={t('高于阈值配色')} name={[field.name, 'threshold', 'high_color']} >
                                                    <StringColorPicker />
                                                </Form.Item>
                                            </>
                                        } }
                                        
                                    </FormDependencies>
                                
                                </>
                                
                                if (seriesType === WidgetChartType.BAR)
                                    return <>
                                        <Form.Item tooltip={t('同个类目轴上为数据列配置相同的堆叠值可以堆叠放置')} label={t('堆叠值')} name={[field.name, 'stack']}>
                                            <Input />
                                        </Form.Item>
                                        {ThresholdSelect}
                                    
                                    </>
                                else if (seriesType === WidgetChartType.LINE)
                                    return <>
                                        <Form.Item label={t('线类型')} name={[field.name, 'line_type']} initialValue={ILineType.SOLID}>
                                            <Select options={line_type_options} />
                                        </Form.Item>
                                        <Form.Item label={t('线宽')} name={[field.name, 'line_width']}>
                                            <InputNumber addonAfter='px'/>
                                        </Form.Item>
                                        <Form.Item name={[field.name, 'end_label']} label={t('展示端标签')} initialValue={false}>
                                            <BoolRadioGroup />
                                        </Form.Item>
                                        <FormDependencies dependencies={[['series', field.name, 'end_label']]}>
                                            {value => { 
                                                if (!value.series?.[field.name]?.end_label)
                                                    return null
                                                
                                                return <Form.Item
                                                name={[field.name, 'end_label_formatter']}
                                                label={t('自定义端标签')}
                                                tooltip={<>
                                                    {t('支持静态标签与模板变量，其中模板变量包含以下几种')}
                                                    <br />
                                                    {t('{a}：数据列名称')}
                                                    <br />
                                                    {t('{b}：x 轴值')}
                                                    <br />
                                                    {t('{c}：当 x 轴为类目轴时显示 y 轴值，其余轴的情况下显示 x轴值,y轴值')}
                                                    <br />
                                                    {t('示例: 名称-{a}')}
                                                    <br />
                                                    {t('请注意，不填自定义端标签时默认展示 y 轴值') }
                                                </>}
                                            >
                                                    <Input placeholder={t('请输入自定义端标签')} />
                                            </Form.Item>
                                            } }
                                        </FormDependencies>
                                    </>
                                else if (seriesType === WidgetChartType.SCATTER)
                                    return <>
                                        <Form.Item label={t('散点大小')} name={[field.name, 'symbol_size']} initialValue={10}>
                                            <InputNumber min={1} />
                                        </Form.Item>
                                        <Form.Item label={t('散点标记')} name={[field.name, 'symbol']} initialValue='circle'>
                                            <Select options={convert_list_to_options(['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow']) } />
                                        </Form.Item>
                                    </>
                                else if (seriesType === WidgetChartType.HEATMAP)
                                    return <>
                                        <Form.Item label={t('阴暗色')} name={[field.name, 'in_range', 'color', 'low']} initialValue='#EBE1E1'>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <Form.Item label={t('明亮色')} name={[field.name, 'in_range', 'color', 'high']} initialValue='#983430'>
                                            <StringColorPicker />
                                        </Form.Item>
                                        <Form.Item label={t('最小值')} name={[field.name, 'min']}>
                                            <InputNumber />
                                        </Form.Item>
                                        <Form.Item label={t('最大值')} name={[field.name, 'max']}>
                                            <InputNumber />
                                        </Form.Item>
                                        <Form.Item label={t('展示标签')} name={[field.name, 'with_label']} initialValue={false}>
                                            <BoolRadioGroup />
                                        </Form.Item>
                                    </>
                                else
                                    return null
                            } }
                        </FormDependencies>
                    </div>
                
                return {
                    key: field.name,
                    children,
                    label: <div className='series-collapse-label'>
                        { series?.[field.name]?.name || `${t('数据列')} ${field.name + 1}` }
                        { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} /> }
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
                {
                    !single && <Button
                        className='add-series-btn'
                        type='dashed'
                        block
                        onClick={() => { add() }}
                        icon={<PlusCircleOutlined />}
                    >
                        {t('增加数据列')}
                    </Button>  
                }
            </>
        }}
    </Form.List>
}

export function YAxis (props: { col_names: string[], initial_values?: IYAxisItemValue[], single?: boolean } ) {
    const { col_names, initial_values, single } = props
    
    const default_initial_values = useMemo(() => ([
        {
            type: AxisType.VALUE,
            name: t('名称'),
            col_name: col_names[0],
            position: 'left',
            offset: 0
        }
    ]), [col_names])
    
    const yAxis = Form.useWatch('yAxis')
    
    return <Form.List name='yAxis' initialValue={initial_values || default_initial_values}>
        {(fields, { add, remove }) => {
            const items = fields.map(field => {
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
                        {/* {`Y 轴 ${field.name + 1}`} */}
                        {yAxis?.[field.name]?.name || `${t('Y 轴')} ${field.name + 1}` }
                        {
                            fields.length > 1 &&
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
                {
                    !single && <Button
                        className='add-yaxis-btn'
                        type='dashed'
                        block
                        onClick={() => { add() }}
                        icon={<PlusCircleOutlined />}
                    >
                        {t('增加 Y 轴')}
                    </Button>
                }
            </div>
         }}
    </Form.List>
}

export function AxisFormFields ({ col_names = [ ], single = false }: { col_names: string[], single?: boolean }) {
    return <Collapse items={[{
        key: 'x_axis',
        label: t('X 轴属性'),
        children: <div className='axis-wrapper'><AxisItem col name_path='xAxis' col_names={col_names} /></div>,
        forceRender: true,
    },
    {
        key: 'y_axis',
        label: t('Y 轴属性'),
        children: <YAxis col_names={col_names} single={single} />,
        forceRender: true,
    }
    ]} />
}


export function SeriesFormFields (props: { col_names: string[], single?: boolean }) {
    const { col_names, single = false } = props
    return <Collapse items={[
        {
            key: 'series',
            label: t('数据列'),
            children: <Series col_names={col_names} single={single} />,
            forceRender: true,
        }
    ]} />
}


