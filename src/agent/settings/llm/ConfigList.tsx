import { Button, Empty, Popconfirm, Space, Tag, Tooltip } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { ILlmConfig } from '@/agent/model/types.ts'


export function ConfigList ({
    configs,
    provider_enabled,
    on_create_config,
    on_edit_config,
    on_disable_config,
    on_enable_config,
    on_delete_config,
}: {
    configs: ILlmConfig[]
    provider_enabled: boolean
    on_create_config: () => void
    on_edit_config: (cfg: ILlmConfig) => void
    on_disable_config: (cfg: ILlmConfig) => Promise<void>
    on_enable_config: (cfg: ILlmConfig) => Promise<void>
    on_delete_config: (cfg: ILlmConfig) => Promise<void>
}) {
    return <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{t('关联模型配置') + ` (${configs.length})`}</div>
            <Button size='small' icon={<PlusOutlined />} disabled={!provider_enabled} onClick={on_create_config}>
                {t('新增模型')}
            </Button>
        </div>
        {configs.length === 0
            ? <Empty description={t('暂无模型，请点击「关联模型配置」右侧的「新增模型」添加')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : configs.map(cfg =>
                <div key={cfg.llmConfigId} className='ai-settings-data-row' style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                            <span title={cfg.name} style={{ fontWeight: 500, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cfg.name}
                            </span>
                            <Tag style={{ marginLeft: 8, fontSize: 11 }} color={cfg.capability === 'embedding' ? 'purple' : 'blue'}>
                                {cfg.capability || 'chat'}
                            </Tag>
                            <Tag
                                style={{ fontSize: 11 }}
                                color={cfg.enabled !== false ? 'green' : 'default'}
                            >
                                {cfg.enabled !== false ? t('启用') : t('禁用')}
                            </Tag>
                        </div>
                        <div title={`${cfg.model} · ${cfg.requestPath}`} style={{ fontSize: 12, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cfg.model} · {cfg.requestPath}
                        </div>
                    </div>
                    <Space size={4}>
                        {cfg.statusName === 'DELETED'
                            ? <Tooltip title={t('已删除的模型配置不可编辑')}>
                                <Button type='text' size='small' disabled icon={<EditOutlined />} />
                            </Tooltip>
                            : <Button type='text' size='small' icon={<EditOutlined />} onClick={() => { on_edit_config(cfg) }} />}
                        {cfg.enabled !== false && <Popconfirm
                            title={t('确定禁用此模型配置？')}
                            onConfirm={async () => { await on_disable_config(cfg) }}
                        >
                            <Button type='text' size='small' icon={<StopOutlined />}>{t('禁用')}</Button>
                        </Popconfirm>}
                        {cfg.enabled === false && <Popconfirm
                            title={t('确定启用此模型配置？')}
                            description={t('启用前要求所属 Provider 为 ACTIVE')}
                            onConfirm={async () => { await on_enable_config(cfg) }}
                        >
                            <Button type='text' size='small' icon={<CheckCircleOutlined />}>{t('启用')}</Button>
                        </Popconfirm>}
                        <Popconfirm
                            title={t('确定删除此模型配置？')}
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => { await on_delete_config(cfg) }}
                        >
                            <Button type='text' size='small' danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                </div>
            )
        }
    </div>
}
