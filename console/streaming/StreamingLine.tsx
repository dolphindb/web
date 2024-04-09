import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { DDB, formati, type StreamingMessage } from 'dolphindb/browser.js'

import { type EChartsType } from 'echarts'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

import { Switch } from 'antd'

import { StreamingError } from './StreamingError.js'
import { use_streaming } from './hooks/use-streaming.js'
import { type ErrorType, type LineConfigType, type LineNodeType } from './types.js'
import './index.sass'

/** 
    @param table 表名
    @param time_variables 类型为时间戳的时间变量变量
    @param properties 期望列
    @param duration 期间ms
    @param height 容器高度px
    @returns JSX */
export function StreamingLine ({
    config: { url, table, time_variable, properties, duration, username, password, height, width },
    onError
}: {
    config: LineConfigType
    onError?: (res: string) => any
}) {
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Array<LineNodeType>>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const chart = useRef<EChartsType | null>(null)
    const options = useMemo(() => {
        return {
            title: {
                text: `${table} line`
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    snap: true
                },
                formatter: params => {
                    return `${time_variable}: ${dayjs(Number(params[0].data[time_variable])).format('YYYY/MM/DD HH:mm:ss')} <br /> \
                    ${
                        properties.length === 1
                            ? `${properties[0]}: ${params[0].data[properties[0]]}`
                            : properties.reduce((prev, val) => {
                                  return `${prev}: ${params[0].data[prev]} <br /> ${val}: ${params[0].data[val]}`
                              })
                    }`
                }
            },
            toolbox: {
                show: true,
                feature: {
                    saveAsImage: {
                        show: true,
                        type: 'png',
                        name: `${table}_line`
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
                dimensions: [{ name: time_variable, type: 'time' }, ...properties],
                source: pres_data
            },
            xAxis: {
                type: 'category',
                axisTick: {
                    alignWithLabel: false
                },
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
                ...properties.map(key => ({
                    name: key,
                    type: 'line',
                    encode: {
                        // 将 时间变量 列映射到 X 轴。
                        x: time_variable,
                        // 将 期望展示的数据 列映射到 Y 轴。
                        y: key
                    }
                }))
            ]
        }
    }, [table, time_variable, properties, pres_data])
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
        // 初始化chart
        chart.current = echarts.init(container.current)
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
        if (drawing && options) 
            // options.dataset.source = pres_data
            chart.current!.setOption(options)
        
    }, [options])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.colnames
        // 查看表格所在编号
        let time_variable_index = keys.indexOf(time_variable)
        // 必须包含time相关变量
        if (time_variable_index === -1)
            return null
        
        let data: Array<Record<string, string | number>> = [ ]
        message.data.value.forEach((item, index) => {
            if (item.rows)
                for (let i = 0;  i < item.rows;  i++) {
                    data[i] ??= { }
                    // 对时间变量进行特殊处理
                    if (index === time_variable_index)
                        data[i][keys[index]] = Number(item.value[i])
                    else {
                        let val = formati(item, i, undefined)
                        data[i][keys[index]] = isNaN(Number(val)) ? val : Number(val)
                    }
                }
        })
        return data
    }
    
    // 用于筛选符合当前期间的数据
    function filterData (data: Array<LineNodeType>, duration: number) {
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
