import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { useMemo } from 'react'
import { type Widget } from '../../model.js'
import {  IChartConfig } from '../../type.js'
import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { OhlcFormFields } from '../../ChartFormFields/OhlcChartFields.js'
import { get_data_source_node } from '../../storage/date-source-node.js'

import './index.sass'

const upColor = '#00da3c'
const downColor = '#ec0000'

const row_data = [[
    '2004-01-02',
    10452.74,
    10409.85,
    10367.41,
    10554.96,
    168890000
    ],
    [
    '2004-01-05',
    10411.85,
    10544.07,
    10411.85,
    10575.92,
    221290000
    ],
    [
    '2004-01-06',
    10543.85,
    10538.66,
    10454.37,
    10584.07,
    191460000
    ],
    [
    '2004-01-07',
    10535.46,
    10529.03,
    10432,
    10587.55,
    225490000
    ],
    [
    '2004-01-08',
    10530.07,
    10592.44,
    10480.59,
    10651.99,
    237770000
    ],
    [
    '2004-01-09',
    10589.25,
    10458.89,
    10420.52,
    10603.48,
    223250000
    ],
    [
    '2004-01-12',
    10461.55,
    10485.18,
    10389.85,
    10543.03,
    197960000
    ],
    [
    '2004-01-13',
    10485.18,
    10427.18,
    10341.19,
    10539.25,
    197310000
    ],
    [
    '2004-01-14',
    10428.67,
    10538.37,
    10426.89,
    10573.85,
    186280000
    ],
    [
    '2004-01-15',
    10534.52,
    10553.85,
    10454.52,
    10639.03,
    260090000
    ],
    [
    '2004-01-16',
    10556.37,
    10600.51,
    10503.7,
    10666.88,
    254170000
    ],
    [
    '2004-01-20',
    10601.4,
    10528.66,
    10447.92,
    10676.96,
    224300000
    ],
    [
    '2004-01-21',
    10522.77,
    10623.62,
    10453.11,
    10665.7,
    214920000
    ],
    [
    '2004-01-22',
    10624.22,
    10623.18,
    10545.03,
    10717.4,
    219720000
    ],
    [
    '2004-01-23',
    10625.25,
    10568.29,
    10490.14,
    10691.77,
    234260000
    ],
    [
    '2004-01-26',
    10568,
    10702.51,
    10510.44,
    10725.18,
    186170000
    ],
    [
    '2004-01-27',
    10701.1,
    10609.92,
    10579.33,
    10748.81,
    206560000
    ],
    [
    '2004-01-28',
    10610.07,
    10468.37,
    10412.44,
    10703.25,
    247660000
    ],
    [
    '2004-01-29',
    10467.41,
    10510.29,
    10369.92,
    10611.56,
    273970000
    ],
    [
    '2004-01-30',
    10510.22,
    10488.07,
    10385.56,
    10551.03,
    208990000
    ],
    [
    '2004-02-02',
    10487.78,
    10499.18,
    10395.55,
    10614.44,
    224800000
    ],
    [
    '2004-02-03',
    10499.48,
    10505.18,
    10414.15,
    10571.48,
    183810000
    ],
    [
    '2004-02-04',
    10503.11,
    10470.74,
    10394.81,
    10567.85,
    227760000
    ],
    [
    '2004-02-05',
    10469.33,
    10495.55,
    10399.92,
    10566.37,
    187810000
    ],
    [
    '2004-02-06',
    10494.89,
    10593.03,
    10433.7,
    10634.81,
    182880000
    ],
    [
    '2004-02-09',
    10592,
    10579.03,
    10433.7,
    10634.81,
    160720000
    ],
    [
    '2004-02-10',
    10578.74,
    10613.85,
    10511.18,
    10667.03,
    160590000
    ],
    [
    '2004-02-11',
    10605.48,
    10737.7,
    10561.55,
    10779.4,
    277850000
    ],
    [
    '2004-02-12',
    10735.18,
    10694.07,
    10636.44,
    10775.03,
    197560000
    ],
    [
    '2004-02-13',
    10696.22,
    10627.85,
    10578.66,
    10755.47,
    208340000
    ],
    [
    '2004-02-17',
    10628.88,
    10714.88,
    10628.88,
    10762.07,
    169730000
    ],
    [
    '2004-02-18',
    10706.68,
    10671.99,
    10623.62,
    10764.36,
    164370000
    ],
    [
    '2004-02-19',
    10674.59,
    10664.73,
    10626.44,
    10794.95,
    219890000
    ],
    [
    '2004-02-20',
    10666.29,
    10619.03,
    10559.11,
    10722.77,
    220560000
    ],
    [
    '2004-02-23',
    10619.55,
    10609.62,
    10508.89,
    10711.84,
    229950000
    ],
    [
    '2004-02-24',
    10609.55,
    10566.37,
    10479.33,
    10681.4,
    225670000
    ],
    [
    '2004-02-25',
    10566.59,
    10601.62,
    10509.4,
    10660.73,
    192420000
    ],
    [
    '2004-02-26',
    10598.14,
    10580.14,
    10493.7,
    10652.96,
    223230000
    ],
    [
    '2004-02-27',
    10581.55,
    10583.92,
    10519.03,
    10689.55,
    200050000
    ]
]

function splitData (rawData) {
    let categoryData = [ ]
    let values = [ ]
    let volumes = [ ]
    for (let i = 0;  i < rawData.length;  i++) {
        categoryData.push(rawData[i][0])
        values.push(rawData[i].slice(1, 5))
        volumes.push([i, rawData[i][5], rawData[i][1] > rawData[i][2] ? 1 : -1])
    }
    return {
        categoryData: categoryData,
        values: values,
        volumes: volumes
    }
}

export default function OHLC ({ widget, data_source }: { widget: Widget, data_source: any[] }) {
    const data = splitData(row_data)
    const { title, with_legend, with_tooltip, xAxis, series, yAxis, x_datazoom, y_datazoom } = widget.config as IChartConfig
    const data_node = get_data_source_node(widget.source_id)
    // const col_names = data_node.use(['cols'])
    const option = {
        animation: false,
        title: {
          text: title
        },
        legend: {
          bottom: 10,
          left: 'center',
          data: ['OHLC', 'trades'],
          show: with_legend
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
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: false
            },
            brush: {
              type: ['lineX', 'clear']
            }
          }
        },
        brush: {
          xAxisIndex: 'all',
          brushLink: 'all',
          outOfBrush: {
            colorAlpha: 0.1
          }
        },
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
            right: '8%',
            height: '50%'
          },
          {
            left: '10%',
            right: '8%',
            top: '63%',
            height: '16%'
          }
        ],
        xAxis: [
          {
            type: 'category',
            show: false,
            name: xAxis.name,
            data: xAxis.col_name ? data_source.map(item => item?.[xAxis.col_name]) : [ ],
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
            data: xAxis.col_name ? data_source.map(item => item?.[xAxis.col_name]) : [ ],
            // data: data.categoryData,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
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
            name: yAxis[0].name,
            position: yAxis[0].position,
            offset: yAxis[0].offset 
          },
          {
            scale: true,
            gridIndex: 1,
            splitNumber: 2,
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
            top: '85%',
            start: 20,
            end: 100
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
    }
    // const option = {
    //     animation: false,
    //     legend: {
    //       bottom: 10,
    //       left: 'center',
    //       data: ['Dow-Jones index']
    //     },
    //     tooltip: {
    //       trigger: 'axis',
    //       axisPointer: {
    //         type: 'cross'
    //       },
    //       borderWidth: 1,
    //       borderColor: '#ccc',
    //       padding: 10,
    //       textStyle: {
    //         color: '#000'
    //       },
    //       position: function (pos, params, el, elRect, size) {
    //         const obj = {
    //           top: 10
    //         }
    //         obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30
    //         return obj
    //       }
    //       // extraCssText: 'width: 170px'
    //     },
    //     axisPointer: {
    //       link: [
    //         {
    //           xAxisIndex: 'all'
    //         }
    //       ],
    //       label: {
    //         backgroundColor: '#777'
    //       }
    //     },
    //     toolbox: {
    //       feature: {
    //         dataZoom: {
    //           yAxisIndex: false
    //         },
    //         brush: {
    //           type: ['lineX', 'clear']
    //         }
    //       }
    //     },
    //     brush: {
    //       xAxisIndex: 'all',
    //       brushLink: 'all',
    //       outOfBrush: {
    //         colorAlpha: 0.1
    //       }
    //     },
    //     visualMap: {
    //       show: false,
    //       seriesIndex: 5,
    //       dimension: 2,
    //       pieces: [
    //         {
    //           value: 1,
    //           color: downColor
    //         },
    //         {
    //           value: -1,
    //           color: upColor
    //         }
    //       ]
    //     },
    //     grid: [
    //       {
    //         left: '10%',
    //         right: '8%',
    //         height: '50%'
    //       },
    //       {
    //         left: '10%',
    //         right: '8%',
    //         top: '63%',
    //         height: '16%'
    //       }
    //     ],
    //     xAxis: [
    //       {
    //         type: 'category',
    //         data: data.categoryData,
    //         boundaryGap: false,
    //         axisLine: { onZero: false },
    //         splitLine: { show: false },
    //         min: 'dataMin',
    //         max: 'dataMax',
    //         axisPointer: {
    //           z: 100
    //         }
    //       },
    //       {
    //         type: 'category',
    //         gridIndex: 1,
    //         data: data.categoryData,
    //         boundaryGap: false,
    //         axisLine: { onZero: false },
    //         axisTick: { show: false },
    //         splitLine: { show: false },
    //         axisLabel: { show: false },
    //         min: 'dataMin',
    //         max: 'dataMax'
    //       }
    //     ],
    //     yAxis: [
    //       {
    //         scale: true,
    //         splitArea: {
    //           show: true
    //         }
    //       },
    //       {
    //         scale: true,
    //         gridIndex: 1,
    //         splitNumber: 2,
    //         axisLabel: { show: false },
    //         axisLine: { show: false },
    //         axisTick: { show: false },
    //         splitLine: { show: false }
    //       }
    //     ],
    //     dataZoom: [
    //       {
    //         type: 'inside',
    //         xAxisIndex: [0, 1],
    //         start: 20,
    //         end: 100
    //       },
    //       {
    //         show: true,
    //         xAxisIndex: [0, 1],
    //         type: 'slider',
    //         top: '85%',
    //         start: 20,
    //         end: 100
    //       }
    //     ],
    //     series: [
    //       {
    //         name: 'Dow-Jones index',
    //         type: 'candlestick',
    //         data: data.values,
    //         itemStyle: {
    //           color: upColor,
    //           color0: downColor,
    //           borderColor: undefined,
    //           borderColor0: undefined
    //         }
    //       },
    //       {
    //         name: 'Volume',
    //         type: 'bar',
    //         xAxisIndex: 1,
    //         yAxisIndex: 1,
    //         data: data.volumes,
    //         itemStyle: {
    //             color: param => param.value[2] === -1 ? upColor : downColor
    //         }
    //       }
    //     ]
    //   }
    
    
    return <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
    />
}


export const OhlcConfigForm = (props: { col_names: string[] }) => { 
  const { col_names = [ ] } = props
  return <>
      <BasicFormFields type='chart' />
      <OhlcFormFields col_names={col_names} />
  </>
}

