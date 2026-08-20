import { useEffect, useState } from 'react'
import { message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmConfig, ILlmProvider } from '@/agent/model.ts'
import { ENABLE_ATTACHMENTS } from '@/agent/model/constants.ts'
import {
    ConfigEditModal,
    ConfigList,
    DEFAULT_CONFIG_FORM,
    DEFAULT_PROVIDER_FORM,
    ProviderEditor,
    ProviderSidebar,
    optional_nonnegative_number,
    optional_positive_number,
    parse_json_field,
    supports_native_tool_call,
} from './llm/index.ts'


function refresh_current_agent_llms () {
    if (chat_model.agent_id)
        chat_model.llm.load_selectable_llms(chat_model.agent_id).catch(() => { })
}


export function LlmConfigTab () {
    const [providers, set_providers] = useState<ILlmProvider[]>([ ])
    const [configs, set_configs] = useState<ILlmConfig[]>([ ])
    const [selected_provider_id, set_selected_provider_id] = useState('')
    const [provider_mode, set_provider_mode] = useState<'idle' | 'create' | 'edit'>('idle')
    const [provider_form, set_provider_form] = useState({ ...DEFAULT_PROVIDER_FORM })
    
    const [config_modal_mode, set_config_modal_mode] = useState<'closed' | 'create' | 'edit'>('closed')
    const [editing_config_id, set_editing_config_id] = useState('')
    const [config_form, set_config_form] = useState({ ...DEFAULT_CONFIG_FORM })
    
    const [loading, set_loading] = useState(false)
    const [saving_provider, set_saving_provider] = useState(false)
    const [saving_config, set_saving_config] = useState(false)
    const [provider_error, set_provider_error] = useState('')
    const [config_error, set_config_error] = useState('')
    
    async function load () {
        set_loading(true)
        try {
            const [ps, cs] = await Promise.all([
                chat_model.llm.load_llm_providers(),
                chat_model.llm.load_llm_configs(),
            ])
            const visible_providers = ps.filter(p => p.statusName !== 'DELETED')
            const lookup = new Map(visible_providers.map(p => [p.providerId, p]))
            const enriched = cs
                .filter(c => c.statusName !== 'DELETED')
                .map(c => ({
                    ...c,
                    providerName: c.providerName || lookup.get(c.providerId)?.name,
                    adapterType: c.adapterType || lookup.get(c.providerId)?.adapterType,
                }))
            set_providers(visible_providers)
            set_configs(enriched)
        } catch {
            message.error(t('加载模型配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    const selected_provider = providers.find(p => p.providerId === selected_provider_id)
    const provider_configs = configs.filter(c => c.providerId === selected_provider_id)
    
    function open_create_provider () {
        set_selected_provider_id('')
        set_provider_mode('create')
        set_provider_form({ ...DEFAULT_PROVIDER_FORM })
        set_provider_error('')
    }
    
    function open_edit_provider (p: ILlmProvider) {
        set_selected_provider_id(p.providerId)
        set_provider_mode('edit')
        set_provider_form({
            name: p.name,
            adapterType: p.adapterType || 'deepseek',
            baseUrl: p.baseUrl,
            apiKey: p.apiKey || '',
        })
        set_provider_error('')
    }
    
    async function save_provider () {
        if (!provider_form.name.trim()) {
            set_provider_error(t('请输入 Provider 名称'))
            return
        }
        if (!provider_form.baseUrl.trim()) {
            set_provider_error(t('请输入 Base URL'))
            return
        }
        set_provider_error('')
        set_saving_provider(true)
        try {
            if (provider_mode === 'create') {
                const created = await chat_model.llm.register_llm_provider({
                    name: provider_form.name.trim(),
                    adapterType: provider_form.adapterType,
                    baseUrl: provider_form.baseUrl.trim(),
                    apiKey: provider_form.apiKey || null,
                    enabled: true,
                })
                message.success(t('创建成功'))
                await load()
                set_selected_provider_id(created.providerId)
                set_provider_mode('edit')
            } else if (provider_mode === 'edit' && selected_provider_id) {
                const payload: Record<string, unknown> = {
                    name: provider_form.name.trim(),
                    adapterType: provider_form.adapterType,
                    baseUrl: provider_form.baseUrl.trim(),
                }
                if (provider_form.apiKey !== (selected_provider?.apiKey || ''))
                    payload.apiKey = provider_form.apiKey || null
                
                await chat_model.llm.update_llm_provider(selected_provider_id, payload)
                message.success(t('保存成功'))
                await load()
            }
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving_provider(false)
        }
    }
    
    async function delete_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.llm.delete_llm_provider(selected_provider_id)
            message.success(t('删除成功'))
            set_selected_provider_id('')
            set_provider_mode('idle')
            set_provider_form({ ...DEFAULT_PROVIDER_FORM })
            await load()
        } catch (e: any) {
            message.error(e.message || t('删除失败，请先删除该 Provider 下的所有模型配置'))
        }
    }
    
    async function disable_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.llm.disable_llm_provider(selected_provider_id)
            message.success(t('禁用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('禁用失败'))
            await load()
        }
    }
    
    async function enable_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.llm.enable_llm_provider(selected_provider_id)
            message.success(t('启用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('启用失败'))
            await load()
        }
    }
    
    function open_create_config () {
        if (!selected_provider_id) {
            message.warning(t('请先选择一个 Provider'))
            return
        }
        if (selected_provider?.enabled === false) {
            message.warning(t('只有活跃 Provider 可以新增模型配置'))
            return
        }
        set_editing_config_id('')
        set_config_modal_mode('create')
        set_config_form({ ...DEFAULT_CONFIG_FORM })
        set_config_error('')
    }
    
    function open_edit_config (cfg: ILlmConfig) {
        set_editing_config_id(cfg.llmConfigId)
        set_config_modal_mode('edit')
        set_config_form({
            name: cfg.name,
            model: cfg.model,
            capability: (cfg.capability as 'chat' | 'embedding') || 'chat',
            requestPath: cfg.requestPath || '/v1/chat/completions',
            contextWindow: optional_nonnegative_number(cfg.contextWindow),
            defaultParams: cfg.defaultParams ? JSON.stringify(cfg.defaultParams, null, 2) : '',
            embeddingDimension: cfg.embeddingDimension ?? 1536,
            embeddingMetric: (cfg.embeddingMetric as 'euclidean' | 'cosine') || 'euclidean',
            embeddingNormalize: cfg.embeddingMetric === 'cosine' || (cfg.embeddingNormalize ?? false),
            maxImageBytes: cfg.maxImageBytes ?? DEFAULT_CONFIG_FORM.maxImageBytes,
            maxInputFiles: cfg.maxInputFiles ?? DEFAULT_CONFIG_FORM.maxInputFiles,
            maxConcurrency: optional_positive_number(cfg.maxConcurrency),
            rateLimitRPM: optional_positive_number(cfg.rateLimitRPM),
            timeoutMs: optional_positive_number(cfg.timeoutMs),
            retryConfig: cfg.retryConfig ? JSON.stringify(cfg.retryConfig, null, 2) : '',
            nativeToolCall: supports_native_tool_call(cfg.custom),
            custom: cfg.custom || { },
        })
        set_config_error('')
    }
    
    async function save_config () {
        if (!config_form.name.trim()) {
            set_config_error(t('请输入配置名称'))
            return
        }
        if (!config_form.model.trim()) {
            set_config_error(t('请输入模型名称'))
            return
        }
        if (!config_form.requestPath.trim() || !config_form.requestPath.startsWith('/')) {
            set_config_error(t('请求路径必须以 / 开头'))
            return
        }
        set_config_error('')
        
        let default_params: Record<string, unknown> | undefined
        let retry_config: Record<string, unknown> | undefined
        try {
            default_params = parse_json_field(config_form.defaultParams, t('自定义参数'))
            retry_config = parse_json_field(config_form.retryConfig, t('重试配置'))
        } catch {
            return
        }
        
        const is_embedding = config_form.capability === 'embedding'
        if (is_embedding && config_form.embeddingMetric === 'cosine' && !config_form.embeddingNormalize) {
            message.warning(t('embeddingMetric=cosine 时必须勾选归一化'))
            return
        }
        
        const payload: any = {
            name: config_form.name.trim(),
            model: config_form.model.trim(),
            capability: config_form.capability,
            requestPath: config_form.requestPath.trim(),
            contextWindow: config_form.contextWindow ?? null,
            ...(ENABLE_ATTACHMENTS ? {
                maxImageBytes: config_form.maxImageBytes,
                maxInputFiles: config_form.maxInputFiles,
            } : { }),
            maxConcurrency: config_form.maxConcurrency ?? null,
            rateLimitRPM: config_form.rateLimitRPM ?? null,
            timeoutMs: config_form.timeoutMs ?? null,
            customData: JSON.stringify(is_embedding ? config_form.custom : { ...config_form.custom, tool_call: config_form.nativeToolCall }),
        }
        payload.defaultParams = default_params ?? null
        payload.retryConfig = retry_config ?? null
        if (is_embedding) {
            payload.embeddingDimension = config_form.embeddingDimension
            payload.embeddingMetric = config_form.embeddingMetric
            payload.embeddingNormalize = config_form.embeddingMetric === 'cosine' || config_form.embeddingNormalize
        }
        
        set_saving_config(true)
        try {
            if (config_modal_mode === 'create') {
                await chat_model.llm.register_llm_config({ ...payload, providerId: selected_provider_id, enabled: true })
                message.success(t('创建成功'))
            } else if (editing_config_id) {
                await chat_model.llm.update_llm_config(editing_config_id, payload)
                message.success(t('保存成功'))
            }
            set_config_modal_mode('closed')
            await load()
            refresh_current_agent_llms()
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving_config(false)
        }
    }
    
    async function delete_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.delete_llm_config(cfg.llmConfigId)
            message.success(t('删除成功'))
            await load()
            refresh_current_agent_llms()
        } catch (e: any) {
            message.error(e.message || t('删除失败'))
            await load()
        }
    }
    
    async function disable_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.disable_llm_config(cfg.llmConfigId)
            message.success(t('禁用成功'))
            await load()
            refresh_current_agent_llms()
        } catch (e: any) {
            message.error(e.message || t('禁用失败'))
            await load()
        }
    }
    
    async function enable_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.enable_llm_config(cfg.llmConfigId)
            message.success(t('启用成功'))
            await load()
            refresh_current_agent_llms()
        } catch (e: any) {
            message.error(e.message || t('启用失败'))
            await load()
        }
    }
    
    return <div className='ai-settings-list-layout' style={{ height: '100%' }}>
        <ProviderSidebar
            providers={providers}
            configs={configs}
            selected_provider_id={selected_provider_id}
            loading={loading}
            on_create_provider={open_create_provider}
            on_select_provider={open_edit_provider}
        />
        <ProviderEditor
            provider_mode={provider_mode}
            provider_form={provider_form}
            set_provider_form={set_provider_form}
            provider_error={provider_error}
            selected_provider={selected_provider}
            saving_provider={saving_provider}
            on_save_provider={save_provider}
            on_disable_provider={disable_provider}
            on_enable_provider={enable_provider}
            on_delete_provider={delete_provider}
        >
            {provider_mode === 'edit' && selected_provider && <ConfigList
                configs={provider_configs}
                provider_enabled={selected_provider.enabled !== false}
                on_create_config={open_create_config}
                on_edit_config={open_edit_config}
                on_disable_config={disable_config}
                on_enable_config={enable_config}
                on_delete_config={delete_config}
            />}
        </ProviderEditor>
        <ConfigEditModal
            config_modal_mode={config_modal_mode}
            config_form={config_form}
            set_config_form={set_config_form}
            config_error={config_error}
            saving_config={saving_config}
            on_close={() => {
                set_config_modal_mode('closed')
                set_config_error('')
            }}
            on_save_config={save_config}
        />
    </div>
}
