import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { Widget } from '../../model.js'
import { convert_chart_config } from '../../utils.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props
        
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge
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
    </>
}

