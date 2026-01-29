import './index.scss'
import useSWR from 'swr'

import { useCallback, useMemo, useState } from 'react'
import { Form, Popconfirm, Result, Select, Typography } from 'antd'


import { genid } from 'xshell/utils.browser'

import { DdbLong } from 'dolphindb/browser'

import { sum, uniq } from 'lodash'

import dayjs from 'dayjs'

import { t } from '@i18n'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { upper } from '@utils'

import { model, NodeType } from '@/model.ts'
import { Unlogin } from '@/components/Unlogin.tsx'

interface SessionItem {
    userId: string
    sessionId?: bigint
    memSize: bigint
    node: string
    remoteIP: string
    remotePort?: string
    createTime: string
    lastActiveTime?: string
    type: 'system' | 'user'
}


const controller_script = `nodes=exec name from rpc(getControllerAlias(),getClusterPerf) where mode not in (1,2) and state=1
if (count(nodes)>1){
    nodesSessionMemoryStat=pnodeRun(getSessionMemoryStat,nodes)
}
else{
    nodesSessionMemoryStat = table(1:0,\`userId\`sessionId\`memSize\`remoteIP\`remotePort\`createTime\`lastActiveTime\`node,["STRING","LONG","LONG","IPADDR","INT","TIMESTAMP","timestamp","STRING"])
}
crtSessionMemoryStat=rpc(getControllerAlias(),getSessionMemoryStat)
update crtSessionMemoryStat set node=getControllerAlias()
nodesSessionMemoryStat.append!(crtSessionMemoryStat)
nodesSessionMemoryStat
` 

interface FilterFormValues {
    type: 'all' | 'system' | 'user'
    /** 仅控制节点可选择节点筛选 */
    nodes?: string[]
}


export function SessionManagement () {
    
    const { admin, logined, node_type } = model.use(['admin', 'logined', 'node_type'])
    
    const [form] = Form.useForm<FilterFormValues>()
    
    /** 控制节点展所有节点的 session 信息，其他节点仅展示当前节点的 session 信息 */
    const is_controller = node_type === NodeType.controller
    const [filter, set_filter] = useState<FilterFormValues>({ type: 'all' })
    
    
    const { data = [ ], isLoading, mutate } = useSWR(
        admin ? 'session_list' : null,
        async () => {
            const res = is_controller 
                ? await model.ddb.execute<SessionItem[]>(controller_script)
                : await model.ddb.invoke<SessionItem[]>('getSessionMemoryStat')
            const data = (res ?? [ ]).map(item => ({
                ...item,    
                type: item.sessionId ? 'user' as const : 'system' as const
            }))
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
    
    const filter_data = useMemo(() => {
        const { type = 'all', nodes = [ ] } = filter
        
        return data.filter(item => {
            // 类型过滤
            if (type !== 'all' && item.type !== type)
                return false
            
            // 节点过滤（仅控制节点需要）
            if (is_controller && nodes.length > 0 && !nodes.includes(item.node))
                return false
            
            return true
        })
    }, [data, filter, is_controller])
    
    
    
     
    if (!logined)
        return <Unlogin info={t('会话管理')} />
    
    if (!admin)
        return <Result status='warning' title={t('仅管理员可使用会话管理功能')}/>
   
    
    return <div className='session-management'>
        <DDBTable 
            className='session-management-table'
            filter_form={
                <>
                    <Form initialValues={{ type: 'all' }} layout='inline' form={form} onValuesChange={(_, values) => { set_filter(values) } }>
                        <Form.Item name='type' label={t('会话类型')}>
                            <Select 
                                className='session-form-select' 
                                defaultValue='all'
                                options={[
                                    { label: t('所有会话'), value: 'all' },
                                    { label: t('系统缓存'), value: 'system' }, 
                                    { label: t('用户会话'), value: 'user' }
                                ]}
                            />
                        </Form.Item>
                        {is_controller && <Form.Item name='nodes' label={t('节点')}>
                            <Select 
                                allowClear
                                className='session-form-select' 
                                mode='multiple'
                                options={ uniq(data.map(item => item.node)).map(node => ({ label: node, value: node }))}
                            />
                        </Form.Item>}
                    </Form>
                   
                
                <div className='session-summary'>
                    {t('共 {{count}} 条会话，总占用内存 {{memory}}', { count: filter_data.length, memory: upper(sum(filter_data.map(item => Number(item.memSize))).to_fsize_str()) })}
                </div>
            </>
            }
            title={t('会话管理')}
            scroll={{ x: '100%', y: 'calc(100vh - 280px)' }}
            rowKey={() => genid()}
            loading={isLoading}
            dataSource={filter_data} 
            pagination={{
                defaultPageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
            }}
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
                    width: 200,
                    ellipsis: true,
                    render: (value: bigint) =>  value ? value.toString() : null
                },
                {
                    title: t('占用内存'),
                    dataIndex: 'memSize',
                    width: 180,
                    render: (value: bigint) =>  upper(Number(value).to_fsize_str()),
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
                },
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
