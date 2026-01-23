import './index.sass'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { useSize } from 'ahooks'

import chart_config from '@/dashboard/chart.config.json' with { type: 'json' }


interface IProps {
    options: echarts.EChartsOption
    on_chart_ready?: (chart: echarts.ECharts) => void
    not_merge?: boolean
    replace_merge?: string | string[]
}


export function DashboardEchartsComponent (props: IProps) {
    const { options, on_chart_ready, not_merge = true, replace_merge } = props
    const div_ref = useRef<HTMLDivElement>(null)
    
    const wrapper_size = useSize(div_ref)
    
    const chart_ref = useRef<echarts.ECharts>(null)
    
    /** echarts 父级元素高度不定会使得图表无法填满整个空间，需要监听父元素高度，resize 图表 */
    useEffect(() => {
        chart_ref.current?.resize()
    }, [wrapper_size])
    
    
    useEffect(() => {
        if (!chart_ref.current) {
            chart_ref.current = echarts.init(div_ref.current, chart_config.themeName)
            on_chart_ready?.(chart_ref.current)
            chart_ref.current.setOption(options)
        } else
            chart_ref.current.setOption(
                options,  
                { 
                    replaceMerge: replace_merge, 
                    notMerge: not_merge,
                }
            )
    }, [options])
    
    return <div ref={div_ref} className='dashboard-echarts-component'/>
}
