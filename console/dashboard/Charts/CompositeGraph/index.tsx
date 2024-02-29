import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { dashboard, type Widget } from '../../model.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { get_data_source } from '../../DataSource/date-source.js'
import { convert_chart_config, format_time, get_axis_range } from '../../utils.js'
import { type IChartConfig } from '../../type.js'
import { isNil, pickBy } from 'lodash'
import type { EChartsInstance } from 'echarts-for-react'

interface IProps {
    widget: Widget
}

function SingleDataSourceWatch (props: { source_id: string, force_update: () => void }) { 
    const { source_id, force_update } = props
    const data_node = get_data_source(source_id)
    const { data } = data_node.use(['data'])
    
    useEffect(() => { 
        force_update()
    }, [data])
    
    return null
}

export function CompositeGraph (props: IProps) { 
    const { widget } = props
    const [echart_instance, set_echart_instance] = useState<EChartsInstance>()
    
    const [update, set_update] = useState({ })
    
    // 用来存储阈值对应的轴范围
    const [axis_range_map, set_axis_range_map] = useState<{ [key: string]: { min: number, max: number } }>()
    
    const update_data_source = useCallback(() => {
        set_update({ })
     }, [ ])
    
    const data_source = useMemo(() => {
        return widget.source_id.reduce((prev, cur_id) => {
            prev[cur_id] = (get_data_source(cur_id)).data
            return prev
        }, { })
    }, [widget.source_id, update])
    
    
    const options = useMemo(() => { 
        const config = widget.config as IChartConfig
        const default_options = convert_chart_config(widget, Object.values(data_source)?.[0] as any[], axis_range_map)
        function get_cols (source_id, col_name) { 
            return data_source?.[source_id]?.map(item => item[col_name]) ?? [ ]
        }
        
        return {
            ...default_options,
            xAxis: pickBy({
                ...default_options.xAxis,
                data: null
            }, v => !isNil(v)),
            series: default_options.series.map((item, idx) => {
                const { data_source_id, x_col_name, col_name } = config.series[idx] ?? { }
                const x_data = get_cols(data_source_id, x_col_name).map(x => format_time(x, config.xAxis.time_format))
                const y_data = get_cols(data_source_id, col_name)
                return {
                    ...item,
                    data: x_data.map((x, idx) => ([x, y_data[idx]]))
                }
            })
            
        }
    }, [widget.config, data_source, axis_range_map])
    
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
        {widget.source_id.map(id => <SingleDataSourceWatch key={id} source_id={id} force_update={update_data_source} />)}
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



export function CompositeGraphConfig ({ col_names }: { col_names: string[] }) { 
    return <>
        <BasicFormFields type='chart'/>
        <AxisFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names} />
        <ThresholdFormFields />
    </>
}
