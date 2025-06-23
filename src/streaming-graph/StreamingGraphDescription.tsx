import { Descriptions, Button, Typography, Modal, Input, Space } from 'antd'
import useSWR from 'swr'
import { DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { useState } from 'react'

import { t } from '@i18n'

import { model } from '@model'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'


import { getStreamGraphMeta } from './apis.ts'
import { type StreamGraphMeta } from './types.ts'
import { streaming_graph_status } from './JobTable.tsx'

// Status mapping
const status_map = {
    building: StatusType.PARTIAL_SUCCESS,
    running: StatusType.SUCCESS,
    destroyed: StatusType.FAILED,
    error: StatusType.FAILED,
    failed: StatusType.FAILED,
    destroying: StatusType.PARTIAL_SUCCESS
}

interface StreamingGraphDescriptionProps {
    id: string
}

export function StreamingGraphDescription ({ id }: StreamingGraphDescriptionProps) {
    // Use useSWR to fetch streaming graph details
    const { data, error, mutate } = useSWR(['streamGraphs', id], async () => getStreamGraphMeta(id), {
        refreshInterval: 10000, // Refresh every 10 seconds
        revalidateOnFocus: true,
        keepPreviousData: true
    })
    
    const [deleteModalVisible, setDeleteModalVisible] = useState(false)
    const [inputValue, setInputValue] = useState('')
    
    // Get status display text
    function getStatusText (status: string) {
        return streaming_graph_status[status] || status
    }
    
    // Render action button
    function renderActions (graph: StreamGraphMeta) {
        const isActive = graph.status === 'running' || graph.status === 'building'
        
        return <>
                <Modal
                    className='computing-delete-modal'
                    title={
                        <div className='delete-warning-title'>
                            <WarningOutlined />
                            <span>
                                {t('确认删除流图')} <Typography.Text>{data.fqn}</Typography.Text> {t('吗？此操作不可恢复。')}
                            </span>
                        </div>
                    }
                    open={deleteModalVisible}
                    onCancel={() => {
                        setInputValue('')
                        setDeleteModalVisible(false)
                    }}
                    cancelButtonProps={{ className: 'hidden' }}
                    okText={t('删除流图')}
                    okButtonProps={{
                        disabled: inputValue !== 'YES',
                        danger: true
                    }}
                    onOk={async () => {
                        try {
                            await model.ddb.invoke('dropStreamGraph', [data.fqn])
                            model.message.success(t('删除流图成功'))
                            setInputValue('')
                            setDeleteModalVisible(false)
                            model.goto('/streaming-graph')
                        } catch (error) {
                            model.message.error(t('删除流图失败：') + error.message)
                        }
                    }}
                >
                    <Input
                        placeholder={t("请输入 'YES' 以确认该操作")}
                        value={inputValue}
                        onChange={({ target: { value } }) => {
                            setInputValue(value)
                        }}
                    />
                </Modal>
                <Button
                    icon={<DeleteOutlined />}
                    danger
                    disabled={!isActive}
                    size='small'
                    onClick={() => {
                        setDeleteModalVisible(true)
                    }}
                >
                    {t('删除流图')}
                </Button>
            </>
    }
    
    // if (isLoading || !data)
    //     return <Descriptions title='Streaming Graph Details' bordered size='small' />
    
    if (error || !data)
        return <Typography.Text type='danger'>
                {t('加载失败：')} {error?.message || 'Unknown error'}
            </Typography.Text>
        
    return <div>
            <Descriptions
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span>{t('流图详情')}</span>
                        <Space>
                            {renderActions(data)}
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    mutate(undefined, { revalidate: true })
                                }}
                                size='small'
                            >
                                {t('刷新')}
                            </Button>
                        </Space>
                    </div>
                }
                bordered
                column={3}
                size='small'
                className='compact-descriptions'
                style={{
                    marginBottom: '16px'
                }}
            >
                <Descriptions.Item label={t('流图 ID')}>{data.id}</Descriptions.Item>
                <Descriptions.Item label={t('流图名称')}>{data.fqn}</Descriptions.Item>
                <Descriptions.Item label={t('流图状态')}>
                    <StatusTag status={status_map[data.status]}>{getStatusText(data.status)}</StatusTag>
                </Descriptions.Item>
                <Descriptions.Item label={t('创建时间')}>{data.createTime ? new Date(data.createTime).toLocaleString() : '-'}</Descriptions.Item>
                <Descriptions.Item label={t('执行次数')}>{data.semantics}</Descriptions.Item>
                <Descriptions.Item label={t('失败原因')}>{data.reason}</Descriptions.Item>
            </Descriptions>
        </div>
}
