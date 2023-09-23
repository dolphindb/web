import { Switch } from 'antd'
import dayjs from 'dayjs'
import { type StreamingMessage, formati, DDB } from 'dolphindb/browser.js'
import { type EChartsType } from 'echarts'
import * as echarts from 'echarts'
import React, { useId, useMemo } from 'react'
import { useEffect, useRef, useState } from 'react'
import { use_streaming } from './hooks/use-streaming.js'
import { StreamingError } from './StreamingError.js'
import { type ErrorType, type ScatterConfigType } from './types.js'

/** 
    @param table 表名
    @param x_variable x轴变量
    @param y_variable y轴变量
    @param size_variable 点大小（可选，对应表项必须为number）
    @param color_variable 点颜色深浅（可选，对应表项必须为number）
    @param x_type x轴数据类型（number，string，timestramp）
    @param y_type y轴数据类型（number，string）
    @returns JSX */
export function StreamingScatter ({
    config: { url, table, username, password, x_variable, y_variable, size_variable, color_variable, height, width, x_type, y_type },
    onError
}: {
    config: ScatterConfigType
    onError?: (res: string) => any
}) {
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Record<string, number | string>[]>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const chart = useRef<EChartsType | null>(null)
    const [size_max, setSizeMax] = useState<number>(0)
    const [color_max, setColorMax] = useState<number>(0)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const container = useRef(null)
    const options = useMemo(() => {
        return {
            color: ['#dd4444'],
            xAxis: {
                type:
                    (x_type &&
                        {
                            TIMESTAMP: 'time',
                            STRING: 'category',
                            NUMBER: 'value'
                        }[x_type]) ||
                    'category',
                name: x_variable,
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type:
                    (y_type &&
                        {
                            STRING: 'category',
                            NUMBER: 'value'
                        }[y_type]) ||
                    'category',
                name: y_variable,
                nameLocation: 'end',
                splitLine: {
                    show: false
                }
            },
            visualMap: [
                size_variable && {
                    max: size_max,
                    left: 'right',
                    top: '10%',
                    dimension: 2,
                    calculable: true,
                    precision: 0.1,
                    text: [`圆形大小：${size_variable}`],
                    textGap: 30,
                    inRange: {
                        symbolSize: [10, 50]
                    },
                    outOfRange: {
                        symbolSize: [10, 50],
                        color: ['rgba(255,255,255,0.4)']
                    },
                    controller: {
                        inRange: {
                            color: ['#c23531']
                        },
                        outOfRange: {
                            color: ['#999']
                        }
                    }
                },
                color_variable && {
                    max: color_max,
                    left: 'right',
                    calculable: true,
                    bottom: '5%',
                    dimension: 3,
                    text: [`颜色深浅：${color_variable}`],
                    textGap: 30,
                    inRange: {
                        colorLightness: [0.9, 0.5]
                    },
                    outOfRange: {
                        color: ['rgba(255,255,255,0.4)']
                    },
                    controller: {
                        inRange: {
                            color: ['#c23531']
                        },
                        outOfRange: {
                            color: ['#999']
                        }
                    }
                }
            ],
            series: [
                {
                    type: 'scatter',
                    data: pres_data.map(item => [
                        item[x_variable],
                        item[y_variable],
                        size_variable && item[size_variable],
                        color_variable && item[color_variable]
                    ])
                }
            ],
            tooltip: {
                trigger: 'item',
                axisPointer: {
                    type: 'cross',
                    snap: true
                },
                backgroundColor: 'rgba(255,255,255,0.7)',
                formatter: function (param) {
                    var value = param.value
                    return `
                        ${x_variable}：${x_type === 'TIMESTAMP' ? dayjs(Number(value[0])).format('YYYY/MM/DD HH:mm:ss') : value[0]}<br>
                        ${y_variable}：${value[1]}<br>
                        ${size_variable ? `${size_variable}：${value[2]}<br>` : ''}
                        ${color_variable ? `${color_variable}：${value[3]}<br>` : ''}
                    `
                }
            }
        }
    }, [x_variable, y_variable, size_variable, color_variable, x_type, y_type, pres_data])
    
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
            chart.current?.setOption(options)
        
    }, [options])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.colnames
        // 查看表格所在编号
        const variable_indexs = {
            X_VARIABLE_INDEX: keys.indexOf(x_variable),
            Y_PRICE_VARIABLE_INDEX: keys.indexOf(y_variable),
            SIZE_PRICE_VARIABLE_INDEX: keys.indexOf(size_variable || 'undefined'),
            COLOR_PRICE_VARIABLE_INDEX: keys.indexOf(color_variable || 'undefined')
        }
        const { X_VARIABLE_INDEX, Y_PRICE_VARIABLE_INDEX, SIZE_PRICE_VARIABLE_INDEX, COLOR_PRICE_VARIABLE_INDEX } = variable_indexs
        let data: any = [ ]
        message.data.value.forEach((item, index) => {
            if (item.rows)
                for (let i = 0;  i < item.rows;  i++) {
                    data[i] ??= { }
                    switch (index) {
                        case X_VARIABLE_INDEX:
                            data[i][keys[X_VARIABLE_INDEX]] = x_type === 'TIMESTAMP' || x_type === 'NUMBER' ? Number(item.value[i]) : item.value[i]
                            break
                        case Y_PRICE_VARIABLE_INDEX:
                            data[i][keys[Y_PRICE_VARIABLE_INDEX]] = y_type === 'NUMBER' ? Number(item.value[i]) : item.value[i]
                            break
                        case SIZE_PRICE_VARIABLE_INDEX:
                            data[i][keys[SIZE_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                        case COLOR_PRICE_VARIABLE_INDEX:
                            data[i][keys[COLOR_PRICE_VARIABLE_INDEX]] = Number(item.value[i])
                            break
                    }
                }
        })
        return data
    }
    
    // 存储数据
    function onReceivedStreamingData (message: StreamingMessage) {
        // 格式化message
        let data_items = handleMessage2Data(message)
        if (!data_items.length)
            return
        size_variable && setSizeMax(val => Math.max(val, data_items[0][size_variable]))
        color_variable && setColorMax(val => Math.max(val, data_items[0][color_variable]))
        // 筛选出小于当前时间的数据
        setPresData(pres_data => {
            return [...pres_data, ...data_items]
        })
    }
    
    return <>
            <StreamingError error={error} />
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => setDrawing(checked)} />
            <div ref={container} style={{ width: width || '100%', height: height || '100%' }} />
            {`已装填数据条数：${pres_data.length}`}
        </>
}
