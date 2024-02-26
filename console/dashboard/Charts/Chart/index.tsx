import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { dashboard, type Widget } from '../../model.js'
import { convert_chart_config } from '../../utils.js'
import { useEffect, useRef, useState } from 'react'
import { type EChartsInstance } from 'echarts-for-react'
import { useSize } from 'ahooks'


interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
    const [echart_instance, set_echart_instance] = useState<EChartsInstance>()
    
    const ref = useRef<ReactEChartsCore>()
    const size = useSize(ref.current?.ele)
    
    useEffect(() => { 
        // 初始化的时候，有概率会出现图表无法渲染，是因为父元素的宽高非直接写死，所以需要在宽高改变时调用 resize
        // https://github.com/hustcc/echarts-for-react/issues/193
        echart_instance?.resize?.()
    }, [size])
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label 失效
    return <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        notMerge={dashboard.editing}
        option={convert_chart_config(widget, data_source, echart_instance)}
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

