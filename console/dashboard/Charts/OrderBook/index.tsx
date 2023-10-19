import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget, dashboard } from '../../model.js'
import { useMemo, useRef } from 'react'
import { type IOrderBookConfig, type IChartConfig } from '../../type.js'
import { to_chart_data } from '../../utils.js'
import { DdbType } from 'dolphindb/browser.js'
import { OrderFormFields, BasicFormFields } from '../../ChartFormFields/OrderBookField.js'
import { t } from '../../../../i18n/index.js'
import {
  type EChartsOption,
} from 'echarts/types/dist/shared'



interface IProps { 
    widget: Widget
    data_source: OrderBookData[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    
    let { title, with_tooltip, time_rate, title_size, with_legend, with_split_line } = widget.config as unknown as IChartConfig & IOrderBookConfig
    
    /** 记录每一次流数据的长度， 然后处理时， 可以不需要处理以前的已经发过来的流数据 */
    // let data_length = useRef(0)
    
    
    // 如果数据格式不匹配，则直接返回
    if (!data_source[0]?.sendingTime && !data_source[0]?.bidmdEntryPrice && !data_source[0]?.bidmdEntrySize)
        return
      
    // 样式调整先写死，后面再改
    const convert_order_config = useMemo((): EChartsOption => {
        let data = [ ]
        
        // time_rate 作用解释， 由于 echarts heatmap 的每个小块默认展示一个单位长度的 y 轴高度（未找到可以改动此属性的 option，找到了应该就可以去掉该属性）
        // 但订单图数据常为浮点数，且数据浮动不大，因此会造成多个大面积重叠，导致图的展示效果不好
        // 所以，在数据上乘以一个 time_rate 作为图表的展示数值，在 y 轴和 tooltip 再 ÷ 回来显示数值，可较好的实现图的展示效果
        // time_rate 越大，每个块的高度越高
        if (!time_rate) 
            time_rate = 100
        
        // 处理数据
        function formatData (price, size, sendingTime, is_buy) {
            let entry = [ ]
            if (price && size)
                for (let i = 0;  i < price.data.length && i < 10;  i++)
                    // 去除空值
                    if (to_chart_data(price.data[i], DdbType.double) && to_chart_data(size.data[i], DdbType.long))
                        entry.push([sendingTime, price.data[i] * time_rate, to_chart_data(size.data[i], DdbType.long), is_buy ? `bmd[${i}]` : `omd[${i}]`, size.data[i]])
            // 对 size 排序，确认颜色深浅
            entry.sort((a, b) => {
                return a[4] > b[4] ? 1 : 0 
            })
            entry.forEach((item, index) => {
                item[4] = is_buy ? index + 1 : -index - 1
            })
            
            return entry
        }
        for (let item of data_source) {
            data.push(...formatData(item.bidmdEntryPrice, item.bidmdEntrySize, convertDateFormat(item.sendingTime), true))
            data.push(...formatData(item.offermdEntryPrice, item.offermdEntrySize, convertDateFormat(item.sendingTime), false))
        }
        
      
      return {
        title: {
          text: title,
          textStyle: {
              color: '#e6e6e6',
              fontSize: title_size,
          }
        },
        legend: {
          show: with_legend
        },
        tooltip: {
          show: with_tooltip,
          position: 'top',
          formatter: params => {
            return `${params.data[0]}
            ${(params.data[1] / time_rate).toFixed(4)}
            ${params.data[2]}
            ${params.data[3]}`
          }
        },
        grid: {
          height: '70%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          // 坐标轴
          axisLine: {
            show: true
          }
        },
        yAxis: {
          type: 'value',
          scale: true,
          // 坐标轴在 grid 区域中的分隔线。
          splitLine: {
            show: with_split_line
          },
          axisLabel: {
              formatter: params => {
                  return (params / time_rate).toFixed(2)
              }
          },
          axisLine: {
            show: true
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
            encode: {
              x: 0,
              y: 1,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
    }, [title, with_tooltip, time_rate, data_source, title_size, with_legend, with_split_line])   
    
    
    
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
  // const parts = dateString.split(/[\s.:-]/)
  // const year = parts[0]
  // const month = parts[1].padStart(2, '0')
  // const day = parts[2].padStart(2, '0')
  const time = dateString.split(' ')[1]
  
  return `${time}`
}

interface OrderBookData {
  bondCodeVal: string
  createTime: string
  marketDepth: string
  mdBookType: string
  messageId: string
  messageSource: string
  msgSeqNum: string
  msgType: string
  bidmdEntryPrice: any
  offermdEntryPrice: any
  bidmdEntrySize: any
  offermdEntrySize: any
  bidsettlType: any
  offersettlType: any
  bidyield: any
  offeryield: any
  bid1yieldType: string
  offer1yieldType: string
  bid2yieldType: string
  offer2yieldType: string
  bid3yieldType: string
  offer3yieldType: string
  bid4yieldType: string
  offer4yieldType: string
  bid5yieldType: string
  offer5yieldType: string
  bid6yieldType: string
  offer6yieldType: string
  securityID: string
  senderCompID: string
  senderSubID: string
  sendingTime: string
}
