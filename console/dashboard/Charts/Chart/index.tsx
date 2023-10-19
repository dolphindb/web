import './index.scss'

import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { convert_chart_config, parse_text } from '../../utils.js'
import { useMemo } from 'react'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function Chart (props: IProps) {
    const { widget, data_source } = props 
    
    const options = useMemo(() => { 
        const opt = convert_chart_config(widget, data_source)
        console.log(opt.title.text, parse_text(opt.title.text ?? ''), 'title')
        return {
            ...opt,
            title: {
                ...opt.title,
                text: parse_text(opt.title.text ?? '')
            }
        }
    }, [ widget.config, data_source ])
    
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge
                option={options}
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

