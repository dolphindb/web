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
      const data = [ ]
      for (let item of data_source) {
        if (item.bmdEntryPrice)
            for (let i = 0;  i < item.bmdEntryPrice.data.length;  i++)
                data.push([item.sendingTime, item.bmdEntryPrice.data[i], item.bmdEntrySize.data[i]])
        if (item.omdEntryPrice)
            for (let i = 0;  i < item.omdEntryPrice.data.length;  i++)
                data.push([item.sendingTime, item.omdEntryPrice.data[i], -item.omdEntrySize.data[i]])
      }
      
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
          position: 'top'
        },
        grid: {
          height: '70%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          splitNumber: 5
        },
        yAxis: {
          type: 'category',
          scale: true
        },
        visualMap: {
          min: -10,
          max: 10,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '0%',
          inRange: {
            color: ['rgba(57,117,198,1)', 'rgba(255,255,255,1)', 'rgba(255,0,0,1)']
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
