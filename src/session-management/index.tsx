import './index.scss'
import useSWR from 'swr'

import { useCallback, useMemo } from 'react'
import { Popconfirm, Result, Table, Tabs, Typography, type TableColumnProps } from 'antd'

import { t } from '@i18n/index.ts'


import { genid } from 'xshell/utils.browser'

import { DdbLong } from 'dolphindb/browser'

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
}


const node_column: TableColumnProps<SessionItem> = {
    title: t('节点'),
    dataIndex: 'node',
    width: 150,
    fixed: 'left'
}

const common_columns = [
    {
        title: t('会话占用内存'),
        dataIndex: 'memSize',
        width: 150,
        render: (value: bigint) => value?.toString()
    },
    {
        title: t('客户端 IP'),
        dataIndex: 'remoteIP',
        width: 150
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
    },
    {
        title: t('最近一次执行时间'),
        dataIndex: 'lastActiveTime',
        width: 200
    },
]

export function SessionManagement () {
    
    const { admin, logined, node_type } = model.use(['admin', 'logined', 'node_type'])
    
    /** 控制节点展所有节点的 session 信息，其他节点仅展示当前节点的 session 信息 */
    const is_controller = node_type === NodeType.controller
    
    const { data = [ ], isLoading, mutate } = useSWR(
        admin ? 'session_list' : null,
        async () => {
            const { data } = is_controller 
                ? await model.ddb.execute<{ data: SessionItem[] }>('pnodeRun(getSessionMemoryStat)')
                : await model.ddb.invoke<{ data: SessionItem[] }>('getSessionMemoryStat')
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
     
    return <Tabs 
        type='card'
        tabBarExtraContent={<Typography.Link 
            href='https://docs.dolphindb.cn/zh/funcs/g/getSessionMemoryStat.html'
            target='_blank'
        >
            {t('文档说明')}
        </Typography.Link>}
        items={[{
            label: t('用户会话'),
            key: 'user-session',
            children: <Table 
                rowKey={() => genid()}
                loading={isLoading}
                dataSource={data.filter(item => !!item.sessionId)} 
                columns={[
                    ...(is_controller ? [node_column] : [ ]),
                    {
                        title: t('用户 ID'),
                        dataIndex: 'userId',
                        width: 150,
                    },
                    {
                        title: t('会话 ID'),
                        dataIndex: 'sessionId',
                        width: 150,
                        render: (value: bigint) => value?.toString()
                    },
                    ...common_columns,
                    {
                        title: t('操作'),
                        fixed: 'right',
                        width: 100,
                        render: (_, session) => <Popconfirm 
                            title={t('确定要关闭此会话（ID: {{id}}）吗？', { id: session.sessionId })}
                            onConfirm={async () => on_close_session(session)}
                            okButtonProps={{ danger: true }}
                        >
                            <Typography.Link type='danger'>{t('关闭')}</Typography.Link>
                        </Popconfirm>
                    }]
                }
            /> },
            {
                label: t('缓存占用情况'),
                key: 'other-session',
                children: <Table 
                    loading={isLoading}
                    rowKey={() => genid()}
                    dataSource={data.filter(item => !item.sessionId)}
                    columns={[
                        ...(is_controller ? [node_column] : [ ]),
                        {
                            title: t('缓存类型'),
                            dataIndex: 'userId',
                            width: 150,
                        },
                        ...common_columns,
                ]}
                />
            }
        ]}/>
}
