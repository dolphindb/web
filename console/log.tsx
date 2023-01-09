import './log.sass'

import { default as React, useEffect, useRef, useState } from 'react'
import { Pagination, Button, message, Modal, Result } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { t } from '../i18n/index.js'
import { model, NodeType } from './model.js'

const default_length = 50000n

const colors = {
    ERROR: '#cf2525',
    WARNING: '#b98317'
} as const

export function Log () {
    const { node_alias, node_type, logined } = model.use(['node_alias', 'node_type', 'logined'])
    
    const ref = useRef<HTMLDivElement>()
    
    const [log_length, set_log_length] = useState<bigint>(0n)
    const [logs, set_logs] = useState<string[]>([])
    const [index, set_index] = useState(1)
    
    const [show_login_required_info, set_show_login_required_info] = useState(false)
    
    useEffect(() => {
        // 数据节点需要登录
        if (!logined && node_type === NodeType.data_node) 
            set_show_login_required_info(true)
         else 
            init()
    }, [ ])
    
    async function init () {
        set_index(1)
        try {
            const temp = await get_log_length()
            const offset = temp > default_length ? temp - default_length : BigInt(0)
            const length = temp > default_length ? default_length : temp
            await get_log(length, offset)
        } catch (error) {
            Modal.error({ title: error.message })
            throw error
        }
    }
    
    async function get_log (length: bigint, offset: bigint) {
        set_logs(await model.get_server_log(offset, length))
    }
    
    async function get_log_length () {
        const len = await model.get_server_log_length()
        set_log_length(len)
        return len
    }
    
    return <div className='list'>
        <div className='log-title'>
            <div className='log-name'>
                {node_alias} {t('日志')} ({Number(log_length).to_fsize_str()})
            </div>
            <div className='space' />
            {!show_login_required_info && (
                <div>
                    <Button
                        icon={<ReloadOutlined/>}
                        onClick={async () => {
                            await init()
                            message.success(t('日志刷新成功'))
                    }}>{t('刷新')}</Button>
                </div>
            )}
        </div>
        {
            show_login_required_info ? (
                <Result
                    status='warning'
                    className='log-login-interceptor'
                    title={t('登录后可查看当前节点日志')}
                    extra={
                        <Button type='primary' onClick={() => model.goto_login()}>
                            {t('去登录')}
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className='log-block' ref={ref}>
                        {logs.map((line, i) => {
                            let log_type: string
                            const start = line.indexOf('<')
                            const end = line.indexOf('>', start)
                            if (start !== -1 && end !== -1)
                                log_type = line.substring(start + 1, end)
                            return (
                                <div className='log-line' style={colors[log_type] ? { color: colors[log_type] } : null} key={`${index}.${i}`}>
                                    {line}
                                </div>
                            )
                        })}
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
                </>
            )
        }
    </div>
}
