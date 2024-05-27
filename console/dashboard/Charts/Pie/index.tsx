import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useEffect, useMemo, useRef } from 'react'

import { isNil, pickBy } from 'lodash'

import { type Widget } from '../../model.js'

import { SeriesFormFields } from '../../ChartFormFields/PieChartFields.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.js'
import { ChartField } from '../../ChartFormFields/type.js'

const radius = {
    1: [[0, '70%']],
    2: [[0, '30%'], ['45%', '60%']],
    3: [[0, '20%'], ['30%', '45%'], ['55%', '65%']]
}

export function Pie ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, title_size = 18, legend, series, animation, tooltip } = widget.config as IChartConfig
    
    const chart_ref = useRef(null)
    
    const option = useMemo(
        () => {
            return {
                animation,
                legend: pickBy({
                    show: true,
                    textStyle: {
                        color: '#e6e6e6'
                    },
                    ...legend,
                }, v => !isNil(v) && v !== ''),
                tooltip: {
                    show: tooltip?.show ?? true,
                    // 与图形类型相关，一期先写死
                    trigger: 'item',
                    backgroundColor: '#1D1D1D',
                    borderColor: '#333',
                    textStyle: {
                        color: '#F5F5F5'
                    },
                },
                title: {
                    text: parse_text(title ?? ''),
                    textStyle: {
                        color: '#e6e6e6',
                        fontSize: title_size,
                    }
                },
                series: series.map((serie, index) => {
                    return {
                        id: index,
                        type: 'pie',
                        radius: radius[series.length][index],
                        label: {
                            color: '#F5F5F5'
                        },
                        data: data_source.map(data => {
                            return {
                                value: data[serie?.col_name],
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
        [title, animation, series, title_size, data_source, legend, tooltip]
    )
   
    // 设置 notMerge 为 true 会导致报错，详见 WEB-887
    // 设置 notMerge 为 false 会导致删减数据环失败，因为此时 echarts 使用普通合并。需设置 replaceMerge 让 echarts 使用 替换合并。
    // echarts-for-react 不支持直接设置 replaceMerge，需手动设置。
    useEffect(() => {
        chart_ref.current?.getEchartsInstance()?.setOption(option, {
            replaceMerge: ['series'],
        })
    }, [chart_ref, option])
    
    return <ReactEChartsCore ref={chart_ref} echarts={echarts} option={option} lazyUpdate theme='ohlc_theme'/>
}

export function PieConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.LEGEND, ChartField.TOOLTIP]}/>
        <SeriesFormFields col_names={col_names} />
    </>
}
