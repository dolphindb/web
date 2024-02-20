import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields, ThresholdFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { dashboard, type Widget } from '../../model.js'
import { convert_chart_config } from '../../utils.js'




interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return <ReactEChartsCore
            echarts={echarts}
            notMerge={dashboard.editing}
            option={convert_chart_config(widget, data_source)}
            className='dashboard-line-chart'
            theme='my-theme'
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

