import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'
import { type IChartConfig } from '../../type.js'
import { BasicFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { OhlcFormFields } from '../../ChartFormFields/OhlcChartFields.js'

import './index.sass'
import { format_time, parse_text } from '../../utils.js'


// const kBorderColor = '#fd1050'
// const kBorderColor0 = '#0cf49b'

type COL_MAP = {
    time: string
    open: string
    high: string
    low: string
    close: string
    value: string
    trades: string
    time_format?: string
}

function splitData (rowData: any[], col_name: COL_MAP) {
    const { time, open, close, low,  high,  value, trades, time_format } = col_name
    let categoryData = [ ]
    let values = [ ]
    let volumes = [ ]
    let lines = [ ]
    for (let i = 0;  i < rowData.length;  i++) {
        categoryData.push(rowData[i][time])
        values.push([rowData[i][open], rowData[i][close], rowData[i][low], rowData[i][high]])
        volumes.push([i, rowData[i][trades], rowData[i][open] > rowData[i][high] ? 1 : -1])
        lines.push(rowData[i][value])
    }
    if (time_format)
        categoryData = categoryData.map(item => format_time(item, time_format))
    
    return {
        categoryData,
        values,
        volumes,
        lines
    }
}

export function OHLC ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, title_size, with_tooltip, xAxis, series, yAxis, x_datazoom, y_datazoom } = widget.config as IChartConfig
   
    const data = useMemo(
        () =>
            splitData(data_source, {
                time: xAxis.col_name,
                open: series[0].open as string,
                close: series[0].close as string,
                low: series[0].low as string,
                high: series[0].high as string,
                value: series[0].value as string,
                trades: series[1].col_name as string,
                time_format: xAxis.time_format || ''
            }),
        [data_source, xAxis.col_name, series]
    )
    const [kColor = '#fd1050', kColor0 = '#0cf49b', line_name = '折线', limit_name = '阈值'] = useMemo(() => 
            [ series[0].kcolor, series[0].kcolor0, series[0].line_name, series[0].limit_name], 
    [series[0]])
    const option = useMemo(
        () => ({
            animation: false,
            title: {
                text: parse_text(title),
                textStyle: {
                    color: '#e6e6e6',
                    fontSize: title_size || 18,
                }
            },
            legend: {
                top: 10,
                left: 'center',
                data: [line_name, limit_name],
                textStyle: {
                    color: '#e6e6e6'
                }
              },
            backgroundColor: '#282828',
            tooltip: {
                show: with_tooltip,
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                backgroundColor: '#060606',
                borderColor: '#060606',
                textStyle: {
                    color: '#F5F5F5'
                },
                borderWidth: 1,
                padding: 10,
                // textStyle: {
                //     color: '#e6e6e6'
                // },
                // alwaysShowContent: true,
                position: function (pos, params, el, elRect, size) {
                    
                    if (pos[0] < size.viewSize[0] / 2)
                        return {   
                            top: 10,
                            left: pos[0] + 10
                        }
                    else
                        return {   
                            top: 10,
                            right: size.viewSize[0] - pos[0] - 10
                        } 
                }
            },
            axisPointer: {
                link: [
                    {
                        xAxisIndex: 'all'
                    }
                ],
                label: {
                    backgroundColor: '#777'
                }
            },
            // toolbox: {
            //   feature: {
            //     dataZoom: {
            //       yAxisIndex: false
            //     },
            //     brush: {
            //       type: ['lineX', 'clear']
            //     }
            //   }
            // },
            // brush: {
            //   xAxisIndex: 'all',
            //   brushLink: 'all',
            //   outOfBrush: {
            //     colorAlpha: 0.1
            //   }
            // },
            visualMap: {
                show: false,
                seriesIndex: 5,
                dimension: 2,
                pieces: [
                    {
                        value: 1,
                        color: kColor
                    },
                    {
                        value: -1,
                        color: kColor0
                    }
                ]
            },
            grid: [
                {
                    left: 50,
                    right: 50,
                    height: '50%'
                },
                {
                    left: 50,
                    right: 50,
                    bottom: '22%',
                    height: '15%'
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    show: false,
                    name: xAxis.name,
                    data: data.categoryData,
                    // data: data.categoryData,
                    
                    boundaryGap: false,
                    axisLine: { onZero: false },
                    splitLine: { show: false },
                 
                    axisPointer: {
                        z: 100
                    }
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    name: xAxis.name,
                    data: data.categoryData,
                    // data: data.categoryData,
                    boundaryGap: false,
                    // axisLine: { onZero: false },
                    // axisTick: { show: false },
                    // splitLine: { show: false },
                    // axisLabel: { show: false },
                   
                }
            ],
            yAxis: [
                {
                    scale: true,
                    splitArea: {
                        show: true
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            type: 'dashed',
                            color: '#6E6F7A'
                        }
                    },
                    nameTextStyle: {
                        padding: [0, 50, 0, 0]
                    },
                    name: yAxis[0].name,
                    position: yAxis[0].position,
                    offset: yAxis[0].offset
                },
                {
                    scale: true,
                    gridIndex: 1,
                    splitNumber: 2,
                    nameTextStyle: {
                        padding: [0, 0, 0, 50]
                    },
                    name: yAxis[1].name,
                    position: yAxis[1].position,
                    offset: yAxis[1].offset,
                    axisLabel: { show: false },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false }
                }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1],
                    start: 20,
                    end: 100
                },
                {
                    show: x_datazoom,
                    xAxisIndex: [0, 1],
                    type: 'slider',
                    top: '86%',
                    start: 20,
                    end: 100,
                    height: 20
                },
                {
                    show: y_datazoom,
                    id: 'dataZoomY',
                    type: 'slider',
                    yAxisIndex: [0, 1],
                    start: 0,
                    end: 100
                }
            ],
            series: [
                {
                    type: 'candlestick',
                    data: data.values,
                    itemStyle: {
                        color: kColor,
                        color0: kColor0,
                        borderColor: undefined,
                        borderColor0: undefined
                    }
                },
                {
                    type: 'line',
                    name: line_name,
                    
                    data: data.lines,
                    symbol: 'none',
                    itemStyle: {
                        color: series[0].line_color || '#54d2d2',
                    },
                },
                {
                    type: 'line',
                    name: limit_name,
                    symbol: 'none',
                    data: new Array(data.categoryData.length).fill(series[0].limit),
                    itemStyle: {
                        color: series[0].limit_color || '#1f7ed2',
                    }
                },
                
                {
                    name: 'trades',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: data.volumes,
                    itemStyle: {
                        color: ({ value }) => (value[2] === -1 ? kColor : kColor0)
                    }
                }
            ]
        }),
        [title, with_tooltip, data, xAxis, yAxis, x_datazoom, y_datazoom]
    )
    
    return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate theme='ohlc_theme' />
}


export function OhlcConfigForm (props: { col_names: string[] }) {
    const { col_names = [ ] } = props
    return <>
        <BasicFormFields/>
        <OhlcFormFields col_names={col_names} />
    </>
}
