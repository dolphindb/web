import * as echarts from 'echarts'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import { useMemo } from 'react'

import { OhlcFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { dashboard, type Widget } from '../../model.js'
import { type IChartConfig, type ISeriesConfig } from '../../type.js'

import { MarkPresetType } from '../../ChartFormFields/type.js'
import { format_time, parse_text } from '../../utils.js'
import './index.sass'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { isNil, pickBy } from 'lodash'

type COL_MAP = {
    time: string
    open: string
    high: string
    low: string
    close: string
    trades: string
    time_format?: string
}

function splitData (rowData: any[], col_name: COL_MAP) {
    const { time, open, close, low,  high, trades, time_format } = col_name
    let categoryData = [ ]
    let values = [ ]
    let volumes = [ ]
    let lines = [ ]
    for (let i = 0;  i < rowData.length;  i++) {
        categoryData.push(rowData[i][time])
        values.push([rowData[i][open], rowData[i][close], rowData[i][low], rowData[i][high]])
        volumes.push([i, Math.abs(rowData[i][trades]), Number(rowData[i][trades]) > 0 ? 1 : -1])
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
    const { title, title_size, xAxis, series, yAxis, x_datazoom, y_datazoom, legend, splitLine, animation, tooltip } = widget.config as IChartConfig
    function convert_series (series: ISeriesConfig) { 
        let mark_line_data = series?.mark_line?.map(item => { 
            if (item in MarkPresetType)
                return {
                    type: item,
                    name: item
                }
            else
                return { yAxis: item }
        }) || [ ]
        
        let data = data_source.map(item => item?.[series?.col_name])
        
        return {
            type: series?.type?.toLowerCase(),
            name: series?.name,
            symbol: 'none',
            stack: series?.stack,
            // 防止删除yAxis导致渲染失败
            yAxisIndex: yAxis[series?.yAxisIndex] ?  series?.yAxisIndex : 0,
            data,
            markPoint: {
                data: series?.mark_point?.map(item => ({
                    type: item,
                    name: item
                }))
            }, 
            itemStyle: {
                color: series?.color,
            },
            markLine: {
                symbol: ['none', 'none'],
                data: mark_line_data
            },
            lineStyle: {
                type: series?.line_type,
                color: series?.color
            }
        }
    }
    
    const lines = series.slice(2).map(serie => convert_series(serie))
    
    const data = useMemo(
        () => splitData(data_source, {
                time: xAxis.col_name,
                open: series[0].open as string,
                close: series[0].close as string,
                low: series[0].lowest as string,
                high: series[0].highest as string,
                trades: series[1].col_name as string,
                time_format: xAxis.time_format || ''
            }),
        [data_source, xAxis.col_name, series, xAxis.time_format]
    )
    const [kColor = '#ec0000', kColor0 = '#00da3c'] = useMemo(() => 
            [ series[0].kcolor, series[0].kcolor0], 
    [series[0]])
    const option = useMemo(
        () => ({
            animation,
            title: {
                text: parse_text(title),
                textStyle: {
                    color: '#e6e6e6',
                    fontSize: title_size || 18,
                }
            },
            data,
            splitLine: {
                show: true,
                ...splitLine
            },
            legend: pickBy({
                show: true,
                top: 10,
                left: 'center',
                data: series.slice(2).map(s => s?.name || ''),
                textStyle: {
                    color: '#e6e6e6'
                },
                ...legend,
              }, v => !isNil(v) && v !== ''),
            backgroundColor: '#282828',
            tooltip: {
                show: true,
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
            // visualMap: {
            //     show: false,
            //     seriesIndex: 5,
            //     dimension: 2,
            //     pieces: [
            //         {
            //             value: 1,
            //             color: kColor
            //         },
            //         {
            //             value: -1,
            //             color: kColor0
            //         }
            //     ]
            // },
            grid: [
                {   
                    // containLabel: true,
                    left: 70,
                    right: 50,
                    height: '50%'
                },
                {
                    // containLabel: true,
                    left: 70,
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
                    
                    boundaryGap: false,
                    axisLine: { onZero: false },
                    splitLine: { show: true, ...splitLine },
                    nameTextStyle: {
                        fontSize: xAxis?.fontsize ?? 12
                    },
                    axisPointer: {
                        z: 100
                    },
                    min: () => { 
                        const idx = data.categoryData.findIndex(time => time >= xAxis.min)
                        return idx === -1 ? 0 : idx
                    }
                    ,
                    max: () => {
                        const idx = data.categoryData.findIndex(time => time >= xAxis.max)
                        return idx === -1 ? data.categoryData.length - 1 : idx
                    }
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    name: xAxis.name,
                    data: data.categoryData,
                    nameTextStyle: {
                        fontSize: xAxis?.fontsize ?? 12
                    },
                    // data: data.categoryData,
                    boundaryGap: false,
                    // axisLine: { onZero: false },
                    // axisTick: { show: false },
                    // splitLine: { show: false },
                    // axisLabel: { show: false },
                    min: () => { 
                        const idx = data.categoryData.findIndex(time => time >= xAxis.min)
                        return idx === -1 ? 0 : idx
                    }
                    ,
                    max:  () => {
                        const idx = data.categoryData.findIndex(time => time >= xAxis.max) 
                        return idx === -1 ? data.categoryData.length - 1 : idx
                    }
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
                        },
                        ...splitLine
                    },
                    nameTextStyle: {
                        padding: [0, 50, 0, 0],
                        fontSize: yAxis[0]?.fontsize ?? 12,
                    },
                    min: yAxis[0].min,
                    max: yAxis[0].max,
                    name: yAxis[0].name,
                    position: yAxis[0].position,
                    offset: yAxis[0].offset
                },
                {
                    scale: true,
                    gridIndex: 1,
                    splitNumber: 2,
                    min: yAxis[1].min,
                    max: yAxis[1].max,
                    nameTextStyle: {
                        padding: [0, 0, 0, 50],
                        fontSize: yAxis[1]?.fontsize ?? 12,
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
                    
                },
                {
                    show: x_datazoom,
                    xAxisIndex: [0, 1],
                    type: 'slider',
                    top: '86%',
                    height: 20
                },
                {
                    show: y_datazoom,
                    id: 'dataZoomY',
                    type: 'slider',
                    yAxisIndex: [0, 1],
                    // start: 0,
                    // end: 100
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
                    name: 'trades',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: data.volumes,
                    itemStyle: {
                        color: ({ value }) => (value[2] === 1 ? kColor : kColor0)
                    }
                },
                ...lines
            ]
        }),
        [title, animation, data, xAxis, yAxis, x_datazoom, y_datazoom, legend, splitLine, tooltip]
    )
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return <ReactEChartsCore echarts={echarts} option={option} theme='ohlc_theme' />
}


export function OhlcConfigForm (props: { col_names: string[] }) {
    const { col_names = [ ] } = props
    return <>
        <BasicFormFields type='chart'/>
        <OhlcFormFields col_names={col_names} />
    </>
}
