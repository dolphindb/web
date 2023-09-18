import { WidgetOption } from '../storage/widget_node'
import { BasicFormFields } from '../ChartFormFields/BasicFormFields.js'
import { AxisFormFields } from '../ChartFormFields/BasicChartFields.js'
import ReactECharts from 'echarts-for-react'

import './index.scss'


interface IProps { 
    options: any
    widget: WidgetOption
}

const Chart = (props: IProps) => { 
    const { options } = props
    
    return <ReactECharts notMerge option={options} className='line-chart' theme='dark'/>
}

export default Chart


export const  ChartConfigForm = (props: { col_names: string[] }) => { 
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields />
        <AxisFormFields col_names={col_names} />
    </>
}

