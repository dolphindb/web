import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'
import { type IChartConfig } from '../../type.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    
    const { title, with_tooltip } = widget.config as IChartConfig
    console.log(data_source)
    
    
    // 样式调整先写死，后面再改
    const convert_order_config = useMemo(() => {
        let data = [ ]
      
        for (let item of data_source) {
            let bmdEntry = [ ]
            if (item.bidmdEntryPrice)
                for (let i = 0;  i < item.bidmdEntryPrice.data.length && i < 10;  i++)
                    bmdEntry.push([convertDateFormat(item.sendingTime), item.bidmdEntryPrice.data[i] < 0 ? 10000 : item.bidmdEntryPrice.data[i] * 100, item.bidmdEntrySize.data[i]])
            bmdEntry.sort((a, b) => {
                return a[2] > b[2] ? 1 : 0 
            })
            bmdEntry.forEach((item, index) => {
            item[2] = index
            })
            data.push(...bmdEntry)
            
            let omdEntry = [ ]
            if (item.offermdEntryPrice)
                for (let i = 0;  i < item.offermdEntryPrice.data.length && i < 10;  i++)
                    omdEntry.push([convertDateFormat(item.sendingTime), item.offermdEntryPrice.data[i] < 0 ? 10000 : item.offermdEntryPrice.data[i] * 100, item.offermdEntrySize.data[i]])
                
            omdEntry.sort((a, b) => {
                return a[2] > b[2] ? 1 : 0 
            })
            omdEntry.forEach((item, index) => {   
            item[2] = -index - 1
            })
            data.push(...omdEntry)
        }
      
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
            return `${params.data[0]}  ${params.data[1]}  ${params.data[2]}`
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
