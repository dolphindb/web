import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import { type Widget } from '../../model.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'
import { type IChartConfig } from '../../type.js'
import { convert_chart_config } from '../../utils.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'

interface IProps { 
    widget: Widget
    data_source: any[]
}

export function HeatMap (props: IProps) { 
    const { widget, data_source } = props
    
    const options = useMemo(() => {
        
        const { xAxis, yAxis, series } = widget.config as IChartConfig
        
        const { col_name, in_range } = series[0]
        
        const opt = convert_chart_config(widget, data_source)
        const min_value = Math.min(...data_source.map(item => item[col_name]))
        const max_value = Math.max(...data_source.map(item => item[col_name]))
        return {
            ...opt,
            grid: {
                height: '60%',
            },
            legend: {
                show: false
            },
            visualMap: {
                min: isNaN(min_value) ? 0 : min_value,
                max: isNaN(max_value) ? 0 : max_value,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                textStyle: {
                    color: '#6C6D77'
                },
                inRange: {
                    color: [in_range?.color?.low, in_range?.color?.high]
                }
            },
            series: opt.series.map((item, idx) => ({
                ...item,
                data: data_source.map(data => ([data[xAxis.col_name], data[yAxis[0].col_name], data[series[idx].col_name]])),
                emphasis: {
                    itemStyle: {
                      shadowBlur: 10,
                      shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }))
         }
    }, [widget.config, data_source])
    
    return <ReactEChartsCore
        echarts={echarts}
        notMerge
        option={options}
        className='dashboard-line-chart'
        theme='my-theme'
    />
}


export function HeatMapConfigForm ({ col_names }: { col_names: string[] }) {
    return <>
        <BasicFormFields type='chart' />
        <AxisFormFields col_names={col_names} single />
        <SeriesFormFields col_names={col_names} single/>
    </>
 }
