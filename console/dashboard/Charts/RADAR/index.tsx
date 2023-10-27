import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'

import { BasicFormFields, LabelsFormFields, SeriesFormFields } from '../../ChartFormFields/RadarChartFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.js'


export function Radar ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, title_size = 18, with_tooltip, with_legend, series, labels } = widget.config as IChartConfig
    const option = useMemo(
        () => {
            const legends = [ ]
            const indicators = [ ]
            const datas = [ ]
            data_source.forEach((data, index) => {
                const label = data[labels[0].col_name]
                const values = [ ]
                legends.push(label || '') 
                series.forEach(serie => {
                    values.push(data[serie?.col_name])
                    if (index === 0)
                        indicators.push({ name: serie?.col_name, max: serie?.max })
                })  
                datas.push({ value: values, name: label })     
            })
            
            return {
                legend: {
                    show: with_legend,
                    textStyle: {
                        color: '#e6e6e6'
                    },
                    data: legends
                },
                tooltip: {
                    show: with_tooltip,
                    // 与图形类型相关，一期先写死
                    trigger: 'item',
                    backgroundColor: '#1D1D1D',
                    borderColor: '#333'
                },
                title: {
                    text: parse_text(title ?? ''),
                    textStyle: {
                        color: '#e6e6e6',
                        fontSize: title_size,
                    }
                },
                radar: {
                    indicator: indicators,
                },
                series: [
                    {
                        type: 'radar',
                        data: datas
                    }
                ]
            }
        },
        [title, with_tooltip, with_legend, series, title_size, labels, data_source]
    )
    
    return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate theme='ohlc_theme' />
}

export function RadarConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <LabelsFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names} />
    </>
}
