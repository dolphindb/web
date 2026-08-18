import { Button, Input, Switch } from 'antd'

import { t } from '@i18n'
import { form_error_alert, required_label } from '@/agent/settings/common.tsx'
import type { AgentFormData } from './types.ts'


export function AgentCreateForm ({
    form,
    set_form,
    form_error,
    loading,
    on_cancel,
    on_create,
}: {
    form: AgentFormData
    set_form: React.Dispatch<React.SetStateAction<AgentFormData>>
    form_error: string
    loading: boolean
    on_cancel: () => void
    on_create: () => Promise<void>
}) {
    return <div>
        {form_error_alert(form_error)}
        <div style={{ display: 'grid', gap: '12px 16px' }}>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('Agent 名称'))}</div>
                <Input
                    value={form.agentName}
                    onChange={e => { set_form({ ...form, agentName: e.target.value }) }}
                    placeholder={t('例如: DolphinDB 助手')}
                />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                <Input
                    value={form.description}
                    onChange={e => { set_form({ ...form, description: e.target.value }) }}
                    placeholder={t('Agent 描述')}
                />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('系统提示词')}</div>
                <Input.TextArea
                    value={form.systemPrompt}
                    onChange={e => { set_form({ ...form, systemPrompt: e.target.value }) }}
                    placeholder={t('系统提示词，会作为对话的首条 system message')}
                    rows={3}
                />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div className='ai-settings-switch-setting'>
                    <div className='ai-settings-switch-copy'>
                        <div>{t('允许模型失败时自动切换')}</div>
                        <div className='ai-settings-switch-description'>
                            {t('开启后，当前模型调用失败且尚未输出内容时，会按模型绑定优先级尝试下一个模型。')}
                        </div>
                    </div>
                    <Switch className='ai-settings-switch-medium' checked={form.allowLlmFallback} onChange={checked => { set_form({ ...form, allowLlmFallback: checked }) }} />
                </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div className='ai-settings-switch-setting'>
                    <div className='ai-settings-switch-copy'>
                        <div>{t('启用文档搜索')}</div>
                        <div className='ai-settings-switch-description'>
                            {t('关闭后，AI 助手将不会联网搜索 DolphinDB 官方文档。')}
                        </div>
                    </div>
                    <Switch className='ai-settings-switch-medium' checked={form.docSearchEnabled} onChange={checked => { set_form({ ...form, docSearchEnabled: checked }) }} />
                </div>
            </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={on_cancel}>{t('取消')}</Button>
            <Button type='primary' loading={loading} onClick={on_create}>{t('创建并激活')}</Button>
        </div>
    </div>
}
