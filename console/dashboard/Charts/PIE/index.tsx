import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'

import { BasicFormFields, SeriesFormFields } from '../../ChartFormFields/PieChartFields.js'
import { type IChartConfig } from '../../type.js'

export function Pie ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, with_tooltip, with_legend, series } = widget.config as IChartConfig
    
    console.log(series)
    
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
                    trigger: 'axis',
                    backgroundColor: '#1D1D1D',
                    borderColor: '#333'
                },
                title: {
                    text: title,
                    textStyle: {
                        color: '#e6e6e6',
                    }
                },
            }
        },
        [title, with_tooltip, with_legend]
    )
    
    return <div>123</div>
    // return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate theme='ohlc_theme' />
}

export function PieConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        <SeriesFormFields col_names={col_names} />
    </>
}
