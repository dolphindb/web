import { Empty, Spin, Tag, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { ILlmConfig, ILlmProvider } from '@/agent/model/types.ts'


export function ProviderSidebar ({
    providers,
    configs,
    selected_provider_id,
    loading,
    on_create_provider,
    on_select_provider,
}: {
    providers: ILlmProvider[]
    configs: ILlmConfig[]
    selected_provider_id: string
    loading: boolean
    on_create_provider: () => void
    on_select_provider: (p: ILlmProvider) => void
}) {
    return <div className='ai-settings-list-sidebar'>
        <div className='ai-settings-list-title'>
            <span className='ai-settings-list-title-text'>{t('模型管理')}</span>
            <Tooltip title={t('新建 Provider')}>
                <button
                    type='button'
                    className='ai-settings-list-title-action'
                    aria-label={t('新建 Provider')}
                    onClick={on_create_provider}
                >
                    <PlusOutlined />
                </button>
            </Tooltip>
        </div>
        <div className='ai-settings-list-subtitle' title={t('选择需要管理的 Provider')}>{t('选择需要管理的 Provider')}</div>
        <div className='ai-settings-list-content rich'>
            {loading
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : providers.length === 0
                    ? <Empty description={t('暂无 Provider')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    : providers.map(p => {
                        const count = configs.filter(c => c.providerId === p.providerId).length
                        return <div
                            key={p.providerId}
                            className={`ai-settings-list-item rich${p.providerId === selected_provider_id ? ' active' : ''}`}
                            onClick={() => { on_select_provider(p) }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                                <span
                                    title={p.name}
                                    style={{ fontWeight: 500, fontSize: 13, minWidth: 0, maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                    {p.name}
                                </span>
                                <Tag style={{ fontSize: 11, flexShrink: 0 }}>{p.adapterType}</Tag>
                                {p.enabled === false && <Tag color='default' style={{ fontSize: 11 }}>{t('禁用')}</Tag>}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.baseUrl || t('未配置 Base URL')}
                            </div>
                            <div style={{ fontSize: 12, color: '#1677ff', marginTop: 2 }}>
                                {t('模型数: {{count}}', { count })}
                            </div>
                        </div>
                    })
            }
        </div>
    </div>
}
