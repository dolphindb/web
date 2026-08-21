import { useMemo, useState } from 'react'
import { Empty, Input, Spin, Tag, Tooltip, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IKnowledgeBaseInfo } from '@/agent/model.ts'
import { get_kb_status_color, get_kb_status_label } from './types.ts'


const { Paragraph } = Typography


export function KnowledgeSidebar ({
    knowledge_bases,
    selected_kb_id,
    loading,
    on_select_kb,
    on_create_kb,
    on_open_rerank,
    on_refresh,
}: {
    knowledge_bases: IKnowledgeBaseInfo[]
    selected_kb_id: string
    loading: boolean
    on_select_kb: (kb: IKnowledgeBaseInfo) => void
    on_create_kb: () => void
    on_open_rerank: () => void
    on_refresh: () => void
}) {
    const [search_text, set_search_text] = useState('')
    
    const visible_kbs = knowledge_bases.filter(kb => kb.status !== 'DELETED')
    
    const filtered_kbs = useMemo(() => {
        const query = search_text.trim().toLowerCase()
        if (!query)
            return visible_kbs
        return visible_kbs.filter(kb =>
            kb.name.toLowerCase().includes(query) ||
            kb.knowledgeBaseId.toLowerCase().includes(query) ||
            (kb.description && kb.description.toLowerCase().includes(query))
        )
    }, [visible_kbs, search_text])
    
    return <div className='ai-settings-list-sidebar'>
        <div className='ai-settings-list-title'>
            <span className='ai-settings-list-title-text'>{t('知识库管理')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Tooltip title={t('刷新')}>
                    <button
                        type='button'
                        className='ai-settings-list-title-action'
                        aria-label={t('刷新')}
                        disabled={loading}
                        onClick={on_refresh}
                    >
                        <ReloadOutlined spin={loading} />
                    </button>
                </Tooltip>
                <Tooltip title={t('全局 Rerank')}>
                    <button
                        type='button'
                        className='ai-settings-list-title-action'
                        aria-label={t('全局 Rerank')}
                        onClick={on_open_rerank}
                    >
                        <SettingOutlined />
                    </button>
                </Tooltip>
                <Tooltip title={t('新建知识库')}>
                    <button
                        type='button'
                        className='ai-settings-list-title-action'
                        aria-label={t('新建知识库')}
                        onClick={on_create_kb}
                    >
                        <PlusOutlined />
                    </button>
                </Tooltip>
            </div>
        </div>
        
        {visible_kbs.length > 4 && <div style={{ padding: '0 0 6px' }}>
            <Input
                size='small'
                placeholder={t('搜索知识库...')}
                prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />}
                value={search_text}
                onChange={e => { set_search_text(e.target.value) }}
                allowClear
            />
        </div>}
        
        <div className='ai-settings-list-content rich'>
            {loading && visible_kbs.length === 0
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : filtered_kbs.length === 0
                    ? <Empty description={t('暂无知识库')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 20 }} />
                    : filtered_kbs.map(kb => {
                        const is_selected = kb.knowledgeBaseId === selected_kb_id
                        return <div
                            key={kb.knowledgeBaseId}
                            className={`ai-settings-list-item rich${is_selected ? ' active' : ''}`}
                            onClick={() => { on_select_kb(kb) }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span
                                    title={kb.name}
                                    style={{
                                        fontWeight: 500,
                                        fontSize: 13,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }}
                                >
                                    {kb.name}
                                </span>
                                <Tag color={get_kb_status_color(kb.status)} style={{ margin: 0, fontSize: 11, flexShrink: 0 }}>
                                    {get_kb_status_label(kb.status)}
                                </Tag>
                            </div>
                            {kb.description && <Paragraph
                                type='secondary'
                                style={{ fontSize: 11, margin: '2px 0 0' }}
                                ellipsis={{ rows: 2, tooltip: kb.description }}
                            >
                                {kb.description}
                            </Paragraph>}
                        </div>
                    })
            }
        </div>
    </div>
}
