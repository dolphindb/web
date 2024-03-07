import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { dashboard, type Widget } from '../../model.js'

import { LabelsFormFields, SeriesFormFields } from '../../ChartFormFields/RadarChartFields.js'
import { type IChartConfig } from '../../type.js'
import { parse_text } from '../../utils.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { ChartField } from '../../ChartFormFields/type.js'
import { isNil, pickBy } from 'lodash'


export function Radar ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, title_size = 18, tooltip, legend, series, labels } = widget.config as IChartConfig
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
        [title, tooltip, series, title_size, labels, data_source, legend]
    )
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return <ReactEChartsCore
        notMerge={dashboard.editing}
        echarts={echarts}
        option={option}
        lazyUpdate
        theme='ohlc_theme' 
        />
}

export function RadarConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' chart_fields={[ChartField.LEGEND, ChartField.TOOLTIP]}/>
        <LabelsFormFields col_names={col_names} />
        <SeriesFormFields col_names={col_names} />
    </>
}
