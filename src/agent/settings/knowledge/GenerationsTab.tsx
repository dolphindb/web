import { useEffect, useState } from 'react'
import { Button, Empty, Table, Tag, Tooltip, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'
import type { IKnowledgeBaseInfo, IKnowledgeGenerationInfo } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import { format_browser_time } from '@/agent/dolphinx/common.tsx'
import { get_kb_status_color, get_kb_status_label } from './types.ts'


const { Text } = Typography


export function GenerationsTab ({ kb }: {
    kb: IKnowledgeBaseInfo
}) {
    const [generations, set_generations] = useState<IKnowledgeGenerationInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    
    async function load () {
        set_loading(true)
        try {
            const items = await chat_model.knowledge.list_generations(kb.knowledgeBaseId)
            set_generations(items)
        } catch {
            model.message?.error(t('加载索引版本列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load()
    }, [kb.knowledgeBaseId])
    
    return <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                {t('知识库的历史索引版本记录。修改参数或重建索引时会自动构建新版本并在就绪后激活。')}
            </Text>
            <Tooltip title={t('刷新')}>
                <Button size='small' icon={<ReloadOutlined />} onClick={() => { load() }} />
            </Tooltip>
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
                    title: t('版本 ID'),
                    dataIndex: 'generationId',
                    render: (id: string, record: IKnowledgeGenerationInfo) => <div>
                            <Text strong style={{ fontSize: 12 }}>{id}</Text>
                            {record.generationId === kb.activeGenerationId && <Tag color='blue' style={{ marginLeft: 6 }}>{t('当前')}</Tag>}
                        </div>,
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
                    width: 170,
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
                    render: (_: unknown, record: IKnowledgeGenerationInfo) => <Text style={{ fontSize: 12 }}>
                            {record.documentCount ?? 0} {t('篇')} / {record.chunkCount ?? 0} {t('块')}
                        </Text>,
                },
                {
                    title: t('配置概要'),
                    render: (_: unknown, record: IKnowledgeGenerationInfo) => {
                        const cfg = record.config
                        if (!cfg)
                            return '-'
                        const emb = cfg.embeddingRef?.resolvedModel || cfg.embeddingRef?.source || 'builtin'
                        const parser = cfg.textIndex?.parser || 'mixed'
                        const chunk = cfg.chunking?.maxChunkChars ? `${cfg.chunking.maxChunkChars} ${t('字符')}` : ''
                        return <Text type='secondary' style={{ fontSize: 12 }}>
                            {emb} · {parser} · {chunk}
                        </Text>
                    },
                },
                {
                    title: t('创建时间'),
                    dataIndex: 'createTime',
                    width: 160,
                    render: (time: string) => <Text type='secondary' style={{ fontSize: 12 }}>{format_browser_time(time)}</Text>,
                },
            ]}
        />
    </div>
}
