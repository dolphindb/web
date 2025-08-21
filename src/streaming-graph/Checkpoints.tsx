import { Descriptions, Typography, Empty, Card, Tabs, Tooltip } from 'antd'
import useSWR from 'swr'

import { t } from '@i18n'

import { StatusTag, StatusType } from '@components/tags/index.tsx'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { get_checkpoint_config, get_checkpoint_job_info, get_checkpoint_subjob_info } from './apis.ts'
import { sgraph } from './model.ts'


const { Text } = Typography

// Status mapping for tag colors
const status_map = {
    success: StatusType.SUCCESS,
    failed: StatusType.FAILED
}


export function Checkpoints () {
    const { name } = sgraph
    
    const { data: jobData, error: jobError, isLoading: jobLoading } = useSWR(['getCheckpointJobInfo', name], async () => get_checkpoint_job_info(name))
    
    const {
        data: subjobData,
        error: subjobError,
        isLoading: subjobLoading
    } = useSWR(['getCheckpointSubjobInfo', name], async () => get_checkpoint_subjob_info(name))
    
    const {
        data: configData,
        error: configError,
        isLoading: configLoading
    } = useSWR(['getCheckpointConfig', name], async () => get_checkpoint_config(name))
    
    
    function render_job_tab () {
        if (jobLoading)
            return <Card loading />
        
        if (jobError)
            return <Text type='danger'>
                    {t('加载作业信息失败：')} {jobError.message}
                </Text>
        
        if (!jobData || !Array.isArray(jobData) || jobData.length === 0)
            return <Empty description={t('没有作业数据')} />
        
        return <DDBTable
            dataSource={jobData.map(item => ({ ...item, key: item.checkpointId }))}
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
    
    function render_subjob_tab () {
        if (subjobLoading)
            return <Card loading />
        if (subjobError)
            return <Text type='danger'>
                    {t('加载子作业信息失败：')} {subjobError.message}
                </Text>
        if (!subjobData || !Array.isArray(subjobData) || subjobData.length === 0)
            return <Empty description={t('没有子作业数据')} />
        
        // Ensure each row has a unique key by combining checkpoint and subjob IDs
        const dataWithKeys = subjobData.map(item => ({
            ...item,
            key: `${item.checkpointId}-${item.subjobId}`
        }))
        
        return <DDBTable
                dataSource={dataWithKeys}
                columns={subjob_columns}
                rowKey='key'
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
    
    
    function render_config_tab () {
        if (configLoading)
            return <Card loading />
        
        if (configError)
            return <Text type='danger'>Failed to load configuration: {configError.message}</Text>
        
        if (!configData || Object.keys(configData).length === 0)
            return <Empty description={t('没有配置数据')} />
        
        return <Descriptions bordered size='small' column={1}>
                {Object.entries(configData).map(([key, value]) => <Descriptions.Item key={key} label={key}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Descriptions.Item>)}
            </Descriptions>
    }
    
    
    return <div className='streaming-config-container'>
        <Tabs
            defaultActiveKey='job' 
            items={[
                {
                    label: t('作业'),
                    key: 'job',
                    children: render_job_tab()
                },
                {
                    label: t('子作业'),
                    key: 'subjob',
                    children: render_subjob_tab()
                },
                {
                    label: t('检查点配置'),
                    key: 'config',
                    children: render_config_tab()
                }
            ]}
        />
    </div>
}


// SubJob table columns
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


// Safe timestamp comparison helper for sorting
function compare_timestamps (a, b) {
    // Handle cases where timestamps might be null/undefined/invalid
    const timeA = a ? new Date(a).getTime() : 0
    const timeB = b ? new Date(b).getTime() : 0
    
    // If both are invalid (0), maintain original order
    if (timeA === 0 && timeB === 0)
        return 0
    // Sort nulls/invalid dates to the end
    if (timeA === 0)
        return 1
    if (timeB === 0)
        return -1
    // Normal comparison
    return timeA - timeB
}

