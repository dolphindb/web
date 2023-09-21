import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'
import { type Widget } from '../../model.js'
import {  IChartConfig } from '../../type.js'
import { BasicFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { OhlcFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { get_data_source_node } from '../../storage/date-source-node.js'

import './index.sass'

const upColor = '#00da3c'
const downColor = '#ec0000'



type COL_MAP = {
  time: string
  open: string
  high: string
  low: string
  close: string
  trades: string
}

function splitData (rowData: any[], col_name: COL_MAP) {
    const { time, open, high, low, close, trades } = col_name
    let categoryData = [ ]
    let values = [ ]
    let volumes = [ ]
    for (let i = 0;  i < rowData.length;  i++) {
        categoryData.push(rowData[i][time])
        values.push([rowData[i][open], rowData[i][high], rowData[i][low], rowData[i][close]])
        volumes.push([i, rowData[i][trades], rowData[i][open] > rowData[i][high] ? 1 : -1])
    }
    return {
        categoryData: categoryData,
        values: values,
        volumes: volumes
    }
}

export default function OHLC ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const { title, with_tooltip, xAxis, series, yAxis, x_datazoom, y_datazoom } = widget.config as IChartConfig
    console.log('data_source', data_source)
    const data = useMemo(() => splitData(data_source, { time: xAxis.col_name, 
                                                        open: series[0].open as string, 
                                                        high: series[0].high as string,
                                                        low: series[0].low as string,
                                                        close: series[0].close as string,
                                                        trades: series[1].col_name as string }), [data_source, xAxis.col_name, series ])
    const option = useMemo(() => ({
        animation: false,
        title: {
            text: title,
            textStyle: {
                color: '#e6e6e6e'
            }
        },    
        tooltip: {
          show: with_tooltip,
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
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
              color: downColor
            },
            {
              value: -1,
              color: upColor
            }
          ]
        },
        grid: [
          {
            left: '10%',
            right: '10%',
            height: '50%'
          },
          {
            left: '10%',
            right: '10%',
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
            min: 'dataMin',
            max: 'dataMax',
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
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          {
            scale: true,
            splitArea: {
              show: true
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
            name: 'OHLC',
            type: 'candlestick',
            data: data.values,
            itemStyle: {
              color: undefined,
              color0: undefined,
              borderColor: upColor,
              borderColor0: downColor
            }
          },
          {
            name: 'trades',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: data.volumes,
            itemStyle: {
                color: ({ value }) => value[2] === -1 ? upColor : downColor
            }
          }
        ]
    }), [title, with_tooltip, data, xAxis, yAxis, x_datazoom, y_datazoom ])
    
    return <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
        theme='my-theme'
    />
}


export const OhlcConfigForm = (props: { col_names: string[] }) => { 
  const { col_names = [ ] } = props
  return <>
      <BasicFormFields type='chart' />
      <OhlcFormFields col_names={col_names} />
  </>
}

