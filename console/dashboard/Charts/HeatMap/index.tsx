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
    cols: string[]
}

export function HeatMap (props: IProps) { 
    const { widget, data_source } = props
    
    const options = useMemo(() => {
        
        const { xAxis, yAxis, series } = widget.config as IChartConfig
        
        const { col_name, in_range, max = 0, min = 0, with_label } = series[0]
        console.log(min, max, 'max')
        const opt = convert_chart_config(widget, data_source)
        
        return {
            ...opt,
            grid: {
                ...opt.grid,
                bottom: '20%'
            },
            legend: {
                show: false
            },
            visualMap: {
                min,
                max,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                textStyle: {
                    color: '#6C6D77'
                },
                inRange: {
                    color: [in_range?.color?.low || '#EBE1E1', in_range?.color?.high || '#983430'] 
                }
            },
            series: opt.series.map((item, idx) => ({
                ...item,
                data: data_source.map(data => {
                    // @ts-ignore
                    const x = opt.xAxis?.data?.indexOf(data[xAxis?.col_name])
                    const y = opt.yAxis[0]?.data?.indexOf(data[yAxis[0]?.col_name])
                    return [x, y, data[col_name].replaceAll(',', '')]
                }),
                label: {
                    show: with_label
                },
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
