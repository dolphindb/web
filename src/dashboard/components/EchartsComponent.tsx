import './index.sass'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { useSize } from 'ahooks'


interface IProps {
    options: echarts.EChartsOption
    on_chart_ready?: (chart: echarts.ECharts) => void
    not_merge?: boolean
    lazy_update?: boolean
    replace_merge?: string | string[]
}
export function DashboardEchartsComponent (props: IProps) {
    
    const { options, on_chart_ready, not_merge, lazy_update, replace_merge } = props
    const div_ref = useRef<HTMLDivElement>(null)
    
    const wrapper_size = useSize(div_ref)
    
    const chartRef = useRef<echarts.ECharts>(null)
    
    useEffect(() => {
        chartRef?.current?.resize()
    }, [wrapper_size])
    
    
    useEffect(() => {
        
        if (!chartRef.current) {
            chartRef.current = echarts.init(div_ref.current)
            on_chart_ready?.(chartRef.current)
            chartRef.current.setOption(options)
        }
            
        else
            chartRef.current.setOption(
                options,  
                { 
                    replaceMerge: replace_merge, 
                    notMerge: not_merge,
                    lazyUpdate: lazy_update
                }
            )
        
    }, [ options ])
    
    return <div ref={div_ref} className='dashboard-echarts-component'/>
}
