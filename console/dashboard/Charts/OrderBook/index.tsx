import { BasicFormFields } from '../../ChartFormFields/BasicFormFields.js'
import { AxisFormFields, SeriesFormFields } from '../../ChartFormFields/BasicChartFields.js'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'
import { type IOrderBookConfig, type IChartConfig } from '../../type.js'
import { to_chart_data } from '../../utils.js'
import { DdbType } from 'dolphindb/browser.js'
import { OrderFormFields } from '../../ChartFormFields/OrderBookField.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    
    let { title, with_tooltip, time_rate } = widget.config as unknown as IChartConfig & IOrderBookConfig
    
    // 样式调整先写死，后面再改
    const convert_order_config = useMemo(() => {
        let data = [ ]
        if (!time_rate) 
            time_rate = 100
        
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
            data.push(...formatData(item.bidmdEntryPrice, item.bidmdEntrySize, convertDateFormat(item.sendingTime), true))
            data.push(...formatData(item.offermdEntryPrice, item.offermdEntrySize, convertDateFormat(item.sendingTime), false))
        }
      
        // 图表最多展示数据量
        if (data.length > 1000)
            data = data.slice(data.length - 1000)
        
      
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
            return `${params.data[0]}  ${params.data[1] / time_rate}  ${params.data[2]}`
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
        //   minorTick: {
        //     splitNumber: 100
        //   },
        //   minInterval: 0.001
            axisLabel: {
                formatter: params => {
                    return (params / time_rate).toFixed(2)
                }
            }
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
    }, [title, with_tooltip, time_rate, data_source]) 
    
    
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
        <OrderFormFields />
    </>
}


function convertDateFormat (dateString: string) {
  const parts = dateString.split(/[\s.:-]/)
  const year = parts[0]
  const month = parts[1].padStart(2, '0')
  const day = parts[2].padStart(2, '0')
  const time = dateString.split(' ')[1]
  
  return `${year}-${month}-${day} ${time}`
}

