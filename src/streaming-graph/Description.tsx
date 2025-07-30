import { Descriptions, Button, Typography, Modal, Input, Space } from 'antd'
import useSWR from 'swr'
import { ArrowLeftOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { useState } from 'react'

import { t } from '@i18n'

import { model } from '@model'

import { StatusTag, StatusType } from '@/components/tags/index.tsx'


import { get_stream_graph_meta } from './apis.ts'
import { type StreamGraphMeta } from './types.ts'
import { streaming_graph_status } from './JobTable.tsx'


export function Description ({ id }: { id: string }) {
    const { data, error, mutate } = useSWR(
        ['streamGraphs', id],
        async () => get_stream_graph_meta(id),
        {
            refreshInterval: 1000 * 10,
            revalidateOnFocus: true,
            keepPreviousData: true
        })
    
    const [deleteModalVisible, setDeleteModalVisible] = useState(false)
    const [inputValue, setInputValue] = useState('')
    
    function get_status_text (status: string) {
        return streaming_graph_status[status] || status
    }
    
    
    function render_actions (graph: StreamGraphMeta) {
        const active = graph.status === 'running' || graph.status === 'building'
        
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
                disabled={!active}
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
            {t('加载失败：')} {error?.message || t('未知错误')}
        </Typography.Text>
    
    return <div>
        <div className='graph-detail-header'>
            <Button icon={<ArrowLeftOutlined />} onClick={async () => model.navigate(-1)}>
                {t('返回')}
            </Button>
            
            <div className='title'>{t('流图详情')}</div>
            
            <div className='padding' />
            
            <Space>
                {render_actions(data)}
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                        mutate(undefined, { revalidate: true })
                    }}
                >
                    {t('刷新')}
                </Button>
            </Space>
        </div>
        
        <Descriptions
            bordered
            column={3}
            size='small'
            className='compact-descriptions'
            style={{ marginBottom: '10px' }}
        >
            <Descriptions.Item label={t('流图 ID')}>{data.id}</Descriptions.Item>
            <Descriptions.Item label={t('流图名称')}>{data.fqn}</Descriptions.Item>
            <Descriptions.Item label={t('流图状态')}>
                <StatusTag status={status_map[data.status]}>{get_status_text(data.status)}</StatusTag>
            </Descriptions.Item>
            <Descriptions.Item label={t('创建时间')}>{data.createTime ? new Date(data.createTime).to_formal_str() : '-'}</Descriptions.Item>
            <Descriptions.Item label={t('执行次数')}>{data.semantics}</Descriptions.Item>
            <Descriptions.Item label={t('失败原因')}>{data.reason}</Descriptions.Item>
        </Descriptions>
    </div>
}


const status_map = {
    building: StatusType.PARTIAL_SUCCESS,
    running: StatusType.SUCCESS,
    destroyed: StatusType.FAILED,
    error: StatusType.FAILED,
    failed: StatusType.FAILED,
    destroying: StatusType.PARTIAL_SUCCESS
} as const
