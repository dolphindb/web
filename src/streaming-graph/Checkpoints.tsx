import { useEffect } from 'react'
import { Descriptions, Empty, Tabs, Tooltip } from 'antd'

import { t } from '@i18n'

import { StatusTag, StatusType } from '@components/tags/index.tsx'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { sgraph } from './model.ts'



export function Checkpoints () {
    return <div className='streaming-config-container'>
        <Tabs
            defaultActiveKey='job' 
            items={[
                {
                    label: t('作业'),
                    key: 'job',
                    children: <JobTab />
                },
                {
                    label: t('子作业'),
                    key: 'subjob',
                    children: <SubJobTab />
                },
                {
                    label: t('检查点配置'),
                    key: 'config',
                    children: <Config />
                }
            ]}
        />
    </div>
}


function Config () {
    const { name, checkpoint_config: config } = sgraph.use(['name', 'checkpoint_config'])
    
    useEffect(() => {
        sgraph.get_checkpoint_config()
    }, [name])
    
    if (!config)
        return null
    
    if (!Object.keys(config).length)
        return <Empty description={t('没有配置数据')} />
    
    return <Descriptions bordered size='small' column={1}>
        {Object.entries(config)
            .map(([key, value]) => 
                <Descriptions.Item key={key} label={key}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Descriptions.Item>)}
    </Descriptions>
}


function JobTab () {
    const { name, jobs } = sgraph.use(['name', 'jobs'])
    
    useEffect(() => {
        sgraph.get_checkpoint_jobs()
    }, [name])
    
    if (!jobs)
        return null
    
    if (!jobs.length)
        return <Empty description={t('没有作业数据')} />
    
    return <DDBTable
        dataSource={jobs.map(item => ({ ...item, key: item.checkpointId }))}
        columns={job_columns}
        rowKey='checkpointId'
        size='small'
        scroll={{ x: 'max-content' }}
        pagination={{
            defaultPageSize: 10,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true
        }}
    />
}


const job_columns = [
    { title: t('检查点 ID'), dataIndex: 'checkpointId', key: 'checkpointId' },
    { title: t('作业 ID'), dataIndex: 'jobId', key: 'jobId' },
    {
        title: t('创建时间'),
        dataIndex: 'createdTimeStamp',
        key: 'createdTimeStamp',
        sorter: (a, b) => compare_timestamps(a.createdTimeStamp, b.createdTimeStamp)
    },
    {
        title: t('结束时间'),
        dataIndex: 'finishedTimeStamp',
        key: 'finishedTimeStamp',
        sorter: (a, b) => compare_timestamps(a.finishedTimeStamp, b.finishedTimeStamp)
    },
    {
        title: t('状态', { context: 'streaming-graph' }),
        dataIndex: 'status',
        key: 'status',
        render: status => <StatusTag status={status_map[status]}>{status}</StatusTag>
    },
    {
        title: t('额外信息'),
        dataIndex: 'extra',
        key: 'extra',
        render: extra => (extra ? <Tooltip title={extra}>{extra}</Tooltip> : '-')
    }
]



function SubJobTab () {
    const { name, subjobs } = sgraph.use(['name', 'subjobs'])
    
    useEffect(() => {
        sgraph.get_checkpoint_subjobs()
    }, [name])
    
    if (!subjobs)
        return null
    
    if (subjobs.length === 0)
        return <Empty description={t('没有子作业数据')} />
    
    return <DDBTable
            dataSource={subjobs}
            columns={subjob_columns}
            rowKey={({ checkpointId, subjobId }) => `${checkpointId}-${subjobId}`}
            size='small'
            scroll={{ x: 'max-content' }}
            pagination={{
                defaultPageSize: 10,
                pageSizeOptions: ['5', '10', '20', '50', '100'],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true
            }}
        />
    
}


const subjob_columns = [
    { title: t('检查点 ID'), dataIndex: 'checkpointId', key: 'checkpointId' },
    { title: t('作业 ID'), dataIndex: 'jobId', key: 'jobId' },
    { title: t('子作业 ID'), dataIndex: 'subjobId', key: 'subjobId' },
    {
        title: t('收到第一个 Barrier 的时刻'),
        dataIndex: 'firstBarrierArrTs',
        key: 'firstBarrierArrTs',
        sorter: (a, b) => compare_timestamps(a.firstBarrierArrTs, b.firstBarrierArrTs)
    },
    {
        title: t('Barrier 对齐的时刻'),
        dataIndex: 'barrierAlignTs',
        key: 'barrierAlignTs',
        sorter: (a, b) => compare_timestamps(a.barrierAlignTs, b.barrierAlignTs)
    },
    {
        title: t('转发 Barrier 时刻'),
        dataIndex: 'barrierForwardTs',
        key: 'barrierForwardTs',
        sorter: (a, b) => compare_timestamps(a.barrierForwardTs, b.barrierForwardTs)
    },
    {
        title: t('状态', { context: 'streaming-graph' }),
        dataIndex: 'status',
        key: 'status',
        render: status => <StatusTag status={status_map[status]}>{status}</StatusTag>
    },
    {
        title: t('下游订阅偏移量'),
        dataIndex: 'downstreamSubscribeOffsets',
        key: 'downstreamSubscribeOffsets'
    },
    {
        title: t('快照元数据'),
        dataIndex: 'snapshotMeta',
        key: 'snapshotMeta',
        render: meta => (meta ? <Tooltip title={JSON.stringify(meta)}>{JSON.stringify(meta)}</Tooltip> : '-')
    },
    {
        title: t('额外信息'),
        dataIndex: 'extra',
        key: 'extra',
        render: extra => (extra ? <Tooltip title={extra}>{extra}</Tooltip> : '-')
    }
]


function compare_timestamps (a, b) {
    // Handle cases where timestamps might be null/undefined/invalid
    const timeA = a ? new Date(a).getTime() : 0
    const timeB = b ? new Date(b).getTime() : 0
    
    if (timeA === 0 && timeB === 0)
        return 0
    if (timeA === 0)
        return 1
    if (timeB === 0)
        return -1
    
    return timeA - timeB
}


// 状态映射到标签颜色
const status_map = {
    success: StatusType.SUCCESS,
    failed: StatusType.FAILED
}
