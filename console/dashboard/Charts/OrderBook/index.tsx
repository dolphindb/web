import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts'
import { type Widget, dashboard } from '../../model.js'
import { useMemo } from 'react'
import { type IOrderBookConfig, type IChartConfig } from '../../type.js'
import { to_chart_data } from '../../utils.js'
import { DdbType } from 'dolphindb/browser.js'
import { OrderFormFields, BasicFormFields } from '../../ChartFormFields/OrderBookField.js'
import { t } from '../../../../i18n/index.js'



interface IProps { 
    widget: Widget
    data_source: any[]
}


export function OrderBook (props: IProps) {
    const { widget, data_source } = props
    
    let { title, with_tooltip, time_rate, title_size, with_legend } = widget.config as unknown as IChartConfig & IOrderBookConfig
    
    // 如果数据格式不匹配，则直接返回
    if (!data_source[0]?.sendingTime && !data_source[0]?.bidmdEntryPrice && !data_source[0]?.bidmdEntrySize) {
      dashboard.message.error(t('数据格式不正确'))
      return <></>
    }
    
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
            return `${params.data[0]}  ${(params.data[1] / time_rate).toFixed(4)}  ${params.data[2]}  ${params.data[3]}`
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
    }, [title, with_tooltip, time_rate, data_source, title_size, with_legend]) 
    
    // 如果数据格式不匹配，则直接返回
    if (!data_source[0]?.sendingTime && !data_source[0]?.bidmdEntryPrice && !data_source[0]?.bidmdEntrySize) {
      dashboard.message.error(t('数据格式不正确'))
      return
    }
    
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

