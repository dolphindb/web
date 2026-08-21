import { useEffect, useState } from 'react'
import { Button, Empty, Popconfirm, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { RedoOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IKnowledgeBaseInfo, IKnowledgeJobInfo } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import { format_browser_time } from '@/agent/dolphinx/common.tsx'
import { get_job_type_label, get_kb_status_color, get_kb_status_label } from './types.ts'


const { Text } = Typography


export function JobsTab ({ kb }: { kb: IKnowledgeBaseInfo }) {
    const [jobs, set_jobs] = useState<IKnowledgeJobInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    const [operating_job_id, set_operating_job_id] = useState('')
    
    async function load () {
        set_loading(true)
        try {
            const items = await chat_model.knowledge.list_jobs({ knowledgeBaseId: kb.knowledgeBaseId })
            set_jobs(items)
        } catch {
            message.error(t('加载后台任务列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load()
    }, [kb.knowledgeBaseId])
    
    async function retry_job (job: IKnowledgeJobInfo) {
        set_operating_job_id(job.jobId)
        try {
            await chat_model.knowledge.retry_job(job.jobId)
            message.success(t('已触发任务重试'))
            await load()
        } catch (err: any) {
            message.error(err.message || t('重试任务失败'))
        } finally {
            set_operating_job_id('')
        }
    }
    
    async function cancel_job (job: IKnowledgeJobInfo) {
        set_operating_job_id(job.jobId)
        try {
            await chat_model.knowledge.cancel_job(job.jobId)
            message.success(t('已请求取消任务'))
            await load()
        } catch (err: any) {
            message.error(err.message || t('取消任务失败'))
        } finally {
            set_operating_job_id('')
        }
    }
    
    return <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                {t('文档导入、分块解析、索引构建和清理等后台异步任务。')}
            </Text>
            <Tooltip title={t('刷新')}>
                <Button size='small' icon={<ReloadOutlined />} onClick={load} />
            </Tooltip>
        </div>
        
        <Table
            size='small'
            rowKey='jobId'
            loading={loading}
            dataSource={jobs}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无任务')} /> }}
            columns={[
                {
                    title: 'Job ID',
                    dataIndex: 'jobId',
                    render: (id: string, record: IKnowledgeJobInfo) => <div style={{ minWidth: 0 }}>
                            <Text strong style={{ fontSize: 12 }} ellipsis={{ tooltip: id }}>{id}</Text>
                            {record.documentFileName && <Text type='secondary' style={{ fontSize: 11, display: 'block' }} ellipsis={{ tooltip: record.documentFileName }}>
                                {record.documentFileName}
                            </Text>}
                        </div>,
                },
                {
                    title: t('类型'),
                    dataIndex: 'jobType',
                    width: 120,
                    render: (type: string) => <Tag color='blue'>{get_job_type_label(type)}</Tag>,
                },
                {
                    title: t('状态'),
                    dataIndex: 'status',
                    width: 100,
                    render: (status: string) => <Tag color={get_kb_status_color(status)}>{get_kb_status_label(status)}</Tag>,
                },
                {
                    title: t('阶段'),
                    dataIndex: 'stage',
                    width: 130,
                    render: (stage: string) => <Text style={{ fontSize: 12 }}>{stage || '-'}</Text>,
                },
                {
                    title: t('重试次数'),
                    width: 90,
                    render: (_: unknown, record: IKnowledgeJobInfo) => <Text type='secondary' style={{ fontSize: 12 }}>
                            {record.attempt ?? 0}/{record.maxAttempts ?? 3}
                        </Text>,
                },
                {
                    title: t('创建时间'),
                    dataIndex: 'createTime',
                    width: 160,
                    render: (time: string) => <Text type='secondary' style={{ fontSize: 12 }}>{format_browser_time(time)}</Text>,
                },
                {
                    title: t('操作'),
                    width: 90,
                    render: (_: unknown, record: IKnowledgeJobInfo) => {
                        const can_retry = record.allowedActions?.includes('RETRY') === true
                        const can_cancel = record.allowedActions?.includes('CANCEL') === true
                        return <Space size={4}>
                            {can_retry && <Tooltip title={t('重试任务')}>
                                <Button
                                    size='small'
                                    type='text'
                                    icon={<RedoOutlined />}
                                    loading={operating_job_id === record.jobId}
                                    onClick={() => { retry_job(record) }}
                                />
                            </Tooltip>}
                            {can_cancel && <Popconfirm
                                title={t('确定取消该任务？')}
                                onConfirm={() => { cancel_job(record) }}
                            >
                                <Button
                                    size='small'
                                    danger
                                    type='text'
                                    icon={<StopOutlined />}
                                    loading={operating_job_id === record.jobId}
                                />
                            </Popconfirm>}
                        </Space>
                    },
                },
            ]}
        />
    </div>
}
