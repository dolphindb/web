import { useEffect, useRef, useState } from 'react'

import { Switch, Descriptions, Row, Col, Statistic, Card } from 'antd'

import dayjs from 'dayjs'

// 引入图表
import * as echarts from 'echarts'

import { DDB, formati, type StreamingMessage } from 'dolphindb/browser.js'

import { type EChartsType } from 'echarts'
export type Context = 'page' | 'webview' | 'window' | 'embed'

interface ErrorType {
    appear: boolean
    msg: string
}
interface ConfigType {
    table: string
    username: string
    password: string
}
export interface LineConfigType extends ConfigType {
    time_variable: string
    properties: Array<string>
    duraction: number
    height?: number
}

export interface TableConfigType extends ConfigType {
    properties: Array<string>
    column?: number
    layout?: 'vertical' | 'horizontal'
}

export interface HeatMapConfigType extends ConfigType {
    properties: string[]
    max?: number
    min?: number
    sort?: 'ASC' | 'DESC'
    column?: number
}

export interface SortBarConfigType extends ConfigType {
    properties: string[]
    sort?: 'ASC' | 'DESC'
    animationDuration?: number
    height?: number
}

export interface KLineConfigType extends ConfigType {
    time_variable: string
    duraction: number
    opening_price_variable: string
    closing_price_variable: string
    maximum_price_variable: string
    minimum_price_variable: string
    height?: number
}

export interface ScatterConfigType extends ConfigType {
    x_variable: string
    y_variable: string
    x_type?: 'TIMESTAMP' | 'NUMBER' | 'STRING'
    y_type?: 'NUMBER' | 'STRING'
    size_variable?: string
    color_variable?: string
    height?: number
}

// 定义折线图节点类型（必须要包含一个time属性）
export type LineNodeType = {
    time: number
    [key: string]: number | string
}
// 定义K线图节点类型
export type KLineNodeType = {
    time: number
    opening_price: number
    closing_price: number
    maximum_price: number
    minimum_price: number
}

function useConnectDDB (
    {
        username,
        password,
        table
    }: {
        username: string
        password: string
        table: string
    },
    { onSuccess, onError, setError, saveData }: Record<string, (p: any) => any>
) {
    useEffect(() => {
        // 订阅流数据
        const rddb = new DDB(undefined, {
            autologin: Boolean(username),
            username,
            password,
            streaming: {
                table: table,
                // 订阅流表
                handler (message: StreamingMessage) {
                    // 收集数据(新数据放到后面)
                    if (message.error) {
                        console.error(message.error)
                        return
                    }
                    saveData(message)
                }
            }
        })
        ;(async () => {
            try {
                await rddb.connect()
                onSuccess && onSuccess('CONNECT_SUCCESS')
            } catch (e) {
                setError({
                    appear: true,
                    msg: e.toString()
                })
                onError && onError('CONNECT_ERROR')
            }
        })()
        return () => {
            rddb.disconnect()
        }
    }, [ ])
}

function StreamingError ({ error }: { error: ErrorType }) {
    if (error.appear) 
        return <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,.75)',
                    zIndex: 1,
                    left: 0,
                    top: 0,
                    padding: '40px',
                    color: '#cb2f2c',
                    fontSize: '20px'
                }}
            >
                {error.msg}
            </div>
    
    return <></>
}

/** 
    @param table 表名
    @param time_variables 类型为时间戳的时间变量变量
    @param properties 期望列
    @param duraction 期间ms
    @param height 容器高度px
    @returns JSX */
export function StreamingLine ({
    config: { table, time_variable, properties, duraction, username, password, height },
    onError,
    onSuccess
}: {
    config: LineConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const TIMESTAMP = new Date().getTime()
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Array<LineNodeType>>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const rddb = useRef<DDB>()
    const chart = useRef<EChartsType | null>(null)
    const options = useRef<any>(null)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    
    /** 订阅数据流表 */
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    /** 初始化图表 */
    useEffect(() => {
        // 初始化chart
        const container = document.getElementById(`line_container_${TIMESTAMP}`) as HTMLElement
        chart.current = echarts.init(container)
        options.current = {
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
        chart.current.setOption(options.current, true)
        // 创建一个观察器实例并传入回调函数
        const observer = new ResizeObserver(() => {
            chart.current.resize()
        })
        observer.observe(container)
        return () => {
            chart.current.dispose()
            observer.disconnect()
        }
    }, [ ])
    
    useEffect(() => {
        if (drawing && options.current) {
            options.current.dataset.source = pres_data
            chart.current!.setOption(options.current)
        }
    }, [pres_data])
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
    function filterData (data: Array<LineNodeType>, duraction: number) {
        let now_time = new Date().getTime()
        return data.filter(({ time: node_time }) => {
            return now_time - node_time < duraction
        })
    }
    // 存储数据
    function saveData (message: StreamingMessage) {
        // 格式化message
        let data_items = handleMessage2Data(message)
        if (!data_items)
            return
        // 筛选出小于当前时间的数据
        setPresData(pres_data => {
            return filterData([...pres_data, ...data_items], duraction)
        })
    }
    
    return <>
            <StreamingError error={error} />
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => { setDrawing(checked) }} />
            <div id={`line_container_${TIMESTAMP}`} style={{ width: '100%', height: '100%' }} />
            <span
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px'
                }}
            >{`已装填数据条数：${pres_data.length}`}</span>
        </>
}

/** 
    @param table 表名
    @param properties 期望展示的变量
    @param column 每行列数
    @param layout 布局方式
    @returns JSX */
export function StreamingSection ({
    config: { table, properties, column, username, password, layout },
    onError,
    onSuccess
}: {
    config: TableConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const [data, setData] = useState({ })
    const rddb = useRef<DDB | null>(null)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const properties_set = new Set(properties)
    
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
    
    function saveData (message: StreamingMessage) {
        let now_data = handleMessage2Data(message)
        setData({ ...now_data })
    }
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    return <>
            <StreamingError error={error} />
            <Descriptions layout={layout} title={table} bordered column={column || 3}>
                {properties.map(k => <Descriptions.Item key={k} label={k}>
                        {data[k] || '-'}
                    </Descriptions.Item>)}
            </Descriptions>
        </>
}

/** 
    @param table 表名
    @param properties 期望展示的变量
    @param max 可选，对象中最大值，不填则自动计算
    @param min 可选，对象中最小值，不填则自动计算
    @param sort 可选，DESC降序，ASC升序，不填则不排序
    @param column 可选，默认为3，每行展示数量
    @returns JSX */
export function StreamingHeatMap ({
    config: { table, properties, max: MAX, min: MIN, sort, column, username, password },
    onError,
    onSuccess
}: {
    config: HeatMapConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const rddb = useRef<DDB>()
    const [data, setData] = useState({ })
    const [max, setMax] = useState<number>(MAX || -Infinity)
    const [min, setMin] = useState<number>(MIN || Infinity)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const colors = [
        'rgb(237, 218, 158)',
        'rgb(230, 196, 148)',
        'rgb(223, 175, 137)',
        'rgb(216, 154, 127)',
        'rgb(210, 133, 117)',
        'rgb(205, 121, 109)',
        'rgb(199, 108, 101)',
        'rgb(194, 97, 94)',
        'rgb(189, 84, 86)',
        'rgb(184, 73, 78)'
    ]
    const properties_set = new Set(properties)
    
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    useEffect(() => {
        if (!MAX) {
            let currentMax = -Infinity
            for (let i in data) 
                currentMax = Math.max(currentMax, data[i])
            
            setMax(currentMax)
        }
        if (!MIN) {
            let currentMin = Infinity
            for (let i in data) 
                currentMin = Math.min(currentMin, data[i])
            
            setMin(currentMin)
        }
    }, [data])
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
    function saveData (message: StreamingMessage) {
        let now_data = handleMessage2Data(message)
        switch (sort) {
            case 'ASC':
                let data_asc = { }
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
    
    return <div
            style={{
                height: '100%'
            }}
        >
            <StreamingError error={error} />
            <Row
                style={{
                    height: '100%'
                }}
            >
                {((Object.keys(data).length && Object.keys(data)) || properties).map((key, i) => <Col key={key} span={24 / (column || 3)}>
                        <Card
                            bordered
                            style={{
                                height: '100%',
                                backgroundColor: `${
                                    data[key] - 0 <= max && data[key] - 0 >= min
                                        ? colors[Math.floor(((Number(data[key]) - min) * 9) / (max - min))]
                                        : data[key] - 0 > max
                                        ? colors[9]
                                        : colors[0]
                                }`,
                                transition: 'background-color .5s'
                            }}
                        >
                            <Statistic title={key} value={data[key] || '-'} />
                            <div
                                style={{
                                    transition: 'height .5s',
                                    position: 'absolute',
                                    right: '5%',
                                    bottom: '24px',
                                    width: '5px',
                                    // width: `${(Number(data[key]) - min) * 90 / (max - min) + 10}%`,
                                    height: `${
                                        data[key] - 0 <= max && data[key] - 0 >= min
                                            ? (((Number(data[key]) - min) * 0.9) / (max - min) + 0.1) * 68
                                            : data[key] - 0 > max
                                            ? 68
                                            : 6.8
                                    }px`,
                                    backgroundColor: '#eeeeee'
                                }}
                             />
                        </Card>
                    </Col>)}
            </Row>
        </div>
}

/** 
    @param table 表名
    @param properties 期望列
    @param animationDuration 动画变化时间ms（可选）
    @param height 容器高度px
    @param sort 排序方式（可选）
    @returns JSX */
export function StreamingSortBar ({
    config: { table, properties, sort, username, password, animationDuration, height },
    onError,
    onSuccess
}: {
    config: SortBarConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const TIMESTAMP = new Date().getTime()
    // 当前用于展示的图表数据信息
    const [data, setData] = useState<Record<string, string | number>>({ })
    const [drawing, setDrawing] = useState<boolean>(true)
    const rddb = useRef<DDB>()
    const chart = useRef(null)
    const options = useRef(null)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const properties_set = new Set(properties)
    
    /** 订阅数据流表 */
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    useEffect(() => {
        // 初始化chart
        const container = document.getElementById(`sort_bar_container_${TIMESTAMP}`)
        chart.current = echarts.init(container)
        options.current = {
            xAxis: {
                max: 'dataMax'
            },
            yAxis: {
                type: 'category',
                data: properties,
                inverse:
                    {
                        DESC: true,
                        ASC: false
                    }[sort] || true,
                animationDuration: 300,
                animationDurationUpdate: 300
                // max: 2 // only the largest 3 bars will be displayed
            },
            series: [
                {
                    realtimeSort: true,
                    type: 'bar',
                    data: [ ],
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
            animationDurationUpdate: animationDuration === undefined ? 1000 : animationDuration,
            animationEasing: 'linear',
            animationEasingUpdate: 'linear'
        }
        chart.current.setOption(options.current, true)
        // 创建一个观察器实例并传入回调函数
        const observer = new ResizeObserver(() => {
            chart.current.resize()
        })
        observer.observe(container)
        return () => {
            chart.current.dispose()
            observer.disconnect()
        }
    }, [ ])
    
    useEffect(() => {
        if (options.current && drawing) 
            chart.current.setOption({
                series: [
                    {
                        type: 'bar',
                        data: properties.map(key => data[key])
                    }
                ]
            })
        
    }, [data])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.colnames
        let data = { }
        message.data.value.forEach((item, index) => {
            if (item.rows > 0 && properties_set.has(keys[index]))
                data[keys[index]] = formati(item, item.rows - 1, undefined)
        })
        return data
    }
    function saveData (message: StreamingMessage) {
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
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => { setDrawing(checked) }} />
            <div id={`sort_bar_container_${TIMESTAMP}`} style={{ width: '100%', height: '100%' }} />
        </>
}

/** 
    @param table 表名
    @param time_variable 时间变量
    @param duraction x毫秒内数据
    @param opening_price_variable 开盘价
    @param closing_price_variable 收盘价
    @param maximum_price_variable 最高价
    @param minimum_price_variable 最低价
    @returns JSX */
export function StreamingKLine ({
    config: {
        table,
        username,
        password,
        time_variable,
        duraction,
        opening_price_variable,
        closing_price_variable,
        maximum_price_variable,
        minimum_price_variable,
        height
    },
    onError,
    onSuccess
}: {
    config: KLineConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const TIMESTAMP = new Date().getTime()
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Array<KLineNodeType>>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const rddb = useRef<DDB>()
    const chart = useRef(null)
    const options = useRef(null)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    
    /** 订阅数据流表 */
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    /** 初始化图表 */
    useEffect(() => {
        const container = document.getElementById(`k_line_container_${TIMESTAMP}`) as HTMLElement
        // 初始化chart
        options.current = {
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
                data: [ ],
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
                    data: [ ]
                }
            ]
        }
        chart.current.setOption(options.current, true)
        // 创建一个观察器实例并传入回调函数
        const observer = new ResizeObserver(() => {
            chart.current.resize()
        })
        observer.observe(container)
        return () => {
            chart.current.dispose()
            observer.disconnect()
        }
    }, [ ])
    
    useEffect(() => {
        if (drawing && options.current) {
            options.current.series[0].data = pres_data.map(item => [
                item[opening_price_variable],
                item[closing_price_variable],
                item[maximum_price_variable],
                item[minimum_price_variable]
            ])
            options.current.xAxis.data = pres_data.map(item => item[time_variable])
            chart.current.setOption(options.current)
        }
    }, [pres_data])
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        let keys = message.colnames
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
        let data = [ ]
        message.data.value.forEach((item, index) => {
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
    function filterData (data: Array<KLineNodeType>, duraction: number) {
        let now_time = new Date().getTime()
        return data.filter(({ time: node_time }) => {
            return now_time - node_time < duraction
        })
    }
    // 存储数据
    function saveData (message: StreamingMessage) {
        // 格式化message
        let data_items = handleMessage2Data(message)
        if (!data_items)
            return
        // 筛选出小于当前时间的数据
        setPresData(pres_data => {
            return filterData([...pres_data, ...data_items], duraction)
        })
    }
    
    return <>
            <StreamingError error={error} />
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => { setDrawing(checked) }} />
            <div id={`k_line_container_${TIMESTAMP}`} style={{ width: '100%', height: '100%' }} />
            {`已装填数据条数：${pres_data.length}`}
        </>
}

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
    config: { table, username, password, x_variable, y_variable, size_variable, color_variable, height, x_type, y_type },
    onError,
    onSuccess
}: {
    config: ScatterConfigType
    onError?: (res: string) => any
    onSuccess?: (err: string) => any
}) {
    const TIMESTAMP = new Date().getTime()
    // 当前用于展示的图表数据信息
    const [pres_data, setPresData] = useState<Array<KLineNodeType>>([ ])
    const [drawing, setDrawing] = useState<boolean>(true)
    const rddb = useRef<DDB | null>(null)
    const chart = useRef<EChartsType | null>(null)
    const options = useRef<any>(null)
    const [size_max, setSizeMax] = useState<number>(0)
    const [color_max, setColorMax] = useState<number>(0)
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    
    /** 订阅数据流表 */
    useConnectDDB(
        {
            username,
            password,
            table
        },
        { onSuccess, onError, setError, saveData }
    )
    
    /** 初始化图表 */
    useEffect(() => {
        const container = document.getElementById(`scatter_container_${TIMESTAMP}`) as HTMLElement
        // 初始化chart
        chart.current = echarts.init(container)
        options.current = {
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
                    data: [ ]
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
                                                                        ${x_variable}：${
                                                                            x_type === 'TIMESTAMP'
                                                                                ? dayjs(Number(value[0])).format('YYYY/MM/DD HH:mm:ss')
                                                                                : value[0]
                                                                        }<br>
                                                                            ${y_variable}：${value[1]}<br>
                                                                                ${size_variable ? `${size_variable}：${value[2]}<br>` : ''}
                                                                                ${color_variable ? `${color_variable}：${value[3]}<br>` : ''}
                                                                                `
                }
            }
        }
        chart.current.setOption(options.current, true)
        // 创建一个观察器实例并传入回调函数
        const observer = new ResizeObserver(() => {
            chart.current.resize()
        })
        observer.observe(container)
        return () => {
            chart.current.dispose()
            observer.disconnect()
        }
    }, [ ])
    
    useEffect(() => {
        if (drawing && options.current) {
            size_variable && (options.current.visualMap[0].max = size_max)
            color_variable && (options.current.visualMap[1].max = color_max)
            options.current.series[0].data = pres_data.map(item => [item[x_variable], item[y_variable], item[size_variable], item[color_variable]])
            chart.current!.setOption(options.current)
        }
    }, [pres_data])
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
    function saveData (message: StreamingMessage) {
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
            <Switch checkedChildren='开始绘制' unCheckedChildren='停止绘制' defaultChecked onChange={(checked: boolean) => { setDrawing(checked) }} />
            <div id={`scatter_container_${TIMESTAMP}`} style={{ width: '100%', height: '100%' }} />
            {`已装填数据条数：${pres_data.length}`}
        </>
}
