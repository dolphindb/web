import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { Descriptions, Button, Typography, Modal, Input, Space, Tabs, Result } from 'antd'
import { LineChartOutlined, CheckCircleOutlined, SettingOutlined, ArrowLeftOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'

import { use_modal } from 'react-object-model/hooks.js'

import { t } from '@i18n'
import { model } from '@model'
import { StatusTag, StatusType } from '@components/tags/index.tsx'

import { sgraph, graph_statuses } from './model.ts'

import { Overview } from './Overview.tsx'
import { Checkpoints } from './Checkpoints.tsx'
import { Configuration } from './Configuration.tsx'


export function Graph () {
    const { name } = useParams()
    
    sgraph.name = name
    
    const { graph, graph_loading } = sgraph.use(['name', 'graph', 'graph_loading'])
    
    useEffect(() => {
        sgraph.set({ name })
        
        sgraph.get_graph()
    }, [name])
    
    if (!graph && graph_loading)
        return null
    
    if (!graph)
        return <Result
            className='not-exist'
            status='warning'
            title={t('流图 {{name}} 不存在', { name })}
            extra={<Button type='primary' onClick={() => { model.goto('/streaming-graph/') }}>返回列表</Button>}
        />
    
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
    const {
        name,
        graph: { meta: { id, status, createTime, semantics, reason } }
    } = sgraph.use(['name', 'graph'])
    
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
                            sgraph.get_graph(),
                            sgraph.get_subscription_stats(),
                            sgraph.get_publish_stats()
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
                { label: t('流图状态'), children: <StatusTag status={status_map[status]}>{graph_statuses[status] || status}</StatusTag> },
                { label: t('创建时间'), children: createTime ? new Date(createTime.replace('T', ' ')).to_formal_str() : '-' },
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

