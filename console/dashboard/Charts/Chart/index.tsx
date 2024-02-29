import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { dashboard, type Widget } from '../../model.js'
import { convert_chart_config, get_axis_range } from '../../utils.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type EChartsInstance } from 'echarts-for-react'
import { useSize } from 'ahooks'
import type { IChartConfig } from '../../type'


interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
    const [echart_instance, set_echart_instance] = useState<EChartsInstance>()
    
    const ref = useRef<ReactEChartsCore>()
    const size = useSize(ref.current?.ele)
    
    // 用来存储阈值对应的轴范围
    const [axis_range_map, set_axis_range_map] = useState<{ [key: string]: { min: number, max: number } }>()
    
    useEffect(() => {
        // 初始化的时候，有概率会出现图表 canvas 高度为 0 无法展示的情况，是因为父元素的宽高非直接写死，所以需要在宽高改变时调用 resize
        // https://github.com/hustcc/echarts-for-react/issues/193
        echart_instance?.resize?.()
    }, [size])
    
    const options = useMemo(
        () => convert_chart_config(widget, data_source, axis_range_map)
        , [widget.config, data_source, axis_range_map])
    
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
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label 失效
    return <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        notMerge={dashboard.editing}
        option={options}
        className='dashboard-line-chart'
        theme='my-theme'
        onChartReady={(ins: EChartsInstance) => { 
            set_echart_instance(ins)
        }}
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

