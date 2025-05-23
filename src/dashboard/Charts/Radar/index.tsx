import type * as echarts from 'echarts'
import { useMemo } from 'react'

import { isNil, pickBy } from 'lodash'

import { LabelsFormFields, SeriesFormFields } from '../../ChartFormFields/RadarChartFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.ts'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { ChartField } from '../../ChartFormFields/type.js'
import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.tsx'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'


export function Radar ({ widget, data_source: { data } }: GraphComponentProps) {
    const { title, title_size = 18, tooltip, legend, series, labels } = widget.config as IChartConfig
    const option = useMemo<echarts.EChartsOption>(
        () => {
            const legends = [ ]
            const indicators = [ ]
            const datas = [ ]
            data.forEach((data, index) => {
                const label = data[labels[0].col_name]
                const values = [ ]
                legends.push(label || '') 
                series.forEach(serie => {
                    values.push(data[serie?.col_name])
                    if (index === 0)
                        indicators.push({ name: serie?.col_name, max: serie?.max })
                })  
                datas.push({ id: index, value: values, name: label })     
            })
            
            return {
                legend: pickBy({
                    show: true,
                    textStyle: {
                        color: '#e6e6e6'
                    },
                    data: legends,
                    ...legend,
                }, v => !isNil(v) && v !== ''),
                tooltip: {
                    show: true,
                    ...tooltip,
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
        [title, tooltip, series, title_size, labels, data, legend]
    )
    
    return <DashboardEchartsComponent options={option} lazy_update />
}


export function RadarConfigForm ({ data_source: { cols } }: GraphConfigProps) {
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.LEGEND, ChartField.TOOLTIP]}/>
        <LabelsFormFields col_names={cols} />
        <SeriesFormFields col_names={cols} />
    </>
}
