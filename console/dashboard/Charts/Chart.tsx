import { BasicFormFields } from '../ChartFormFields/BasicFormFields.js'
import { AxisFormFields } from '../ChartFormFields/BasicChartFields.js'
import ReactECharts from 'echarts-for-react'

import './index.scss'
import { Widget } from '../model.js'


interface IProps { 
    options: any
    widget: Widget
}

const Chart = (props: IProps) => { 
    const { options } = props
    
    console.log(options, 'options')
    
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

