import { useEffect, useState } from 'react'

import { Button, InputNumber, Select, Space, Switch, message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmConfig } from '@/agent/model/types.ts'
import { format_model_label } from '@/agent/model/helpers.ts'
import {
    optional_nonnegative_number,
    show_error,
} from '@/agent/dolphinx/common.tsx'


interface MemoryConfigForm {
    allowPersonalMemory: boolean
    memoryLlmConfigId: string
    memoryEmbeddingConfigId: string
    publicMemoryTokenLimit?: number
}

const DEFAULT_FORM: MemoryConfigForm = {
    allowPersonalMemory: true,
    memoryLlmConfigId: '',
    memoryEmbeddingConfigId: '',
}


export function MemoryConfigSection ({ agent_id }: { agent_id: string }) {
    const { llm_configs: all_configs } = chat_model.use(['llm_configs'])
    const [form, set_form] = useState<MemoryConfigForm>({ ...DEFAULT_FORM })
    const [saved_form, set_saved_form] = useState<MemoryConfigForm>({ ...DEFAULT_FORM })
    const [loading, set_loading] = useState(false)
    const llm_configs = all_configs.filter(item => item.statusName !== 'DELETED')
    const chat_llm_configs = llm_configs.filter(config => config.capability !== 'embedding')
    const embedding_llm_configs = llm_configs.filter(config => config.capability === 'embedding')
    
    const dirty = form.allowPersonalMemory !== saved_form.allowPersonalMemory
        || form.memoryLlmConfigId !== saved_form.memoryLlmConfigId
        || form.memoryEmbeddingConfigId !== saved_form.memoryEmbeddingConfigId
        || form.publicMemoryTokenLimit !== saved_form.publicMemoryTokenLimit
    
    async function load_config () {
        if (!agent_id)
            return
        set_loading(true)
        try {
            const [result] = await Promise.all([
                chat_model.memory.get_memory_config(agent_id),
                chat_model.llm.ensure_llm_configs(),
            ])
            const config = result.memoryConfig || { }
            const next_form: MemoryConfigForm = {
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
            }
            set_form(next_form)
            set_saved_form(next_form)
        } catch (error) {
            show_error(error, t('加载记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function save_config () {
        if (!agent_id)
            return
        const memory_config = {
            allowPersonalMemory: form.allowPersonalMemory,
            memoryLlmConfigId: form.memoryLlmConfigId || null,
            memoryEmbeddingConfigId: form.memoryEmbeddingConfigId || null,
            publicMemoryTokenLimit: form.publicMemoryTokenLimit ?? null,
        }
        set_loading(true)
        try {
            const result = await chat_model.memory.update_memory_config(agent_id, memory_config)
            const config = result.memoryConfig || { }
            const next_form: MemoryConfigForm = {
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
            }
            set_form(next_form)
            set_saved_form(next_form)
            message.success(t('保存成功'))
        } catch (error) {
            show_error(error, t('保存记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (agent_id)
            load_config()
    }, [agent_id])
    
    function number_field (key: keyof MemoryConfigForm, label: string, placeholder: string) {
        return <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{label}</div>
            <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={form[key] as number | undefined}
                onChange={value => { set_form({ ...form, [key]: optional_nonnegative_number(value) }) }}
                placeholder={placeholder}
            />
        </div>
    }
    
    return <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: '12px 16px' }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('允许个人记忆')}</div>
                    <Switch className='ai-settings-switch-medium' checked={form.allowPersonalMemory} onChange={value => { set_form({ ...form, allowPersonalMemory: value }) }} />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('记忆模型配置')}</div>
                    <Select
                        allowClear
                        showSearch
                        style={{ width: '100%' }}
                        value={form.memoryLlmConfigId || undefined}
                        onChange={value => { set_form({ ...form, memoryLlmConfigId: value || '' }) }}
                        placeholder={t('使用 Agent 默认模型')}
                        options={chat_llm_configs.map(config => ({
                            value: config.llmConfigId,
                            label: format_model_label(config),
                        }))}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('记忆向量配置')}</div>
                    <Select
                        allowClear
                        showSearch
                        style={{ width: '100%' }}
                        value={form.memoryEmbeddingConfigId || undefined}
                        onChange={value => { set_form({ ...form, memoryEmbeddingConfigId: value || '' }) }}
                        placeholder={t('不使用向量召回')}
                        options={embedding_llm_configs.map(config => ({
                            value: config.llmConfigId,
                            label: format_model_label(config),
                        }))}
                    />
                </div>
                {number_field('publicMemoryTokenLimit', t('公共记忆上限'), '2000')}
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Space>
                {dirty && <Button disabled={loading} onClick={() => { set_form(saved_form) }}>{t('撤销修改')}</Button>}
                <Button type='primary' loading={loading} disabled={!dirty} onClick={save_config}>{t('保存')}</Button>
            </Space>
        </div>
    </div>
}
