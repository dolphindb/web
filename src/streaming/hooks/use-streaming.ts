import { useEffect } from 'react'
import { DDB, type StreamingMessage } from 'dolphindb/browser.js'

export function use_streaming (
    {
        url,
        username,
        password,
        table
    }: {
        url: string | undefined
        username: string
        password: string
        table: string
    },
    { onSuccess, onError, onReceivedStreamingData }: Record<string, ((...args: any) => any) | undefined>
) {
    useEffect(() => {
        // 订阅流数据
        const rddb = new DDB(url, {
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
                    onReceivedStreamingData && onReceivedStreamingData(message)
                }
            }
        })
        ;(async () => {
            try {
                await rddb.connect()
                onSuccess && onSuccess()
            } catch (e) {
                onError && onError(e)
            }
        })()
        return () => {
            rddb.disconnect()
        }
    }, [url, table, password, username])
}
