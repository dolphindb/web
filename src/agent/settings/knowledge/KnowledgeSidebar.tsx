import { Empty, Spin, Tooltip, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IKnowledgeBaseInfo } from '@/agent/model/types.ts'


const { Paragraph } = Typography


export function KnowledgeSidebar ({
    knowledge_bases,
    selected_kb_id,
    loading,
    on_select_kb,
    on_create_kb,
    on_refresh,
}: {
    knowledge_bases: IKnowledgeBaseInfo[]
    selected_kb_id: string
    loading: boolean
    on_select_kb: (kb: IKnowledgeBaseInfo) => void
    on_create_kb: () => void
    on_refresh: () => void
}) {
    const visible_kbs = knowledge_bases.filter(kb => kb.status !== 'DELETED')
    
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
        
        <div className='ai-settings-list-content rich'>
            {loading && visible_kbs.length === 0
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : visible_kbs.length === 0
                    ? <Empty description={t('暂无知识库')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 20 }} />
                    : visible_kbs.map(kb => {
                        const is_selected = kb.knowledgeBaseId === selected_kb_id
                        return <div
                            key={kb.knowledgeBaseId}
                            className={`ai-settings-list-item rich${is_selected ? ' active' : ''}`}
                            onClick={() => { on_select_kb(kb) }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
