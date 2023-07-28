import { Descriptions } from 'antd'
import { DDB, formati, StreamingData } from 'dolphindb/browser.js'
import React from 'react'
import { useRef, useState } from 'react'
import { use_streaming } from './hooks/use-streaming.js'
import StreamingError from './StreamingError.js'
import { ErrorType, TableConfigType } from './types.js'

/** 
    @param table 表名
    @param properties 期望展示的变量
    @param column 每行列数
    @param layout 布局方式
    @returns JSX */
export default function StreamingSection ({
    config: { table, properties, column, username, password, layout, url },
    onError
}: {
    config: TableConfigType
    onError?: (res: string) => any
}) {
    const [data, setData] = useState({ })
    const [error, setError] = useState<ErrorType>({
        appear: false,
        msg: ''
    })
    const properties_set = new Set(properties)
    
    // 用于处理数据格式
    function handleMessage2Data (message: StreamingData): any {
        let keys = message.colnames
        let data = { }
        message.data.value.forEach((item, index) => {
            if (item.rows && item.rows > 0 && properties_set.has(keys[index]))
                data[keys[index]] = formati(item, item.rows - 1, undefined)
        })
        return data
    }
    
    function onReceivedStreamingData (message: StreamingData) {
        let now_data = handleMessage2Data(message)
        setData({ ...now_data })
    }
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
    
    return <>
            <StreamingError error={error} />
            <Descriptions layout={layout} title={table} bordered column={column || 3}>
                {properties.map(k => <Descriptions.Item key={k} label={k}>
                        {data[k] || '-'}
                    </Descriptions.Item>)}
            </Descriptions>
        </>
}
