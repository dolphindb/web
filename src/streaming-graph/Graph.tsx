import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { Descriptions, Button, Typography, Modal, Input, Space, Tabs } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined, ArrowLeftOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '@i18n'
import { model } from '@model'
import { StatusTag, StatusType } from '@/components/tags/index.tsx'

import { Overview } from './Overview.tsx'
import { Checkpoints } from './Checkpoints.tsx'
import { Configuration } from './Configuration.tsx'
import type { StreamGraphMeta } from './model.ts'
import { streaming_graph_status } from './Table.tsx'
import { sgraph } from './model.ts'


export function Graph () {
    const { name } = useParams()
    
    sgraph.name = name
    
    const { graphs, graph } = sgraph.use(['name', 'graphs', 'graph'])
    
    useEffect(() => {
        sgraph.set({ name })
        
        if (!sgraph.graphs)
            sgraph.get_graphs()
        
        sgraph.get_graph()
    }, [name])
    
    if (!graphs)
        return null
    
    const meta = graphs?.find(({ fqn }) => fqn === name)
    
    if (!meta)
        return <Typography.Text type='danger'>{t('找不到流图 {{name}}', { name })}</Typography.Text>
        
    if (!graph)
        return null
    
    return <div className='themed'>
        <TopDescription meta={meta} />
        
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


function TopDescription ({
    meta: { id, fqn: name, status, createTime, semantics, reason }
}: {
    meta: StreamGraphMeta
}) {
    let modal = use_modal()
    
    const [input_value, set_input_value] = useState('')
    
    const active = status === 'running' || status === 'building'
    
    return <div>
        <div className='graph-detail-header'>
            <Button icon={<ArrowLeftOutlined />} onClick={async () => model.navigate(-1)}>
                {t('返回')}
            </Button>
            
            <div className='title'>{t('流图')} {name}</div>
            
            <div className='padding' />
            
            <Space>
                <Modal
                    className='computing-delete-modal'
                    title={
                        <div className='delete-warning-title'>
                            <WarningOutlined />
                            <span>
                                {t('确认删除流图')} <Typography.Text>{name}</Typography.Text> {t('吗？此操作不可恢复。')}
                            </span>
                        </div>
                    }
                    open={modal.visible}
                    onCancel={() => {
                        set_input_value('')
                        modal.close()
                    }}
                    cancelButtonProps={{ className: 'hidden' }}
                    okText={t('删除流图')}
                    okButtonProps={{
                        disabled: input_value !== 'YES',
                        danger: true
                    }}
                    onOk={async () => {
                        try {
                            await model.ddb.invoke('dropStreamGraph', [name])
                            model.message.success(t('删除流图成功'))
                            set_input_value('')
                            modal.close()
                            model.goto('/streaming-graph')
                        } catch (error) {
                            model.modal.error({
                                title: t('删除流图失败'),
                                content: error.message
                            })
                        }
                    }}
                >
                    <Input
                        placeholder={t("请输入 'YES' 以确认该操作")}
                        value={input_value}
                        onChange={({ target: { value } }) => {
                            set_input_value(value)
                        }}
                    />
                </Modal>
                
                <Button
                    icon={<DeleteOutlined />}
                    danger
                    disabled={!active}
                    onClick={modal.open}
                >
                    {t('删除流图')}
                </Button>
                
                <Button
                    icon={<ReloadOutlined />}
                    onClick={async () => {
                        await Promise.all([
                            sgraph.get_graphs(),
                            sgraph.get_graph(),
                            sgraph.get_publish_stats(),
                            sgraph.get_subscription_stats()
                        ])
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
            className='top-descriptions'
            
            items={[
                { label: t('流图 ID'), children: id },
                { label: t('流图名称'), children: name },
                { label: t('流图状态'), children: <StatusTag status={status_map[status]}>{streaming_graph_status[status] || status}</StatusTag> },
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

