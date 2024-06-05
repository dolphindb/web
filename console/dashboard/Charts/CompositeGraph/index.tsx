import './index.scss'

import { useEffect, useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { pickBy } from 'lodash'
import { type DdbType } from 'dolphindb'
import type { EChartsInstance } from 'echarts-for-react'


import { AxisType, MatchRuleType, ThresholdType } from '../../ChartFormFields/type.js'
import { convert_chart_config, get_axis_range } from '../../utils.js'
import { dashboard, type Widget } from '../../model.js'
import type { ISeriesConfig, IChartConfig } from '../../type.js'
import { get_data_source } from '../../DataSource/date-source.js'

import { VALUE_TYPES, TIME_TYPES } from './constant.js'


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



export function CompositeChart (props: ICompositeChartProps) {
    const { widget, data_source } = props
    const [update, set_update] = useState(null)
    
    const config = useMemo(() => widget.config as ICompositeChartConfig, [widget.config])
    
    
    const [echart_instance, set_echart_instance] = useState<EChartsInstance>()
    
    // 用来存储阈值对应的轴范围，设置了百分比阈值时使用
    const [axis_range_map, set_axis_range_map] = useState<{ [key: string]: { min: number, max: number } }>()
    
    // 存储每个数据源的 X 轴列和数据列
    const [source_col_map, set_source_col_map] = useState<Record<string, { x_col_name: string, series_col: string[] }>>({ })
    
    useEffect(() => { 
        set_source_col_map({ }) 
    }, [widget.source_id])
    
    const type_map = useMemo<Record<string, DdbType>>(() => { 
        return widget.source_id.reduce((prev, id) => ({ ...prev, ...get_data_source(id).type_map }), { })
    }, [update, widget.source_id])
    
    // 自动画图模式需要存储每个数据源的 X 轴列和数据列
    useEffect(() => {
        if (config.automatic_mode)
            for (let id of widget.source_id) {
                const { cols, type_map } = get_data_source(id)
                // 第一个在选定类型中的列作为 X 轴列，其余作为数据列
                const x_col_types = config.x_col_types?.length ? config.x_col_types : TIME_TYPES 
                const x_col_name = cols.find(col => x_col_types.includes(type_map[col]))
                // 非 X 轴列且为数值的列作为数据列
                const series_col = cols.filter(item => item !== x_col_name && VALUE_TYPES.includes(type_map[item]))
                set_source_col_map(map => ({
                    ...map,
                    [id]: { x_col_name, series_col }
                }))
            }
    }, [type_map, config.automatic_mode, config.x_col_types, widget.source_id])
    
    
    const options = useMemo(() => { 
        const { automatic_mode, series: series_config = [ ], yAxis = [ ], ...others } = config
        let series = [ ]
        
        // 非自动画图模式
        if (!automatic_mode)
            return convert_chart_config(widget, data_source, axis_range_map)
        else {
            // 自动模式，查找匹配的数据列规则，设置数据列
            for (let [data_source_id, item] of Object.entries(source_col_map)) {
                const { series_col, x_col_name } = item
                // 遍历每个数据源的数据列，查找匹配规则
                for (let col of series_col) {
                    const match_rule = series_config.filter(Boolean).find(item => {
                        const { match_type, match_value } = item
                        switch (match_type) {
                            // 名称匹配
                            case MatchRuleType.NAME:
                                return match_value?.includes(col)
                            // 名称类型匹配
                            case MatchRuleType.DATA_TYPE:
                                return match_value?.includes(type_map[col])
                            // 名称正则匹配
                            case MatchRuleType.REGEXP:
                                try { return eval(match_value)?.test(col) }
                                catch (e) { return false }
                            // 数据源匹配
                            case MatchRuleType.DATA_SOURCE:
                                return data_source_id === match_value
                            default:
                                return false
                        }
                    })
                    // 选了不展示数据列则不添加，其他情况下都添加数据列
                    if (!(match_rule?.show === false)) 
                        series.push({
                            data_source_id,
                            x_col_name,
                            type: 'line',
                            yAxisIndex: 0,
                            ...(pickBy(match_rule)),
                            name: col,
                            col_name: col,
                        }) 
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
    }, [config, update, source_col_map, type_map, axis_range_map])
    
    
    
    useEffect(() => {
        // 未设置百分比阈值的时候不需要更新轴范围
        const has_percent_threshold = config?.thresholds?.find(item => item?.type === ThresholdType.PERCENTAGE)
        if (!echart_instance || !has_percent_threshold)
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
    }, [options, echart_instance, config.thresholds])
    
    
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


/** 订阅单数据源更新 */
export function SingleDataSourceUpdate (props: { source_id: string, force_update: () => void }) {
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { cols, data } = data_node.use(['cols', 'data'])
    
    useEffect(() => { force_update() }, [cols, data ])
    
    return null
}
