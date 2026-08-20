import type { ReactNode } from 'react'

import { Button, Empty, Input, Popconfirm, Select } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, SaveOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { ILlmProvider } from '@/agent/model.ts'
import { form_error_alert, required_label } from '@/agent/settings/common.tsx'
import { ADAPTER_TYPE_OPTIONS, type ProviderFormData } from './types.ts'


const base_url_placeholders: Record<string, string> = {
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
}


export function ProviderEditor ({
    provider_mode,
    provider_form,
    set_provider_form,
    provider_error,
    selected_provider,
    saving_provider,
    on_save_provider,
    on_disable_provider,
    on_enable_provider,
    on_delete_provider,
    children,
}: {
    provider_mode: 'idle' | 'create' | 'edit'
    provider_form: ProviderFormData
    set_provider_form: React.Dispatch<React.SetStateAction<ProviderFormData>>
    provider_error: string
    selected_provider?: ILlmProvider
    saving_provider: boolean
    on_save_provider: () => Promise<void>
    on_disable_provider: () => Promise<void>
    on_enable_provider: () => Promise<void>
    on_delete_provider: () => Promise<void>
    children?: ReactNode
}) {
    return <div className='ai-settings-list-detail'>
        <div className='ai-settings-detail-header'>
            {provider_mode !== 'idle' && <div className='ai-settings-detail-title'>
                {provider_mode === 'create' ? t('新建 Provider') : t('编辑 Provider')}
            </div>}
        </div>
        <div className='ai-settings-detail-body'>
            {provider_mode === 'idle'
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请从左侧选择一个 Provider，或点击「模型管理」右侧的 + 新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    {form_error_alert(provider_error)}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('Provider 名称'))}</div>
                            <Input
                                value={provider_form.name}
                                onChange={e => { set_provider_form({ ...provider_form, name: e.target.value }) }}
                                placeholder={t('名称')}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('适配器类型'))}</div>
                            <Select
                                style={{ width: '100%' }}
                                value={provider_form.adapterType}
                                onChange={val => { set_provider_form({ ...provider_form, adapterType: val }) }}
                                options={ADAPTER_TYPE_OPTIONS}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label('Base URL')}</div>
                            <Input
                                value={provider_form.baseUrl}
                                onChange={e => { set_provider_form({ ...provider_form, baseUrl: e.target.value }) }}
                                placeholder={base_url_placeholders[provider_form.adapterType] || 'https://api.deepseek.com'}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>API Key</div>
                            <Input.Password
                                value={provider_form.apiKey}
                                onChange={e => { set_provider_form({ ...provider_form, apiKey: e.target.value }) }}
                                placeholder='sk-...'
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {provider_mode === 'edit' && selected_provider?.enabled !== false && <Popconfirm
                            title={t('确定禁用此 Provider？')}
                            description={t('禁用前需要确保没有未删除的模型配置继续引用该 Provider')}
                            onConfirm={on_disable_provider}
                        >
                            <Button icon={<StopOutlined />}>{t('禁用 Provider')}</Button>
                        </Popconfirm>}
                        {provider_mode === 'edit' && selected_provider?.enabled === false && <Popconfirm
                            title={t('确定启用此 Provider？')}
                            description={t('启用 Provider 不会自动启用引用它的模型配置')}
                            onConfirm={on_enable_provider}
                        >
                            <Button icon={<CheckCircleOutlined />}>{t('启用 Provider')}</Button>
                        </Popconfirm>}
                        {provider_mode === 'edit' && <Popconfirm
                            title={t('确定删除此 Provider？')}
                            onConfirm={on_delete_provider}
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<DeleteOutlined />}>{t('删除 Provider')}</Button>
                        </Popconfirm>}
                        <Button type='primary' icon={<SaveOutlined />} loading={saving_provider} onClick={on_save_provider}>
                            {provider_mode === 'create' ? t('创建') : t('保存')}
                        </Button>
                    </div>
                    {children}
                </>
            }
        </div>
    </div>
}
