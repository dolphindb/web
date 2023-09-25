import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'

import { BasicFormFields, SeriesFormFields } from '../../ChartFormFields/PieChartFields.js'
import { type IChartConfig } from '../../type.js'

const radius = {
    1: [[0, '70%']],
    2: [[0, '30%'], ['45%', '60%']],
    3: [[0, '20%'], ['30%', '45%'], ['55%', '65%']]
}

export function Pie ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, with_tooltip, with_legend, series } = widget.config as IChartConfig
    
    const option = useMemo(
        () => {
            return {
                legend: {
                    show: with_legend,
                    textStyle: {
                        color: '#e6e6e6'
                    }
                },
                tooltip: {
                    show: with_tooltip,
                    // 与图形类型相关，一期先写死
                    trigger: 'item',
                    backgroundColor: '#1D1D1D',
                    borderColor: '#333'
                },
                title: {
                    text: title,
                    textStyle: {
                        color: '#e6e6e6',
                    }
                },
                series: series.map((serie, index) => {
                    return {
                        type: 'pie',
                        radius: radius[series.length][index],
                        data: data_source.map(data => {
                            return {
                                value: data[serie?.value],
                                name: data[serie?.name]
                            }
                        }),
                        emphasis: {
                            itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                })
            }
        },
        [title, with_tooltip, with_legend, series]
    )
    
    return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate theme='ohlc_theme' />
}

export function PieConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <SeriesFormFields col_names={col_names} />
    </>
}
