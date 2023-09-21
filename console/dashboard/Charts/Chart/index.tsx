import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { Widget } from '../../model.js'
import { convert_chart_config } from '../../utils.js'
import { useMemo } from 'react'

import './index.scss'


interface IProps { 
    widget: Widget
    data_source: any[]
}



const Chart = (props: IProps) => { 
    const { widget, data_source } = props
    
    const options = useMemo(() =>
        convert_chart_config(widget, data_source),
    [widget.config, data_source])
    
    return <ReactEChartsCore echarts={echarts} notMerge option={options} className='line-chart' theme='my-theme' />
}

export default Chart


export const  ChartConfigForm = (props: { col_names: string[] }) => { 
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <AxisFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names}/>
    </>
}

