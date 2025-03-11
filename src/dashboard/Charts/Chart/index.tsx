import './index.scss'


import { useEffect, useMemo, useState } from 'react'
import type * as echarts from 'echarts'

import { convert_chart_config, get_axis_range } from '../../utils.ts'
import { type Widget } from '../../model.js'
import { AxisFormFields, SeriesFormFields, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import type { IChartConfig } from '../../type'
import { ThresholdType } from '../../ChartFormFields/type.js'
import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.tsx'


interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
    const [echart_instance, set_echart_instance] = useState<echarts.ECharts>()
    
    // 用来存储阈值对应的轴范围
    const [axis_range_map, set_axis_range_map] = useState<{ [key: string]: { min: number, max: number } }>()
    
    const options = useMemo(
        () => convert_chart_config(widget, data_source, axis_range_map)
        , [widget.config, data_source, axis_range_map])
    
    useEffect(() => {
        const { thresholds = [ ] } = widget.config as IChartConfig
        const has_percent_threshold = thresholds?.find(item => item?.type === ThresholdType.PERCENTAGE)
        // 无百分比阈值不需要更新
        if (!echart_instance || !has_percent_threshold)
            return
            // options 更新之后，重新计算 thresholds 对应的各轴的范围，判断是否需要更新
            for (let threshold of thresholds.filter(Boolean)) { 
                const { axis_type, axis } = threshold
                const [min, max] = get_axis_range(axis_type, echart_instance, axis)
                const key = (axis_type === 0 ? 'x' : 'y') + '_' + axis
                // 轴范围与之前的不一致才需要更新 axis_range_map, 一致则不需要更新
                if (axis_range_map?.[key]?.min !== min || axis_range_map?.[key]?.max !== max)  
                    set_axis_range_map(val => ({ ...val, [key]: { min, max } }))
            }
    }, [options, echart_instance])
    
    
    
    return <DashboardEchartsComponent 
        on_chart_ready={set_echart_instance} 
        options={options} 
        replace_merge={['series', 'dataZoom', 'yAxis']}
    />
} 


export function ChartConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <AxisFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names} />
        <ThresholdFormFields />
    </>
}

