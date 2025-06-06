import type * as echarts from 'echarts'

import { useMemo } from 'react'

import { DdbType } from 'dolphindb/browser.js'

import { dashboard, type Widget } from '../../model.js'
import { type IOrderBookConfig, type IChartConfig } from '../../type.js'
import { to_chart_data } from '../../utils.ts'


import { OrderFormFields, BasicFormFields } from '../../ChartFormFields/OrderBookField.js'


import { DashboardEchartsComponent } from '@/dashboard/components/EchartsComponent.tsx'

import { convert_order_book_config, convertDateFormat, type OrderBookTradeData, parsePrice } from './config.js'
import type { GraphComponentProps } from '@/dashboard/graphs.ts'


export function OrderBook ({ widget, data_source: { data } }: GraphComponentProps<OrderBookTradeData>) {
    
    let { time_rate, market_data_files_num } = widget.config as IOrderBookConfig
    
    /** 记录每一次流数据的长度， 然后处理时， 可以不需要处理以前的已经发过来的流数据 */
    // let data_length = useRef(0)
    
    // 如果数据格式不匹配，则直接返回
    if (!data[0]?.sendingTime && !data[0]?.bidmdEntryPrice && !data[0]?.bidmdEntrySize)
        return
    
    // 样式调整先写死，后面再改
    const convert_order_config = useMemo((): echarts.EChartsOption => {
        let orderbook_data = [ ]
        let bar_data = [ ]
        let line_data = [ ]
        
        
        // time_rate 作用解释， 由于 echarts heatmap 的每个小块高度默认展示一个 y 轴单位长度（未找到可以改动此属性的 option，找到了应该就可以去掉该属性）
        // 但订单图数据常为浮点数，且数据浮动不大，因此会造成多个小块大面积重叠，导致图的展示效果不好
        // 所以，在数据上乘以一个 time_rate 作为图表的展示数值，在 y 轴和 tooltip 再 ÷ 回来显示数值，可较好的实现图的展示效果
        // time_rate 越大，每个块的高度越高
        if (!time_rate) 
            time_rate = 100
        
        // 处理数据
        function formatData (price, size, sendingTime, is_buy) {
            let entry = [ ]
            if (price && size)
                for (let i = 0;  i < (price.length || 0) && i < market_data_files_num;  i++)
                    // 去除空值
                    if (price[i] && to_chart_data(size[i], DdbType.long))
                        // 数据解释: 第一项时间，作为 x 轴；第二项价格，作为 y 轴； 第三栏交易量，tooltip 展示； 第四栏价格档位，tooltip 展示；第五栏交易量，用于排序展示块的颜色深浅
                        entry.push([sendingTime, price[i] * time_rate, to_chart_data(size[i], DdbType.long), is_buy ? `bmd[${i}]` : `omd[${i}]`, size[i]])
            // 对 size 排序，确认颜色深浅
            entry.sort((a, b) => a[4] > b[4] ? 1 : 0)
            entry.forEach((item, index) => {
                item[4] = is_buy ? index + 1 : -index - 1
            })
            
            return entry
        }
        
        for (let item of data) {
            // 由于 arrayvector 改动后被转成了字符串，所以需要先进行 parse 处理
            let bid = formatData(parsePrice(item.bidmdEntryPrice), JSON.parse(item.bidmdEntrySize), convertDateFormat(item.sendingTime), true)
            orderbook_data.push(...bid)
            
            let omd = formatData(parsePrice(item.offermdEntryPrice), JSON.parse(item.offermdEntrySize), convertDateFormat(item.sendingTime), false)
            orderbook_data.push(...omd)
            
            // 柱状图数据及曲线数据
            // 如果订单图有数据, 这里柱状图的数据必须 push , 因为柱状图和订单图共用一个 x 轴，订单图的 x 轴实际上是被隐藏了的
            if (bid.length && omd.length)
                bar_data.push([convertDateFormat(item.sendingTime), item.volume || 0])
                
            
            
            if (item.upToDatePrice) 
                line_data.push([convertDateFormat(item.sendingTime), item.upToDatePrice * time_rate])
            
        }
        
      
        // console.log(bar_data)
        // console.log(orderbook_data)
        // console.log(line_data)
        
        
        return convert_order_book_config(widget.config as unknown as IChartConfig & IOrderBookConfig, orderbook_data, line_data, bar_data) as echarts.EChartsOption
    }, [data, widget.config])   
    
    
    // 编辑模式下 notMerge 为 true ，因为要修改配置，预览模式下 notMerge 为 false ，避免数据更新，导致选中的 label失效
    return  <DashboardEchartsComponent
        not_merge={dashboard.editing}
        options={convert_order_config}
    />
}


export function OrderConfigForm () {
    return <>
        <BasicFormFields type='chart' />
        {/* <AxisFormFields col_names={col_names} /> */}
        <OrderFormFields />
    </>
}

