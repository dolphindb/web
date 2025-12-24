import type * as echarts from 'echarts'
import { useMemo } from 'react'

import { isNil, pickBy } from 'lodash'

import { SeriesFormFields } from '../../ChartFormFields/PieChartFields.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.ts'
import { ChartField } from '../../ChartFormFields/type.js'
import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.tsx'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'

const radius = {
    1: [[0, '70%']],
    2: [[0, '30%'], ['45%', '60%']],
    3: [[0, '20%'], ['30%', '45%'], ['55%', '65%']]
}

export function Pie ({ widget, data_source: { data } }: GraphComponentProps) {
    const { title, title_size = 18, legend, series, animation, tooltip } = widget.config as IChartConfig
    
    const options = useMemo<echarts.EChartsOption>(
        () => ({
                animation,
                legend: pickBy({
                    show: true,
                    textStyle: {
                        color: '#e6e6e6'
                    },
                    ...legend,
                    top: legend?.top ?? 0,
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
                    },
                    left: 0
                },
                series: series.map((serie, index) => ({
                        id: index,
                        type: 'pie',
                        radius: radius[series.length][index],
                        label: {
                            color: '#F5F5F5'
                        },
                        data: data.map(data => ({
                                value: data[serie?.col_name],
                                name: data[serie?.name]
                            })),
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }))
            }),
        [title, animation, series, title_size, data, legend, tooltip]
    )
    
    return <DashboardEchartsComponent options={options} lazy_update not_merge />
}

export function PieConfigForm ({ data_source: { cols } }: GraphConfigProps) {
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.LEGEND, ChartField.TOOLTIP]}/>
        <SeriesFormFields col_names={cols} />
    </>
}
