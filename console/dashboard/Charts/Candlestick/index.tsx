import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { type Widget } from '../../model.js'
import { type IChartConfig } from '../../type.js'
import { BasicFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { OhlcFormFields } from '../../ChartFormFields/OhlcChartFields.js'

import './index.sass'
import { CandleFormFields } from '../../ChartFormFields/CandleChartFields.js'

const kColor = '#fd1050'
const kColor0 = '#0cf49b'
const kBorderColor = '#fd1050'
const kBorderColor0 = '#0cf49b'

type COL_MAP = {
    time: string
    open: string
    high: string
    low: string
    close: string
    value: string
}

function splitData (rowData: any[], col_name: COL_MAP) {
    const { time, open, high, low, close, value } = col_name
    let categoryData = [ ]
    let values = [ ]
    let volumes = [ ]
    for (let i = 0;  i < rowData.length;  i++) {
        categoryData.push(rowData[i][time])
        values.push([rowData[i][open], rowData[i][high], rowData[i][low], rowData[i][close]])
        volumes.push([i, rowData[i][value], rowData[i][open] > rowData[i][high] ? 1 : -1])
    }
    return {
        categoryData: categoryData,
        values: values,
        volumes: volumes
    }
}

export function Candlestick ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, with_tooltip, xAxis, series, yAxis, x_datazoom, y_datazoom } = widget.config as IChartConfig
    const data = useMemo(
        () =>
            splitData(data_source, {
                time: xAxis.col_name,
                open: series[0].open as string,
                high: series[0].high as string,
                low: series[0].low as string,
                close: series[0].close as string,
                value: series[0].value as string
            }),
        [data_source, xAxis.col_name, series]
    )
    
    const option = useMemo(
        () => ({
            animation: false,
            title: {
                text: title,
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
                backgroundColor: '#eeeeee',
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 10,
                textStyle: {
                    color: '#000'
                },
                position: function (pos, params, el, elRect, size) {
                    const obj = {
                        top: 10
                    }
                    obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30
                    return obj
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
                    left: '10%',
                    right: '10%',
                    height: '60%'
                },
            ],
            xAxis: [
                {
                    type: 'category',
                    name: xAxis.name,
                    data: data.categoryData,
                    // data: data.categoryData,
                    
                    boundaryGap: false,
                    axisLine: { onZero: false },
                    splitLine: { show: false },
                    min: 'dataMin',
                    max: 'dataMax',
                    axisPointer: {
                        z: 100
                    }
                },
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
                // {
                //     scale: true,
                //     splitNumber: 2,
                //     nameTextStyle: {
                //         padding: [0, 0, 0, 50]
                //     },
                //     name: yAxis[1].name,
                //     position: yAxis[1].position,
                //     offset: yAxis[1].offset,
                //     axisLabel: { show: false },
                //     axisLine: { show: false },
                //     axisTick: { show: false },
                //     splitLine: { show: false }
                // }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    start: 20,
                    end: 100
                },
                {
                    show: x_datazoom,
                    xAxisIndex: [0],
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
                    yAxisIndex: [0],
                    start: 0,
                    end: 100
                }
            ],
            series: [
                {
                    name: 'candlestick',
                    type: 'candlestick',
                    data: data.values,
                    itemStyle: {
                        color: kColor,
                        color0: kColor0,
                        // borderColor: kBorderColor,
                        // borderColor0: kBorderColor0
                    },
                },
                {
                    name: 'trades',
                    type: 'line',
                    data: data.volumes,
                    markLine: {
                        symbol: ['circle', 'none'],
                        silent: true,
                        itemStyle: {
                            normal: {
                                show: true,
                                color: '#f21212'
                            }
                        },
                        label: {
                            normal: {
                                position: 'middle'
                            }
                        },
                        data: [{
                            yAxis: series[0].limit || 0
                        }]
                    }
                    // itemStyle: {
                    //     color: ({ value }) => (value[2] === -1 ? kColor : kColor0)
                    // }
                }
            ]
        }),
        [title, with_tooltip, data, xAxis, yAxis, x_datazoom, y_datazoom]
    )
    
    return <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate theme='ohlc_theme' />
}


export function CandleConfigForm (props: { col_names: string[] }) {
    const { col_names = [ ] } = props
    return <>
            <BasicFormFields type='chart' />
            <CandleFormFields col_names={col_names} />
        </>
}
