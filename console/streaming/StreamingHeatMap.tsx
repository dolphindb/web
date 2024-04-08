import { Card, Col, Row, Statistic } from 'antd'
import { formati, type StreamingMessage } from 'dolphindb/browser.js'
import React, { useMemo, useEffect, useRef, useState } from 'react'

import { use_streaming } from './hooks/use-streaming.js'
import { StreamingError } from './StreamingError.js'
import { type ErrorType, type HeatMapConfigType } from './types.js'

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

/** 
    @param table 表名
    @param properties 期望展示的变量
    @param max 可选，对象中最大值，不填则自动计算
    @param min 可选，对象中最小值，不填则自动计算
    @param sort 可选，DESC降序，ASC升序，不填则不排序
    @param column 可选，默认为3，每行展示数量
    @returns JSX */
export function StreamingHeatMap ({
    config: { table, properties, max: MAX, min: MIN, sort, column, username, password, url },
    onError
}: {
    config: HeatMapConfigType
    onError?: (res: string) => any
}) {
    const [data, setData] = useState({ })
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    
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
    const [min, max] = useMemo(() => {
        let currentMax = -Infinity,
            currentMin = Infinity
        if (!MAX) 
            for (let i in data) 
                currentMax = Math.max(currentMax, data[i])
            
        
        if (!MIN) 
            for (let i in data) 
                currentMin = Math.min(currentMin, data[i])
            
        
        return [MIN || currentMin, MAX || currentMax]
    }, [data])
    // 用于计算颜色(数值转化为颜色)
    function calculateColor (val) {
        val = Number(val)
        return val <= max && val >= min ? colors[Math.floor(((val - min) * 9) / (max - min))] : val > max ? colors[9] : colors[0]
    }
    
    // 用于计算高度
    function calculateHeight (val) {
        val = Number(val)
        return val <= max && val >= min ? (((val - min) * 0.9) / (max - min) + 0.1) * 68 : val - 0 > max ? 68 : 6.8
    }
    
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingMessage): any {
        const properties_set = new Set(properties)
        const keys = message.colnames
        const data = { }
        message.data.value.forEach((item, index) => {
            if (item.rows && item.rows > 0 && properties_set.has(keys[index]))
                data[keys[index]] = formati(item, item.rows - 1, undefined)
        })
        console.log(data)
        return data
    }
    function onReceivedStreamingData (message: StreamingMessage) {
        let now_data = handleMessage2Data(message)
        switch (sort) {
            case 'ASC':
                let data_asc = { }
                let order_asc = Object.keys(now_data).sort((a, b) => now_data[a] - now_data[b])
                for (let k of order_asc)
                    data_asc[k] = now_data[k]
                setData(data_asc)
                break
            case 'DESC':
                let data_desc = { }
                let order_desc = Object.keys(now_data).sort((a, b) => now_data[b] - now_data[a])
                for (let k of order_desc)
                    data_desc[k] = now_data[k]
                setData(data_desc)
                break
            default:
                setData(now_data)
        }
    }
    
    return <div className='streaming_heat_map'>
            <StreamingError error={error} />
            <Row>
                {((Object.keys(data).length && Object.keys(data)) || properties).map((key, i) => <Col key={key} span={24 / (column || 3)}>
                        <Card
                            bordered
                            style={{
                                backgroundColor: calculateColor(data[key])
                            }}
                        >
                            <Statistic title={key} value={data[key] || '-'} />
                            <div
                                className='heat_map_bar'
                                style={{
                                    height: calculateHeight(data[key])
                                }}
                             />
                        </Card>
                    </Col>)}
            </Row>
        </div>
}
