import { Switch } from 'antd'
import { type StreamingMessage, formati } from 'dolphindb/browser.js'
import * as echarts from 'echarts'
import { type EChartsType } from 'echarts'
import React, { useMemo } from 'react'
import { useEffect, useRef, useState } from 'react'
import { use_streaming } from './hooks/use-streaming.js'
import { StreamingError } from './StreamingError.js'
import { type ErrorType, type SortBarConfigType } from './types.js'

/** 
    @param table 表名
    @param properties 期望列
    @param animationDuration 动画变化时间ms（可选）
    @param height 容器高度px
    @param sort 排序方式（可选）
    @returns JSX */
export function StreamingSortBar ({
    config: { url, table, properties, sort, username, password, animationDuration, height, width },
    onError
}: {
    config: SortBarConfigType
    onError?: (res: string) => any
}) {
    // 当前用于展示的图表数据信息
    const [data, setData] = useState<Record<string, string | number>>({ })
    const [drawing, setDrawing] = useState<boolean>(true)
    const chart = useRef<EChartsType | null>(null)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const properties_set = new Set(properties)
    const container = useRef(null)
    const options = useMemo(() => {
        return {
            xAxis: {
                max: 'dataMax'
            },
            yAxis: {
                type: 'category',
                data: properties,
                inverse:
                    (sort &&
                        {
                            DESC: true,
                            ASC: false
                        }[sort]) ||
                    true,
                animationDuration: 300,
                animationDurationUpdate: 300
                // max: 2 // only the largest 3 bars will be displayed
            },
            series: [
                {
                    realtimeSort: true,
                    type: 'bar',
                    data: properties.map(key => data[key]),
                    label: {
                        show: true,
                        position: 'right',
                        valueAnimation: true
                    }
                }
            ],
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {
                        show: true,
                        type: 'png',
                        name: `${table}_bar`
                    },
                    restore: {
                        show: true,
                        title: '刷新'
                    }
                }
            },
            legend: {
                show: true
            },
            animationDuration: 0,
            animationDurationUpdate: animationDuration === undefined ? 1000 : animationDuration
            // animationEasing: 'linear',
            // animationEasingUpdate: 'linear'
        }
    }, [properties, sort, table, animationDuration, data])
    
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
    
    useEffect(() => {
        // 初始化chart
        chart.current = echarts.init(container.current)
        chart.current?.setOption(options, true)
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
        if (options && drawing) 
            chart.current?.setOption(options)
        
    }, [options])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.colnames
        let data = { }
        message.data.value.forEach((item, index) => {
            if (item.rows && item.rows > 0 && properties_set.has(keys[index]))
                data[keys[index]] = formati(item, item.rows - 1, undefined)
        })
        return data
    }
    function onReceivedStreamingData (message: StreamingMessage) {
        let now_data = handleMessage2Data(message)
        switch (sort) {
            case 'ASC':
                let data_asc: Record<string, string | number> = { }
                let order_asc = Object.keys(now_data).sort((a, b) => now_data[a] - now_data[b])
                for (let k of order_asc)
                    data_asc[k] = now_data[k]
                setData({ ...data_asc })
                break
            case 'DESC':
                let data_desc = { }
                let order_desc = Object.keys(now_data).sort((a, b) => now_data[b] - now_data[a])
                for (let k of order_desc)
                    data_desc[k] = now_data[k]
                setData({ ...data_desc })
                break
            default:
                setData({ ...now_data })
        }
    }
    return <>
            <StreamingError error={error} />
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => setDrawing(checked)} />
            <div ref={container} style={{ width: width || '100%', height: height || '100%' }} />
        </>
}
