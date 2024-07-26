import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { type StreamingMessage } from 'dolphindb/browser.js'

import { type EChartsType } from 'echarts'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

import { Switch } from 'antd'

import { StreamingError } from './StreamingError.js'
import { use_streaming } from './hooks/use-streaming.js'
import { type ErrorType, type KLineConfigType, type KLineNodeType } from './types.js'
import './index.sass'

/** 
    @param table 表名
    @param time_variable 时间变量
    @param duration x毫秒内数据
    @param opening_price_variable 开盘价
    @param closing_price_variable 收盘价
    @param maximum_price_variable 最高价
    @param minimum_price_variable 最低价
    @returns JSX */
export function StreamingKLine ({
    config: {
        url,
        table,
        username,
        password,
        time_variable,
        duration,
        opening_price_variable,
        closing_price_variable,
        maximum_price_variable,
        minimum_price_variable,
        height,
        width
    },
    onError
}: {
    config: KLineConfigType
    onError?: (res: string) => any
}) {
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Array<KLineNodeType>>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const chart = useRef<EChartsType | null>(null)
    const options = useMemo(() => {
        return {
            title: {
                text: `${table} line`
            },
            legend: {
                show: true
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    snap: true
                }
            },
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {
                        show: true,
                        type: 'png',
                        name: `${table}_k_line`
                    },
                    restore: {
                        show: true,
                        title: '刷新'
                    },
                    dataZoom: {
                        yAxisIndex: false
                    },
                    brush: {
                        type: ['lineX', 'clear']
                    }
                }
            },
            dataset: {
                sourceHeader: false,
                source: pres_data
            },
            xAxis: {
                type: 'category',
                axisTick: {
                    alignWithLabel: false
                },
                data: pres_data.map(item => item[time_variable]),
                axisLabel: {
                    formatter: function (value) {
                        return dayjs(Number(value)).format('YYYY/MM/DD HH:mm:ss')
                    }
                },
                axisPointer: {
                    label: {
                        formatter: function (params) {
                            return dayjs(Number(params.value)).format('YYYY/MM/DD HH:mm:ss')
                        }
                    }
                }
            },
            yAxis: {
                alignTicks: true
            },
            series: [
                {
                    type: 'candlestick',
                    data: pres_data.map(item => [
                        item[opening_price_variable],
                        item[closing_price_variable],
                        item[maximum_price_variable],
                        item[minimum_price_variable]
                    ])
                }
            ]
        }
    }, [table, pres_data])
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const container = useRef(null)
    
    /** 订阅数据流表 */
    use_streaming(
        {
            url,
            username,
            password,
            table
        },
        {
            onSuccess () {
                setError({
                    appear: false,
                    msg: ''
                })
            },
            onError (e) {
                setError({
                    appear: true,
                    msg: e.toString()
                })
                onError && onError(e)
            },
            onReceivedStreamingData
        }
    )
    
    /** 初始化图表 */
    useEffect(() => {
        chart.current = echarts.init(container.current)
        // 初始化chart
        chart.current.setOption(options, true)
        // 创建一个观察器实例并传入回调函数
        const observer = new ResizeObserver(() => {
            chart.current?.resize()
        })
        observer.observe(container.current)
        return () => {
            chart.current?.dispose()
            observer.disconnect()
        }
    }, [ ])
    
    useEffect(() => {
        console.log(options)
        
        if (drawing && options) 
            chart.current?.setOption(options)
        
    }, [options])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.data.columns
        // 查看表格所在编号
        const variable_indexs = {
            time_variable_index: keys.indexOf(time_variable),
            opening_price_variable_index: keys.indexOf(opening_price_variable),
            closing_price_variable_index: keys.indexOf(closing_price_variable),
            maximum_price_variable_index: keys.indexOf(maximum_price_variable),
            minimum_price_variable_index: keys.indexOf(minimum_price_variable)
        }
        // 必须包含相关变量
        if (Object.values(variable_indexs).includes(-1))
            return null
        const {
            time_variable_index: TIME_VARIABLE_INDEX,
            opening_price_variable_index: OPENING_PRICE_VARIABLE_INDEX,
            closing_price_variable_index: CLOSING_PRICE_VARIABLE_INDEX,
            maximum_price_variable_index: MAXIMUM_PRICE_VARIABLE_INDEX,
            minimum_price_variable_index: MINIMUM_PRICE_VARIABLE_INDEX
        } = variable_indexs
        let data: Record<string, number>[] = [ ]
        message.obj.value.forEach((item, index) => {
            if (item.rows)
                for (let i = 0;  i < item.rows;  i++) {
                    data[i] ??= { }
                    switch (index) {
                        case TIME_VARIABLE_INDEX:
                            data[i][keys[TIME_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                        case OPENING_PRICE_VARIABLE_INDEX:
                            data[i][keys[OPENING_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                        case CLOSING_PRICE_VARIABLE_INDEX:
                            data[i][keys[CLOSING_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                        case MAXIMUM_PRICE_VARIABLE_INDEX:
                            data[i][keys[MAXIMUM_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                        case MINIMUM_PRICE_VARIABLE_INDEX:
                            data[i][keys[MINIMUM_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                    }
                }
        })
        return data
    }
    
    // 用于筛选符合当前期间的数据
    function filterData (data: Array<KLineNodeType>, duration: number) {
        let now_time = new Date().getTime()
        return data.filter(({ time: node_time }) => {
            return now_time - node_time < duration
        })
    }
    // 存储数据
    function onReceivedStreamingData (message: StreamingMessage) {
        // 格式化message
        let data_items = handleMessage2Data(message)
        if (!data_items)
            return
        // 筛选出小于当前时间的数据
        setPresData(pres_data => {
            return filterData([...pres_data, ...data_items], duration)
        })
    }
    
    return <>
            <StreamingError error={error} />
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => { setDrawing(checked) }} />
            <div ref={container} style={{ width: width || '100%', height: height || '100%' }} />
            <span className='line_span'>{`已装填数据条数：${pres_data.length}`}</span>
        </>
}
