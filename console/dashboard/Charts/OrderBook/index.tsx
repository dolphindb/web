import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'
import { type IChartConfig } from '../../type.js'
import { to_chart_data } from '../../utils.js'
import { DdbType } from 'dolphindb/browser.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    
    const { title, with_tooltip } = widget.config as IChartConfig
    const time_rate = 10
    
    // 样式调整先写死，后面再改
    const convert_order_config = useMemo(() => {
        let data = [ ]
        console.log(data_source)
        
        function formatData (price, size, sendingTime, is_buy) {
            let entry = [ ]
            if (price && size)
                for (let i = 0;  i < price.data.length && i < 10;  i++)
                    // 去除空值
                    if (to_chart_data(price.data[i], DdbType.double) && to_chart_data(size.data[i], DdbType.long))
                        entry.push([sendingTime, price.data[i] < 0 ? 100 * time_rate : price.data[i] * time_rate, to_chart_data(size.data[i], DdbType.long), size.data[i]])
            // 对 size 排序，确认颜色深浅
            entry.sort((a, b) => {
                return a[3] > b[3] ? 1 : 0 
            })
            entry.forEach((item, index) => {
                item[3] = is_buy ? index + 1 : -index - 1
            })
            
            return entry
        }
        
        for (let item of data_source) {
            
            
            // let bmdEntry = [ ]
            // if (item.bidmdEntryPrice)
            //     for (let i = 0;  i < item.bidmdEntryPrice.data.length && i < 10;  i++)
            //         if (to_chart_data(item.bidmdEntryPrice.data[i], DdbType.double) && to_chart_data(item.bidmdEntrySize.data[i], DdbType.long))
            //             bmdEntry.push([convertDateFormat(item.sendingTime), item.bidmdEntryPrice.data[i] < 0 ? 100 * time_rate : item.bidmdEntryPrice.data[i] * time_rate, item.bidmdEntrySize.data[i]])
            // bmdEntry.sort((a, b) => {
            //     return a[2] > b[2] ? 1 : 0 
            // })
            // bmdEntry.forEach((item, index) => {
            //     item[2] = index
            // })
            data.push(...formatData(item.bidmdEntryPrice, item.bidmdEntrySize, convertDateFormat(item.sendingTime), true))
            
            // let omdEntry = [ ]
            // if (item.offermdEntryPrice)
            //     for (let i = 0;  i < item.offermdEntryPrice.data.length && i < 10;  i++)
            //         omdEntry.push([convertDateFormat(item.sendingTime), item.offermdEntryPrice.data[i] < 0 ? 100 * time_rate : item.offermdEntryPrice.data[i] * time_rate, item.offermdEntrySize.data[i]])
                
            // omdEntry.sort((a, b) => {
            //     return a[2] > b[2] ? 1 : 0 
            // })
            // omdEntry.forEach((item, index) => {   
            //     item[2] = -index - 1
            // })
            // data.push(...omdEntry)
            data.push(...formatData(item.offermdEntryPrice, item.offermdEntrySize, convertDateFormat(item.sendingTime), false))
            
        }
      
        // 图表最多展示数据量
        if (data.length > 1000)
            data = data.slice(data.length - 1000)
        
        console.log(data)
        
      
      return {
        title: {
          text: title,
          textStyle: {
              color: '#e6e6e6',
          }
        },
        legend: {
          show: false
        },
        tooltip: {
          show: with_tooltip,
          position: 'top',
          formatter: params => {
            return `${params.data[0]}  ${params.data[1] / 10}  ${params.data[2]}`
          }
        },
        grid: {
          height: '70%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          splitNumber: 3,
        },
        yAxis: {
          type: 'value',
          scale: true,
          // minorTick: {
          //   splitNumber: 100
          // }
        },
        visualMap: {
          min: -10,
          max: 10,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '0%',
          inRange: {
            color: ['rgba(57,117,198,0.6)', 'rgba(255,255,255,0.6)', 'rgba(255,0,0,0.6)']
          }
        },
        series: [
          {   
            name: 'Punch Card',
            type: 'heatmap',
            data: data,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
    }, [title, with_tooltip, data_source]) 
    
    
    return  <ReactEChartsCore
                echarts={echarts}
                notMerge
                option={convert_order_config}
                theme='my-theme'
        />
}


export function OrderConfigForm (props: { col_names: string[] } ) {
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields type='chart' />
        {/* <AxisFormFields col_names={col_names} /> */}
    </>
}


function convertDateFormat (dateString: string) {
  const parts = dateString.split(/[\s.:-]/)
  const year = parts[0]
  const month = parts[1].padStart(2, '0')
  const day = parts[2].padStart(2, '0')
  // const time = parts.slice(3).join(':')
  const time = dateString.split(' ')[1]
  
  return `${year}-${month}-${day} ${time}`
}

const obj = [
  [
      '2023-09-18 02:45:39.108',
      101.6428,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.6428,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.5359,
      200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100.141,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      101.6331,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.5359,
      200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100.141,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      101.6331,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.5359,
      200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100.141,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      101.653,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.653,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.5359,
      200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100.141,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      101.6506,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.6506,
      20000000
  ],
  [
      '2023-09-18 02:45:39.108',
      101.5359,
      200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100.141,
      30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      -2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.8082,
      -30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.8082,
      -30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.8082,
      -30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.8082,
      -30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.0228,
      -200000000
  ],
  [
      '2023-09-18 02:45:39.108',
      102.8082,
      -30000000
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ],
  [
      '2023-09-18 02:45:39.108',
      100,
      2147483648
  ]
]
