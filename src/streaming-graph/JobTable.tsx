import { useState } from 'react'

import { Typography, Tooltip, type TableColumnsType } from 'antd'

import useSWR from 'swr'

import { t } from '@i18n'

import { StatusTag, StatusType } from '@components/tags/index.tsx'
import { DDBTable } from '@components/DDBTable/index.tsx'

import { model } from '@model'

import { get_stream_graph_meta_list } from './apis.ts'
import type { StreamGraphMeta, StreamGraphStatus } from './types.ts'


const { Text } = Typography

// 定义状态映射
const status_map = {
    building: StatusType.PARTIAL_SUCCESS,
    running: StatusType.SUCCESS,
    destroyed: StatusType.FAILED,
    error: StatusType.FAILED,
    failed: StatusType.FAILED,
    destroying: StatusType.PARTIAL_SUCCESS
} as const

export const streaming_graph_status: Record<StreamGraphStatus, string> = {
    building: t('构建中'),
    running: t('运行中'),
    error: t('错误'),
    failed: t('失败'),
    destroying: t('销毁中'),
    destroyed: t('已销毁')
}

const default_status_filters = Object.keys(status_map).filter(key => key !== 'destroyed') as StreamGraphStatus[]


// 定义表格列
const columns: TableColumnsType<StreamGraphMeta> = [
    {
        title: t('流图名称'),
        dataIndex: 'fqn',
        key: 'fqn',
        render: (text: string, record: StreamGraphMeta) => <Typography.Link
                ellipsis
                style={{ color: '#1890ff', cursor: 'pointer' }}
                onClick={() => {
                    model.goto(`/streaming-graph/${record.id}`)
                }}
            >
                {text || '-'}
            </Typography.Link>
    },
    {
        title: t('创建者'),
        dataIndex: 'owner',
        key: 'owner',
        render: (text: string) => <Text>{text || '-'}</Text>
    },
    {
        title: t('创建时间'),
        dataIndex: 'createTime',
        key: 'createTime',
        sorter: (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
        render: (time: string) => (time ? new Date(time).to_str() : '-')
    },
    {
        title: t('数据执行次数'),
        dataIndex: 'semantics',
        key: 'semantics',
        render: (semantics: string) => <Text>{semantics}</Text>
    },
    {
        title: t('任务数量'),
        key: 'tasks',
        render: (_, record) => {
            const total = record.tasks.length || 0
            const running = record.tasks.filter(task => task.status === 'running').length
            
            return <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title={t('总任务数')}>
                        <div
                            style={{
                                backgroundColor: '#333',
                                color: 'white',
                                padding: '2px 8px',
                                marginRight: '4px'
                            }}
                        >
                            {total}
                        </div>
                    </Tooltip>
                    
                    {running > 0 && (
                        <Tooltip title={t('运行中任务数')}>
                            <div
                                style={{
                                    backgroundColor: '#52c41a',
                                    color: 'white',
                                    padding: '2px 8px',
                                }}
                            >
                                {running}
                            </div>
                        </Tooltip>
                    )}
                </div>
        }
    },
    {
        title: t('状态', { context: 'streaming_flow' }),
        dataIndex: 'status',
        key: 'status',
        
        sorter: (a: StreamGraphMeta, b: StreamGraphMeta) =>
            status_orders[a.status] - status_orders[b.status],

        defaultFilteredValue: default_status_filters,

        filters: Object.entries(streaming_graph_status)
            .map(([key, text]) => ({ text, value: key })),
        
        filterResetToDefaultFilteredValue: true,
        
        render: (_, { status }) => 
            <StatusTag status={status_map[status]}>{streaming_graph_status[status] || status}</StatusTag>,
    }
]


const status_orders = {
    running: 0,
    building: 1,
    error: 2,
    failed: 3,
    destroying: 4,
    destroyed: 5
} as const


export function JobTable () {
    const [status_filters, set_status_filters] = useState<StreamGraphStatus[]>(default_status_filters)
    
    // 使用 useSWR 获取流计算图数据
    const { data: streamGraphs, isLoading } = useSWR('streamGraphs', get_stream_graph_meta_list, {
        refreshInterval: 30000, // 每30秒刷新一次
        revalidateOnFocus: true
    })
    
    return <div className='job-table-container themed'>
        <DDBTable
            title={
                <>
                    <Tooltip title={t('流图列表')}>{t('流图列表')}</Tooltip> (
                    {streamGraphs?.filter(graph => graph.status === 'running').length || 0} {t('个')}
                    {t('运行中')})
                </>
            }
            columns={columns}
            dataSource={
                (streamGraphs && status_filters?.length ?
                    streamGraphs.filter(
                        graph => status_filters.includes(graph.status))
                :
                    streamGraphs) || 
                [ ]
            }
            rowKey='id'
            loading={isLoading}
            scroll={{ x: 'max-content' }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                hideOnSinglePage: true,
            }}
            onChange={(pagination, filters, sorter, { action }) => {
                if (action === 'filter')
                    set_status_filters(filters.status as StreamGraphStatus[])
            }}
        />
    </div>
}
