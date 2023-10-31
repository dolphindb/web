import {
    type EChartsOption,
} from 'echarts/types/dist/shared'
import { type IOrderBookConfig } from '../../type'
import { parse_text, to_chart_data } from '../../utils.js'

export function convert_order_book_config (config: IOrderBookConfig, orderbook_data, line_data, bar_data): EChartsOption {
    let { title, with_tooltip, time_rate, title_size, with_legend, with_split_line, bar_color, line_color } = config
    
    return {
        title: {
            text: parse_text(title ?? ''),
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
        grid: [
            // 热力图    
            {
                height: '50%',
                top: '10%'
            },
            // 柱状图
            {
                height: '30%',
                bottom: '10%'
            }
        ],
        
        xAxis: [{
            type: 'category',
            // 坐标轴
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                show: false,
            },
        },
        {
            gridIndex: 1,
            type: 'category',
            // 坐标轴
            axisLine: {
                show: true
            }
        }],
        yAxis: [
            {
                position: 'left',
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
            {
                gridIndex: 1,
                position: 'left',
                type: 'value',
                scale: true,
                // 坐标轴在 grid 区域中的分隔线。
                splitLine: {
                    show: with_split_line
                },
                axisLine: {
                    show: true
                }
            },
        ],
        visualMap: {
            min: -10,
            max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            inRange: {
                color: ['rgba(255,0,0,0.6)', 'rgba(255,255,255,0.6)', 'rgba(57,117,198,0.6)']
            },
            // 设置 visualMap 仅对 orderbook 生效，不然会影响柱状图和曲线颜色
            seriesIndex: 0
        },
        series: [
            {   
                name: 'Order Book',
                type: 'heatmap',
                data: orderbook_data,
                encode: {
                    x: 0,
                    y: 1,
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {   
                name: 'Line',
                type: 'line',
                data: line_data,
                encode: {
                    x: 0,
                    y: 1,
                },
                smooth: true,
                itemStyle: {
                    color: line_color
                },
                xAxisIndex: 0,
                yAxisIndex: 0
            },
            {   
                name: 'Bar',
                type: 'bar',
                data: bar_data,
                encode: {
                    x: 0,
                    y: 1,
                },
                itemStyle: {
                    color: bar_color
                },
                // 选择 gird 中下方的图
                xAxisIndex: 1,
                yAxisIndex: 1
            }
        ]
    }
}

export function convertDateFormat (dateString: string) {
    // const parts = dateString.split(/[\s.:-]/)
    // const year = parts[0]
    // const month = parts[1].padStart(2, '0')
    // const day = parts[2].padStart(2, '0')
    const time = dateString.split(' ')[1]
    
    return `${time}`
}

export interface OrderBookTradeData {
    bondCodeVal: string
    createTime: string
    marketDepth: string
    mdBookType: string
    messageId: string
    messageSource: string
    msgSeqNum: string
    msgType: string
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
    trade_createTime: string
    beforeClosingPrice?: any
    beforeClosingYield?: any
    beforeWeightedAveragePrice?: any
    beforeWeightedAverageYield?: any
    fillSide?: any
    highestPrice?: any
    highestYield?: any
    lowestPrice?: any
    lowestYield?: any
    marketIndicator?: any
    mdSubType?: any
    mdType?: any
    trade_messageId?: any
    trade_messageSource: string
    trade_msgSeqNum?: any
    trade_msgType: string
    openingValence?: any
    openingYield?: any
    priceRiseFallAmplitude?: any
    trade_senderCompID: string
    trade_sendingTime: string
    settlType?: any
    symbol: string
    tradeMethod?: any
    transactTime: string
    transactionNumber?: any
    uniqueOutputKey?: any
    upToDatePrice?: any
    upToDateYield?: any
    weightedAveragePrice?: any
    weightedAverageYield?: any
    yieldRiseFall?: any
    volume?: any
    bidmdEntryPrice: string
    offermdEntryPrice: string
    bidmdEntrySize: string
    offermdEntrySize: string
    bidsettlType?: string
    offersettlType?: string
    bidyield: string
    offeryield: string
}

export interface OrderBookData {
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
