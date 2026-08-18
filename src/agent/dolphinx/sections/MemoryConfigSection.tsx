import { useEffect, useState } from 'react'

import { Button, InputNumber, Select, Switch, message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmConfig } from '@/agent/model.ts'
import {
    AgentListLayout,
    optional_nonnegative_number,
    show_error,
    use_agent_options,
} from '@/agent/dolphinx/common.tsx'


export function MemoryConfigSection ({ agent_id }: { agent_id: string }) {
    const [form, set_form] = useState<{
        allowPersonalMemory: boolean
        memoryLlmConfigId: string
        memoryEmbeddingConfigId: string
        publicMemoryTokenLimit?: number
    }>({
        allowPersonalMemory: true,
        memoryLlmConfigId: '',
        memoryEmbeddingConfigId: '',
    })
    const [llm_configs, set_llm_configs] = useState<ILlmConfig[]>([ ])
    const [loading, set_loading] = useState(false)
    const chat_llm_configs = llm_configs.filter(config => config.capability !== 'embedding')
    const embedding_llm_configs = llm_configs.filter(config => config.capability === 'embedding')
    
    async function load_config () {
        set_loading(true)
        try {
            const [result, configs] = await Promise.all([
                chat_model.memory.get_memory_config(agent_id),
                chat_model.llm.load_llm_configs(),
            ])
            const config = result.memoryConfig || { }
            set_llm_configs(configs.filter(item => item.statusName !== 'DELETED'))
            set_form({
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
            })
        } catch (error) {
            show_error(error, t('加载记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function save_config () {
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
            set_form({
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
            })
            message.success(t('保存成功'))
        } catch (error) {
            show_error(error, t('保存记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load_config() }, [agent_id])
    
    function number_field (key: keyof typeof form, label: string, placeholder: string) {
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
                            label: config.name || config.llmConfigId,
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
                            label: config.name || config.llmConfigId,
                        }))}
                    />
                </div>
                {number_field('publicMemoryTokenLimit', t('公共记忆上限'), '2000')}
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type='primary' loading={loading} onClick={save_config}>{t('保存')}</Button>
        </div>
    </div>
}


export function MemoryConfigManagementSection () {
    const { options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState('')
    return <AgentListLayout detail_title={t('记忆配置')} list_subtitle={t('选择需要配置记忆的 Agent')} options={options} selected_agent_id={selected_agent_id} set_selected_agent_id={set_selected_agent_id}>
        <MemoryConfigSection agent_id={selected_agent_id} />
    </AgentListLayout>
}
