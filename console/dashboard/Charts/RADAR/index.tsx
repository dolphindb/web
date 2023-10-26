import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'

import { BasicFormFields, LabelsFormFields, SeriesFormFields } from '../../ChartFormFields/RadarChartFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.js'


export function Radar ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, title_size = 18, with_tooltip, with_legend, series, labels } = widget.config as IChartConfig
    console.log(widget.config)
    const option = useMemo(
        () => {
            const _labels = [ ]
            const datas = data_source.map(data => {
                const label = data[labels[0].col_name]
                _labels.push(label) 
                return {
                    value: series.map(serie => data[serie?.col_name]),
                    name: label
                }        
            })
            const res = {
                legend: {
                    show: with_legend,
                    data: _labels
                },
                tooltip: {
                    show: with_tooltip,
                    // 与图形类型相关，一期先写死
                    trigger: 'axis',
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
                    indicator: series.map(serie => ({ name: serie?.col_name, max: serie?.max })),
                },
                series: [
                    {
                        type: 'radar',
                        data: datas
                    }
                ]
            }
            console.log(res)
            return res
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
