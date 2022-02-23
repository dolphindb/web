import './log.sass'

import { default as React, useEffect, useRef, useState } from 'react'
import { Pagination, Button, message } from 'antd'

import { t } from '../i18n'
import { model } from './model'

const default_length = 40000n

export function Log () {
    const ref = useRef<HTMLDivElement>()
    
    const [log_length, set_log_length] = useState<bigint>(0n)
    const [logs, set_logs] = useState<string[]>([])
    const [index, set_index] = useState(1)
    
    useEffect(() => {
        init()
    }, [ ])
    
    async function init () {
        set_index(1)
        const temp = await get_log_length()
        const offset = temp > default_length ? temp - default_length : BigInt(0)
        const length = temp > default_length ? default_length : temp
        await get_log(length, offset)
    }
    
    async function get_log (length: bigint, offset: bigint) {
        set_logs(
            await model.get_server_log(offset, length)
        )
    }
    
    async function get_log_length () {
        const len = await model.get_server_log_length()
        set_log_length(len)
        return len
    }
    
    return <>
        <div className='button-row'>
            <Button onClick={async () => {
                try {
                    await init()
                    message.success(t('日志刷新成功'))
                } catch {
                    message.error(t('日志刷新失败'))
                }
            }}>{t('刷新')}</Button>
        </div>
        <div className='list'>
            <div className='log-title'>{t('日志')} ({Number(log_length).to_fsize_str()})</div>
            <div className='log-block' ref={ref}>
                {logs.map((line, i) =>
                    <div className='log-line' key={`${index}.${i}`}>{line}</div>
                )}
            </div>
            <Pagination
                className='log-pagination'
                current={index}
                showQuickJumper
                showSizeChanger={false}
                onChange={(page, page_size) => {
                    // 重新设置当前显示的 log
                    const t = log_length - BigInt(page) * default_length
                    const offset = t > 0 ? t : 0n
                    const length = t > 0 ? default_length : default_length + t
                    get_log(length, offset)
                    set_index(page)
                    
                    // log 滑动条滑动到顶端
                    ref.current?.scrollTo(0, 0)
                }}
                pageSize={1}
                total={Math.ceil(Number(log_length) / Number(default_length))}
            />
        </div>
    </>
}

export default Log
