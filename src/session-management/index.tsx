import './index.scss'
import useSWR from 'swr'

import { useCallback, useState } from 'react'
import { Popconfirm, Result, Select, Typography } from 'antd'


import { genid } from 'xshell/utils.browser'

import { DdbLong } from 'dolphindb/browser'

import { sum } from 'lodash'

import dayjs from 'dayjs'

import { t } from '@i18n'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { model, NodeType } from '@/model.ts'
import { Unlogin } from '@/components/Unlogin.tsx'

interface SessionFilterFormValues {
    type?: 'all' | 'system' | 'user'
    remoteIP?: string[]
}

interface SessionItem {
    userId: string
    sessionId?: bigint
    memSize: bigint
    node: string
    remoteIP: string
    remotePort?: string
    createTime: string
    lastActiveTime?: string
}

export function SessionManagement () {
    
    const { admin, logined, node_type } = model.use(['admin', 'logined', 'node_type'])
    
    /** 控制节点展所有节点的 session 信息，其他节点仅展示当前节点的 session 信息 */
    const is_controller = node_type === NodeType.controller
    const [filtered_data, set_filtered_data] = useState<SessionItem[]>([ ])
    
    const { data = [ ], isLoading, mutate } = useSWR(
        admin ? 'session_list' : null,
        async () => {
            const res = is_controller 
                ? await model.ddb.execute<SessionItem[]>(`
                    nodes=exec name from rpc(getControllerAlias(),getClusterPerf) where mode not in (1,2) and state=1
                    nodesSessionMemoryStat=pnodeRun(getSessionMemoryStat,nodes)
                    crtSessionMemoryStat=rpc(getControllerAlias(),getSessionMemoryStat)
                    update crtSessionMemoryStat set node=getControllerAlias()
                    nodesSessionMemoryStat.append!(crtSessionMemoryStat)
                `)
                : await model.ddb.invoke<SessionItem[]>('getSessionMemoryStat')
            const data = res.map(item => ({
                ...item,
                type: item.sessionId ? 'user' : 'system'
            }))
            set_filtered_data(data)
            return data
        }
    )
    
    const on_close_session = useCallback(async (session: SessionItem) => {
        if (is_controller)
            await model.ddb.eval(`rpc("${session.node}",closeSessions{${session.sessionId}})`)
        else
            await model.ddb.call('closeSessions', [new DdbLong(session.sessionId)])
        model.message.success(t('会话（ID: {{id}}）关闭成功', { id: session.sessionId.toString() }))
        mutate()
    }, [ ])
    
     
    if (!logined)
        return <Unlogin info={t('会话管理')} />
    
    if (!admin)
        return <Result status='warning' title='仅管理员可使用会话管理功能'/>
   
    
    return <div className='session-management'>
        <DDBTable 
            className='session-management-table'
            filter_form={
                <>
                   {t('会话类型：')}
                   <Select 
                        onSelect={type => {
                            if (['system', 'user'].includes(type))
                                set_filtered_data(data.filter(item => item.type === type))
                            else
                                set_filtered_data(data)
                        }}
                        className='session-form-select' 
                        defaultValue='all'
                        options={[
                            { label: t('所有会话'), value: 'all' },
                            { label: t('系统缓存'), value: 'system' }, 
                            { label: t('用户会话'), value: 'user' }
                        ]}
                    />
                
                <div className='session-summary'>
                    {t('共 {{count}} 条会话，总占用内存 {{memory}}', { count: filtered_data.length, memory: sum(filtered_data.map(item => Number(item.memSize))).to_fsize_str() })}
                </div>
            </>
                
            }
            title={t('会话管理')}
            scroll={{ x: '100%', y: 'calc(100vh - 220px)' }}
            rowKey={() => genid()}
            loading={isLoading}
            dataSource={filtered_data} 
            columns={[
                ...(is_controller ? [{
                    title: t('节点'),
                    dataIndex: 'node',
                    width: 200,
                    ellipsis: true,
                }] : [ ]),
                {
                    title: t('系统缓存/用户会话'),
                    dataIndex: 'userId',
                    width: 200,
                    ellipsis: true,
                },
                {
                    title: t('会话 ID'),
                    dataIndex: 'sessionId',
                    width: 150,
                    ellipsis: true,
                    render: (value: bigint) =>  value ? value.toString() : null
                },
                {
                    title: t('占用内存'),
                    dataIndex: 'memSize',
                    width: 180,
                    render: (value: bigint) => value?.to_fsize_str(),
                    sorter: (a: SessionItem, b: SessionItem) => Number(a.memSize - b.memSize),
                },
                {
                    title: t('客户端 IP'),
                    dataIndex: 'remoteIP',
                    width: 150,
                },
                {
                    title: t('客户端端口号'),
                    dataIndex: 'remotePort',
                    width: 150,
                },
                {
                    title: t('会话创建时间'),
                    dataIndex: 'createTime',
                    width: 200,
                    showSorterTooltip: false,
                    sorter: (a: SessionItem, b: SessionItem) => dayjs(a.createTime).valueOf() - dayjs(b.createTime).valueOf()
                },
                {
                    title: t('最近一次执行时间'),
                    dataIndex: 'lastActiveTime',
                    width: 200,
                    showSorterTooltip: false,
                    sorter: (a: SessionItem, b: SessionItem) => dayjs(a.lastActiveTime).valueOf() - dayjs(b.lastActiveTime).valueOf()
                },,
                {
                    title: t('操作'),
                    fixed: 'right',
                    width: 100,
                    render: (_, session) => session.sessionId ? <Popconfirm 
                        title={t('确定要关闭此会话（ID: {{id}}）吗？', { id: session.sessionId })}
                        onConfirm={async () => on_close_session(session)}
                        okButtonProps={{ danger: true }}
                    >
                        <Typography.Link type='danger'>{t('关闭')}</Typography.Link>
                    </Popconfirm> : null
                }]
            }
        /> 
    </div>
}
