import { useEffect, useState } from 'react'
import { Button, Empty, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IKnowledgeBaseConfig, IKnowledgeBaseInfo, IKnowledgeGenerationInfo, ILlmConfig } from '@/agent/model.ts'
import { chat_model } from '@/agent/model.ts'
import { get_kb_status_color, get_kb_status_label } from './types.ts'
import { IndexBuildModal } from './IndexBuildModal.tsx'


const { Text } = Typography


export function GenerationsTab ({
    kb,
    embedding_configs,
    on_rebuild_success,
}: {
    kb: IKnowledgeBaseInfo
    embedding_configs: ILlmConfig[]
    on_rebuild_success?: () => void
}) {
    const [generations, set_generations] = useState<IKnowledgeGenerationInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    const [build_modal_visible, set_build_modal_visible] = useState(false)
    const [building, set_building] = useState(false)
    
    async function load () {
        set_loading(true)
        try {
            const items = await chat_model.knowledge.list_generations(kb.knowledgeBaseId)
            set_generations(items)
        } catch {
            message.error(t('加载索引版本列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load()
    }, [kb.knowledgeBaseId])
    
    async function handle_build_index (config?: IKnowledgeBaseConfig) {
        set_building(true)
        try {
            await chat_model.knowledge.build_index(kb.knowledgeBaseId, config)
            message.success(t('已触发新索引 Generation 构建任务'))
            set_build_modal_visible(false)
            await load()
            on_rebuild_success?.()
        } finally {
            set_building(false)
        }
    }
    
    return <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                {t('知识库的物理索引版本（Generation）。修改参数或重建时会生成新版本并异步激活。')}
            </Text>
            <Space size={8}>
                <Tooltip title={t('刷新')}>
                    <Button size='small' icon={<ReloadOutlined />} onClick={load} />
                </Tooltip>
                <Button
                    type='primary'
                    size='small'
                    icon={<PlusOutlined />}
                    disabled={kb.status !== 'ACTIVE'}
                    onClick={() => { set_build_modal_visible(true) }}
                >
                    {t('构建新索引')}
                </Button>
            </Space>
        </div>
        
        <Table
            size='small'
            rowKey='generationId'
            loading={loading}
            dataSource={generations}
            pagination={false}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无索引版本')} /> }}
            columns={[
                {
                    title: 'Generation ID',
                    dataIndex: 'generationId',
                    render: (id: string, record: IKnowledgeGenerationInfo) => (
                        <div>
                            <Text strong style={{ fontSize: 12 }}>{id}</Text>
                            {record.generationId === kb.activeGenerationId && <Tag color='blue' style={{ marginLeft: 6 }}>{t('当前')}</Tag>}
                        </div>
                    ),
                },
                {
                    title: t('状态'),
                    dataIndex: 'status',
                    width: 100,
                    render: (status: string) => <Tag color={get_kb_status_color(status)}>{get_kb_status_label(status)}</Tag>,
                },
                {
                    title: t('触发类型'),
                    dataIndex: 'triggerType',
                    width: 130,
                    render: (type: string) => {
                        if (type === 'INITIAL_BUILD')
                            return <Tag>{t('初始构建')}</Tag>
                        if (type === 'CONFIG_CHANGE')
                            return <Tag color='purple'>{t('配置变更')}</Tag>
                        if (type === 'MANUAL_REBUILD')
                            return <Tag color='cyan'>{t('手动重建')}</Tag>
                        return type || '-'
                    },
                },
                {
                    title: t('文档 / Chunk'),
                    width: 120,
                    render: (_: unknown, record: IKnowledgeGenerationInfo) => (
                        <Text style={{ fontSize: 12 }}>
                            {record.documentCount ?? 0} {t('篇')} / {record.chunkCount ?? 0} {t('块')}
                        </Text>
                    ),
                },
                {
                    title: t('配置概要'),
                    render: (_: unknown, record: IKnowledgeGenerationInfo) => {
                        const cfg = record.config
                        if (!cfg)
                            return '-'
                        const emb = cfg.embeddingRef?.resolvedModel || cfg.embeddingRef?.source || 'builtin'
                        const parser = cfg.textIndex?.parser || 'mixed'
                        const chunk = cfg.chunking?.maxChunkChars ? `${cfg.chunking.maxChunkChars}字` : ''
                        return <Text type='secondary' style={{ fontSize: 12 }}>
                            {emb} · {parser} · {chunk}
                        </Text>
                    },
                },
                {
                    title: t('创建时间'),
                    dataIndex: 'createTime',
                    width: 160,
                    render: (time: string) => <Text type='secondary' style={{ fontSize: 12 }}>{time ? new Date(time).toLocaleString() : '-'}</Text>,
                },
            ]}
        />
        
        <IndexBuildModal
            visible={build_modal_visible}
            kb={kb}
            embedding_configs={embedding_configs}
            loading={building}
            on_close={() => { set_build_modal_visible(false) }}
            on_submit={handle_build_index}
        />
    </div>
}
