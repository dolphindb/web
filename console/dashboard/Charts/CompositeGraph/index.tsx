import './index.scss'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { Button, Collapse, type CollapseProps, Form, Select, Tooltip, Input } from 'antd'
import { get, uniq } from 'lodash'
import { DdbType } from 'dolphindb'
import type { EChartsInstance } from 'echarts-for-react'
import { DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'


import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { t } from '../../../../i18n/index.js'
import { AxisItem, Series, ThresholdFormFields, YAxis } from '../../ChartFormFields/BasicChartFields.js'
import { AxisType } from '../../ChartFormFields/type.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { concat_name_path, convert_chart_config, convert_list_to_options, format_time, get_axis_range } from '../../utils.js'
import { DDB_TYPE_MAP } from '../../../constants/ddb-type-maps.js'
import { type Widget, dashboard } from '../../model.js'
import { SeriesItem } from '../../ChartFormFields/components/SeriesItem.js'
import { type ISeriesConfig, type IChartConfig } from '../../type.js'
import { get_data_source } from '../../DataSource/date-source.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'



enum MatchRuleType {
    NAME,
    REGEXP,
    DATA_TYPE
}

interface ICompositeSeriesConfig extends ISeriesConfig { 
    match_type?: MatchRuleType
    match_value?: any
    show?: boolean
}

interface ICompositeChartConfig extends Omit<IChartConfig, 'series'> { 
    series: ICompositeSeriesConfig[]
}

interface ICompositeChartProps { 
    data_source: {}[]
    col_names: string[]
    type_map: Record<string, DdbType>
    widget: Widget
}

const series_match_type_options = [
    {
        label: <>
            {t('列名完全匹配')}
            <Tooltip title={t('为指定名称的列定制配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.NAME
    },
    {
        label: <>
            {t('列名正则匹配')}
            <Tooltip title={t('为列名匹配正则表达式的列定制配置')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.REGEXP
    },
    {
        label: <>
            {t('类型匹配')}
            <Tooltip title={t('为特定 DolphinDB 数据类型的列定制配置，如 INT, DOUBLE')}>
                <QuestionCircleOutlined className='series_match_type_tip'/>
            </Tooltip>
        </>,
        value: MatchRuleType.DATA_TYPE
    }
]

const TIME_TYPES = [
    DdbType.date,
    DdbType.month,
    DdbType.time,
    DdbType.minute,
    DdbType.second,
    DdbType.datetime,
    DdbType.timestamp,
    DdbType.nanotime,
    DdbType.nanotimestamp,
    DdbType.datehour
]


const VALUE_TYPES = [
    DdbType.short,
    DdbType.int,
    DdbType.long,
    DdbType.float,
    DdbType.double,
    DdbType.decimal32,
    DdbType.decimal64,
    DdbType.decimal128
]


export function CompositeChart (props: ICompositeChartProps) {
    const { widget, data_source } = props
    const [update, set_update] = useState(null)
    
    const config = useMemo(() => widget.config as ICompositeChartConfig, [widget.config])
    
    
    const [echart_instance, set_echart_instance] = useState<EChartsInstance>()
    
    // 用来存储阈值对应的轴范围
    const [axis_range_map, set_axis_range_map] = useState<{ [key: string]: { min: number, max: number } }>()
    
    // 存储每个数据源的时间列和数据列
    const [source_col_map, set_source_col_map] = useState<Record<string, { time_col: string, series_col: string[] }>>({ })
    
    useEffect(() => { 
        set_source_col_map({ }) 
    }, [widget.source_id])
    
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    // 时序模式需要存储每个数据源的时间列和数据列
    useEffect(() => {
        if (config.is_time_series_mode)
            for (let id of widget.source_id) {
                const { cols, type_map } = get_data_source(id)
                // 第一个时间类型的列作为时间列，其余作为数据列
                const time_col = cols.find(col => TIME_TYPES.includes(type_map[col]))
                const series_col = cols.filter(item => item !== time_col && VALUE_TYPES.includes(type_map[item]))
                set_source_col_map(map => ({
                    ...map,
                    [id]: { time_col, series_col }
                }))
            }
    }, [update, type_map, config.is_time_series_mode, widget.source_id])
    
    const options = useMemo(() => { 
        const { is_time_series_mode, series: series_config = [ ], yAxis = [ ], ...others } = config
        let series = [ ]
        if (is_time_series_mode) {
            // 时序模式，查找匹配的数据列规则，设置数据列
            for (let [data_source_id, item] of Object.entries(source_col_map)) {
                const { series_col, time_col } = item
                for (let col of series_col) {
                    // 查找匹配规则
                    const match_rule = series_config.filter(Boolean).find(item => {
                        const { match_type, match_value } = item
                        switch (match_type) {
                            case MatchRuleType.NAME:
                                return match_value?.includes(col)
                            case MatchRuleType.DATA_TYPE:
                                return match_value?.includes(type_map[col])
                            case MatchRuleType.REGEXP:
                                try { return eval(match_value)?.test(col) }
                                catch (e) { return false }
                            default:
                                return false
                        }
                    })
                    
                    // 选了不展示数据列则不添加，其他情况下都添加
                    if (!(match_rule?.show === false))  
                        series.push({ data_source_id, x_col_name: time_col, col_name: col, type: 'line', yAxisIndex: 0, ...match_rule, name: col, })  
                }
            }
            const time_series_config = {
                ...others,
                // 手动设置 y 轴的类型为数据轴
                yAxis: yAxis.map(item => ({ ...item, type: AxisType.VALUE })),
                series,
            }
            return convert_chart_config({ ...widget, config: time_series_config } as unknown as Widget, data_source, axis_range_map)
        }
        // 非时序模式
        else  
            return convert_chart_config(widget, data_source, axis_range_map)
    }, [config, update, source_col_map, type_map, axis_range_map])
    
    
    useEffect(() => {
        if (!echart_instance)
            return
        // options 更新之后，重新计算 thresholds 对应的各轴的范围，判断是否需要更新
        const { thresholds = [ ] } = widget.config as IChartConfig
            for (let threshold of thresholds.filter(Boolean)) { 
                const { axis_type, axis } = threshold
                const [min, max] = get_axis_range(axis_type, echart_instance, axis)
                const key = (axis_type === 0 ? 'x' : 'y') + '_' + axis
                // 轴范围与之前的不一致才需要更新 axis_range_map, 一致则不需要更新
                if (axis_range_map?.[key]?.min !== min || axis_range_map?.[key]?.max !== max)  
                    set_axis_range_map(val => ({ ...val, [key]: { min, max } }))
            }
    }, [options, echart_instance])
    
    return <>
        {widget.source_id.map(id => <SingleDataSourceUpdate key={id} source_id={id} force_update={() => { set_update({ }) }}/>) }
        <ReactEChartsCore
            echarts={echarts}
            notMerge={dashboard.editing}
            option={options}
            className='dashboard-line-chart'
            theme='my-theme'
            onChartReady={(ins: EChartsInstance) => { set_echart_instance(ins) }}
        />
    </>
   
}

/** 用于更新多数据源 */
function SingleDataSourceUpdate (props: { source_id: string, force_update: () => void }) {
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { cols, data } = data_node.use(['cols', 'data'])
    
    useEffect(() => { force_update() }, [cols, data ])
    
    return null
}

/** 用于更新多数据源 */
function SingleDataSourceColUpdate (props: { source_id: string, force_update: () => void }) {
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { cols } = data_node.use(['cols'])
    
    useEffect(() => { force_update() }, [cols])
    
    return null
}

// 时序图不需要配置 y 轴，默认为数据轴
export function CompositeChartConfig () {
    const { widget } = dashboard.use(['widget']) 
    const type = useMemo(() => widget.type, [widget])
    const [update, set_update] = useState({ })
    
    const update_cols = useCallback(() => { set_update({ }) }, [ ])
    
    const form = Form.useFormInstance()
    
    // 是否开启时序图模式
    const is_time_series_mode = Form.useWatch('is_time_series_mode', form)
    
    // 所有数据源类型 map
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    // 所有数据源数值类型列名
    const col_options = useMemo(() => { 
        return convert_list_to_options(
            uniq(widget.source_id.reduce((prev, id) => { 
                const cols = uniq(get_data_source(id).cols).filter(col => VALUE_TYPES.includes(type_map[col]))
                return prev.concat(cols)
            }, [ ]))
        )
    }, [update, widget.source_id, type_map])
    
    
    return <>
        {widget.source_id.map(id => <SingleDataSourceColUpdate key={id} source_id={id} force_update={update_cols}/>) }
        <BasicFormFields type='chart' />
        <Collapse items={[
            {
                key: 'x_axis',
                label: t('X 轴配置'),
                forceRender: true,
                children: <AxisItem
                    col_names={[ ]}
                    name_path='xAxis'
                    hidden_fields={['col_name']}
                    initial_values={{
                        type: AxisType.CATEGORY
                    }}
                />
            },
            {
                key: 'y_axis',
                label: t('Y 轴配置'),
                forceRender: true,
                children: <YAxis
                    col_names={col_options.map(item => item.value) as string[]}
                    axis_item_props={{ hidden_fields: is_time_series_mode ? ['col_name', 'type'] : [ ] }} />
            },
            {
                key: 'series',
                label: t('数据列配置'),
                forceRender: true,
                children: !is_time_series_mode
                    ? <Series col_names={[ ]} />
                    : <Form.List name='series'>
                    {(fields, { add, remove }) => { 
                        const items: CollapseProps['items'] = fields.map(field => ({
                            key: `series_${field.name}`,
                            forceRender: true,
                            label: <div className='collapse-label'>
                                {t('配置规则 {{name}}', { name: field.name + 1 })}
                                <DeleteOutlined onClick={() => { remove(field.name) }}/>
                            </div>,
                            children: <div key={field.name}>
                                {/* 用户选择如何配置应用的范围 */}
                                <Form.Item label={t('匹配类型')} name={[field.name, 'match_type']}>
                                    <Select options={series_match_type_options} onSelect={() => { form.setFieldValue(concat_name_path('series', field.name, 'match_value'), undefined) } } />
                                </Form.Item>
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'match_type')]}>
                                    {value => { 
                                        const match_type = get(value, concat_name_path('series', field.name, 'match_type'))
                                        switch (match_type) {
                                            case MatchRuleType.NAME:
                                                return <Form.Item
                                                    label={t('筛选列')}
                                                    name={concat_name_path(field.name, 'match_value')}
                                                >
                                                    <Select mode='tags' options={col_options} />
                                                </Form.Item>
                                            case MatchRuleType.REGEXP:
                                                return <Form.Item
                                                    label={t('正则表达式')}
                                                    tooltip={<>
                                                        <div>{t('支持字面量形式和构造函数形式的正则对象')}</div>
                                                        <ul>
                                                            <li>{t('字面量：/abc/g')}</li>
                                                            <li>{t('构造函数：new RegExp("abc", "g")')}</li>
                                                        </ul> 
                                                    </>}
                                                    name={concat_name_path(field.name, 'match_value')}
                                                >
                                                    <Input placeholder={t('请输入正则表达式') } />
                                                </Form.Item>
                                            case MatchRuleType.DATA_TYPE:
                                                const types = uniq(Object.values(type_map)).filter(type => VALUE_TYPES.includes(type)).map(item => ({ label: DDB_TYPE_MAP[item], value: item }))
                                                return <Form.Item label={t('数据类型')} name={concat_name_path(field.name, 'match_value')}>
                                                    <Select options={types} mode='multiple'/>
                                                </Form.Item>
                                            default:
                                                return null
                                        }
                                    } }
                                </FormDependencies>
                                
                                {/* 是否展示 */}
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'match_value')] }>
                                    {value => {
                                        const match_value = get(value, concat_name_path('series', field.name, 'match_value'))
                                        return match_value
                                            ? <Form.Item label={t('是否展示')} name={concat_name_path(field.name, 'show')} initialValue>
                                                <BoolRadioGroup />
                                            </Form.Item>
                                            : null
                                    }}
                                </FormDependencies>
                                
                                 {/* 数据列配置 */}
                                <FormDependencies dependencies={[concat_name_path('series', field.name, 'show')]}>
                                    {value => { 
                                        const show = get(value, concat_name_path('series', field.name, 'show'))
                                        return show
                                            ? <SeriesItem col_names={col_options.map(item => item.value) as string[]} type={type} name={field.name} path='series' />
                                            : null
                                    } }
                                </FormDependencies>
                            </div>
                        }))
                        
                        return <>
                            {!!items.length && <Collapse items={items} size='small'/> }
                            <Button
                                style={{ width: '100%', marginTop: 12 }}
                                type='dashed'
                                icon={<PlusCircleOutlined />}
                                onClick={() => { add() }}
                            >
                                {t('增加配置规则')}
                            </Button>
                        </>
                    } }
                </Form.List>
            }
        ]} />
        <ThresholdFormFields />
    </>
}
