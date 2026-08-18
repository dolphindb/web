import { Input, InputNumber, Modal, Select, Switch } from 'antd'

import { t } from '@i18n'
import { form_error_alert, required_label } from '@/agent/settings/common.tsx'
import {
    EMBEDDING_METRIC_OPTIONS,
    optional_positive_number,
    type ConfigFormData,
} from './types.ts'


export function ConfigEditModal ({
    config_modal_mode,
    config_form,
    set_config_form,
    config_error,
    saving_config,
    on_close,
    on_save_config,
}: {
    config_modal_mode: 'closed' | 'create' | 'edit'
    config_form: ConfigFormData
    set_config_form: React.Dispatch<React.SetStateAction<ConfigFormData>>
    config_error: string
    saving_config: boolean
    on_close: () => void
    on_save_config: () => Promise<void>
}) {
    const is_embedding_form = config_form.capability === 'embedding'
    
    return <Modal
        title={config_modal_mode === 'create' ? t('新增模型配置') : t('编辑模型配置')}
        open={config_modal_mode !== 'closed'}
        onCancel={on_close}
        onOk={on_save_config}
        confirmLoading={saving_config}
        okText={t('保存')}
        cancelText={t('取消')}
        width={720}
        destroyOnHidden
    >
        {form_error_alert(config_error)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 12 }}>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('配置名称'))}</div>
                <Input
                    value={config_form.name}
                    onChange={e => { set_config_form({ ...config_form, name: e.target.value }) }}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('能力')}</div>
                <Select
                    style={{ width: '100%' }}
                    value={config_form.capability}
                    onChange={val => { set_config_form({ ...config_form, capability: val }) }}
                    options={[
                        { value: 'chat', label: 'Chat' },
                        { value: 'embedding', label: 'Embedding' },
                    ]}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('模型名称'))}</div>
                <Input
                    value={config_form.model}
                    onChange={e => { set_config_form({ ...config_form, model: e.target.value }) }}
                    placeholder='gpt-4o'
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('请求路径'))}</div>
                <Input
                    value={config_form.requestPath}
                    onChange={e => { set_config_form({ ...config_form, requestPath: e.target.value }) }}
                    placeholder='/v1/chat/completions'
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('上下文窗口')}</div>
                <InputNumber
                    style={{ width: '100%' }}
                    value={config_form.contextWindow}
                    onChange={val => { set_config_form({ ...config_form, contextWindow: val ?? undefined }) }}
                    min={0}
                    step={1024}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('最大并发（可选）')}</div>
                <InputNumber
                    style={{ width: '100%' }}
                    value={config_form.maxConcurrency}
                    onChange={val => { set_config_form({ ...config_form, maxConcurrency: optional_positive_number(val ?? undefined) }) }}
                    min={1}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('速率限制 RPM（可选）')}</div>
                <InputNumber
                    style={{ width: '100%' }}
                    value={config_form.rateLimitRPM}
                    onChange={val => { set_config_form({ ...config_form, rateLimitRPM: optional_positive_number(val ?? undefined) }) }}
                    min={1}
                />
            </div>
            <div>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('超时毫秒（可选）')}</div>
                <InputNumber
                    style={{ width: '100%' }}
                    value={config_form.timeoutMs}
                    onChange={val => { set_config_form({ ...config_form, timeoutMs: optional_positive_number(val ?? undefined) }) }}
                    min={1000}
                    step={1000}
                />
            </div>
            {!is_embedding_form && <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                    className='ai-settings-switch-medium'
                    checked={config_form.nativeToolCall}
                    onChange={checked => { set_config_form({ ...config_form, nativeToolCall: checked }) }}
                />
                <span style={{ fontSize: 13 }}>{t('支持原生 tool call')}</span>
            </div>}
            {is_embedding_form && <>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('嵌入维度'))}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.embeddingDimension}
                        onChange={val => { set_config_form({ ...config_form, embeddingDimension: val ?? 1536 }) }}
                        min={1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('嵌入度量')}</div>
                    <Select
                        style={{ width: '100%' }}
                        value={config_form.embeddingMetric}
                        onChange={val => { set_config_form({ ...config_form, embeddingMetric: val, embeddingNormalize: val === 'cosine' || config_form.embeddingNormalize }) }}
                        options={EMBEDDING_METRIC_OPTIONS}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                        className='ai-settings-switch-medium'
                        checked={config_form.embeddingMetric === 'cosine' || config_form.embeddingNormalize}
                        disabled={config_form.embeddingMetric === 'cosine'}
                        onChange={checked => { set_config_form({ ...config_form, embeddingNormalize: checked }) }}
                    />
                    <span style={{ fontSize: 13 }}>{t('对向量做归一化（metric=cosine 时必须开启）')}</span>
                </div>
            </>}
            <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('自定义参数 (JSON，传给模型的其他参数)')}</div>
                <Input.TextArea
                    value={config_form.defaultParams}
                    onChange={e => { set_config_form({ ...config_form, defaultParams: e.target.value }) }}
                    placeholder='{"temperature": 0.7}'
                    rows={3}
                    style={{ fontFamily: 'monospace' }}
                />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('重试配置 (JSON，可选)')}</div>
                <Input.TextArea
                    value={config_form.retryConfig}
                    onChange={e => { set_config_form({ ...config_form, retryConfig: e.target.value }) }}
                    placeholder='{"maxRetries": 3, "backoffMs": 500}'
                    rows={2}
                    style={{ fontFamily: 'monospace' }}
                />
            </div>
        </div>
    </Modal>
}
