import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { Descriptions, Button, Typography, Modal, Input, Space, Spin, Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined, ArrowLeftOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'

import useSWR from 'swr'


import { t } from '@i18n'
import { model } from '@model'
import { StatusTag, StatusType } from '@/components/tags/index.tsx'

import { Overview } from './Overview.tsx'
import { Checkpoints } from './Checkpoints.tsx'
import { Configuration } from './Configuration.tsx'
import { get_stream_graph_meta_list, get_stream_graph_meta } from './apis.ts'
import type { StreamGraphMeta } from './types.ts'
import { streaming_graph_status } from './Table.tsx'
import { sgraph } from './model.ts'


export function Graph () {
    const { name } = useParams()
    
    sgraph.name = name
    
    const { info } = sgraph.use(['name', 'info'])
    
    useEffect(() => {
        sgraph.set({ name })
        
        sgraph.get_stream_graph_info()
    }, [name])
    
    const { data: graphs } = useSWR<StreamGraphMeta[]>(
        'get_stream_graph_meta_list', 
        get_stream_graph_meta_list,
        {
            refreshInterval: 1000 * 30,
            revalidateOnFocus: true
        })
    
    if (!graphs)
        return null
    
    const graph = graphs?.find(graph => graph.fqn === name)
    
    if (!graph)
        return <Typography.Text type='danger'>{t('找不到流图 {{name}}', { name })}</Typography.Text>
    
    if (!info)
        return null
    
    return <div className='themed'>
        <TopDescription />
        
        <Tabs 
            defaultActiveKey='overview'
            items={[
                {
                    key: 'overview',
                    icon: <LineChartOutlined />,
                    label: t('概览'),
                    children: <Overview />
                },
                {
                    key: 'checkpoints',
                    icon: <CheckCircleOutlined />,
                    label: t('检查点'),
                    children: <Checkpoints />
                },
                {
                    key: 'configuration',
                    icon: <SettingOutlined />,
                    label: t('配置'),
                    children: <Configuration />
                }
            ]}
        />
    </div>
}


function TopDescription () {
    const { name } = sgraph
    
    const { data, error, mutate } = useSWR(
        ['get_stream_graph_meta', name],
        async () => get_stream_graph_meta(name),
        {
            refreshInterval: 1000 * 10,
            revalidateOnFocus: true,
            keepPreviousData: true
        })
    
    const [deleteModalVisible, setDeleteModalVisible] = useState(false)
    const [inputValue, setInputValue] = useState('')
    
    if (error)
        throw error
    
    if (!data)
        return null
    
    
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
    
    const { id: graph_id, fqn, status, createTime, semantics, reason } = data
    
    return <div>
        <div className='graph-detail-header'>
            <Button icon={<ArrowLeftOutlined />} onClick={async () => model.navigate(-1)}>
                {t('返回')}
            </Button>
            
            <div className='title'>{t('流图')} {name}</div>
            
            <div className='padding' />
            
            <Space>
                {render_actions(data)}
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => { mutate(undefined, { revalidate: true }) }}
                >
                    {t('刷新')}
                </Button>
            </Space>
        </div>
        
        <Descriptions
            bordered
            column={3}
            size='small'
            className='top-descriptions'
            
            items={[
                { label: t('流图 ID'), children: graph_id },
                { label: t('流图名称'), children: fqn },
                { label: t('流图状态'), children: <StatusTag status={status_map[status]}>{get_status_text(status)}</StatusTag> },
                { label: t('创建时间'), children: createTime ? new Date(createTime).to_formal_str() : '-' },
                { label: t('执行次数'), children: semantics },
                { label: t('失败原因'), children: reason },
            ]}
        />
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

