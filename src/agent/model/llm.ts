import type { ChatModel } from '@/agent/model.ts'
import { ENABLE_ATTACHMENTS } from './constants.ts'
import type { AgentAuthSubjectType, IAgentLlmBinding, IBuiltinInitResult, ILlmBudgetConfig, ILlmBudgetStatus, ILlmConfig, ILlmConfigInput, ILlmProvider, ILlmUsageStats, ISelectableLlmInfo, IUserLlmAccessInfo } from './types.ts'
import { get_auth_subject_parameter, get_enabled, get_status, get_status_name, normalize_json_object, normalize_json_object_string, optional_positive_number } from './helpers.ts'
import { chat_shared_model } from './shared.ts'

export class ChatLlmModel {
    constructor (private chat: ChatModel) { }
    // 响应里的 size 是本页条数而非总数，只能用 total 判断是否取完；max_pages 防止后端忽略 offset 时死循环
    async load_page_items (path: string, limit = 100, max_pages = 100): Promise<any[]> {
        const items: any[] = [ ]
        const sep = path.includes('?') ? '&' : '?'
        for (let page = 0;  page < max_pages;  page++) {
            const search = new URLSearchParams({ offset: String(page * limit), limit: String(limit) })
            const result = await this.chat.agent.api_fetch(`${path}${sep}${search}`)
            const page_items = result.items || [ ]
            items.push(...page_items)
            const total = Number(result.total)
            // 本页不足 limit 说明已是末页；多于 limit 说明后端忽略了分页参数，已一次性返回全部
            if (page_items.length !== limit || Number.isFinite(total) && items.length >= total)
                break
        }
        return items
    }
    _map_llm_config (item: any, provider_lookup?: Map<string, ILlmProvider>): ILlmConfig {
        const provider = item.providerId && provider_lookup?.get(item.providerId)
        const extra = normalize_json_object(item.extra)
        return {
            llmConfigId: item.llmConfigId,
            name: item.name || item.llmConfigId,
            providerId: item.providerId || '',
            providerName: item.providerName || provider?.name,
            adapterType: item.adapterType || provider?.adapterType,
            model: item.model || '',
            capability: item.capability,
            embeddingDimension: item.embeddingDimension,
            embeddingMetric: item.embeddingMetric,
            embeddingNormalize: item.embeddingNormalize,
            requestPath: item.requestPath || '',
            defaultParams: item.defaultParams,
            contextWindow: item.contextWindow,
            ...(ENABLE_ATTACHMENTS ? {
                supportsImage: extra?.supportsImage as boolean | undefined,
                maxImageBytes: extra?.maxImageBytes as number | undefined,
            } : { }),
            maxConcurrency: optional_positive_number(item.maxConcurrency),
            rateLimitRPM: optional_positive_number(item.rateLimitRPM),
            timeoutMs: optional_positive_number(item.timeoutMs),
            retryConfig: item.retryConfig,
            customData: normalize_json_object_string(item.customData ?? item.custom),
            custom: normalize_json_object(item.customData ?? item.custom),
            extra: item.extra,
            enabled: get_enabled(item),
            status: get_status(item),
            statusName: get_status_name(item),
        }
    }
    _map_llm_provider (item: any): ILlmProvider {
        return {
            providerId: item.providerId,
            name: item.name || item.providerId,
            adapterType: item.adapterType || '',
            baseUrl: item.baseUrl || '',
            apiKey: item.apiKey,
            headers: item.headers || { },
            extra: item.extra,
            enabled: get_enabled(item),
            status: get_status(item),
            statusName: get_status_name(item),
        }
    }
    _p_load_providers: Promise<ILlmProvider[]> | null = null
    _p_load_configs: Promise<ILlmConfig[]> | null = null
    
    /** 获取全局 LLM 提供商列表。
        遵循“如果有就直接取，没有再发网络请求”的缓存原则，并做并发去重保护。 */
    async ensure_llm_providers (force = false): Promise<ILlmProvider[]> {
        if (!force && this.chat.llm_providers.length > 0)
            return this.chat.llm_providers
        if (this._p_load_providers)
            return this._p_load_providers
        const p = (async () => {
            try {
                const items = (await this.chat.llm.load_page_items('/llm/provider/list')).map((item: any) => this.chat.llm._map_llm_provider(item))
                this.chat.set({ llm_providers: items })
                return items
            } catch (error) {
                console.error('Failed to load LLM providers:', error)
                return this.chat.llm_providers
            } finally {
                this._p_load_providers = null
            }
        })()
        this._p_load_providers = p
        return p
    }
    
    /** 获取全局 LLM 模型配置列表（已关联 providerName）。
        遵循“如果有就直接取，没有再发网络请求”的缓存原则，并做并发去重保护。 */
    async ensure_llm_configs (force = false): Promise<ILlmConfig[]> {
        if (!force && this.chat.llm_configs.length > 0)
            return this.chat.llm_configs
        if (this._p_load_configs)
            return this._p_load_configs
        const p = (async () => {
            try {
                const providers = await this.chat.llm.ensure_llm_providers(force)
                const provider_lookup = new Map(providers.map(p => [p.providerId, p] as const))
                const items = (await this.chat.llm.load_page_items('/llm/config/list')).map((item: any) => this.chat.llm._map_llm_config(item, provider_lookup))
                this.chat.set({ llm_configs: items })
                return items
            } catch (error) {
                console.error('Failed to load LLM configs:', error)
                return this.chat.llm_configs
            } finally {
                this._p_load_configs = null
            }
        })()
        this._p_load_configs = p
        return p
    }
    
    async load_llm_providers (force = false): Promise<ILlmProvider[]> {
        return this.chat.llm.ensure_llm_providers(force)
    }
    
    async register_llm_provider (provider: {
        name: string
        adapterType: string
        baseUrl: string
        apiKey?: string | null
        headers?: Record<string, string>
        enabled?: boolean
        extra?: string
    }): Promise<ILlmProvider> {
        const result = await this.chat.agent.api_fetch('/llm/provider/register', {
            method: 'POST',
            body: JSON.stringify(provider),
        })
        await this.chat.llm.ensure_llm_providers(true)
        await this.chat.llm.ensure_llm_configs(true)
        return result
    }
    
    async update_llm_provider (provider_id: string, updates: Record<string, any>): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/provider/${provider_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
        await this.chat.llm.ensure_llm_providers(true)
        await this.chat.llm.ensure_llm_configs(true)
    }
    
    async disable_llm_provider (provider_id: string): Promise<void> {
        await this.chat.llm.update_llm_provider(provider_id, { enabled: false })
    }
    
    async enable_llm_provider (provider_id: string): Promise<void> {
        await this.chat.llm.update_llm_provider(provider_id, { enabled: true })
    }
    
    async delete_llm_provider (provider_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/provider/${provider_id}`, { method: 'DELETE' })
        await this.chat.llm.ensure_llm_providers(true)
        await this.chat.llm.ensure_llm_configs(true)
    }
    
    async load_llm_configs (provider_lookup?: Map<string, ILlmProvider>, force = false): Promise<ILlmConfig[]> {
        if (!provider_lookup)
            return this.chat.llm.ensure_llm_configs(force)
        try {
            const items = (await this.chat.llm.load_page_items('/llm/config/list')).map((item: any) => this.chat.llm._map_llm_config(item, provider_lookup))
            this.chat.set({ llm_configs: items })
            return items
        } catch {
            return this.chat.llm_configs
        }
    }
    
    async register_llm_config (config: ILlmConfigInput): Promise<ILlmConfig> {
        const result = await this.chat.agent.api_fetch('/llm/config/register', {
            method: 'POST',
            body: JSON.stringify(config),
        })
        await this.chat.llm.ensure_llm_configs(true)
        return result
    }
    
    async update_llm_config (llm_config_id: string, updates: Partial<ILlmConfigInput>): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/config/${llm_config_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
        await this.chat.llm.ensure_llm_configs(true)
    }
    
    async disable_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.llm.update_llm_config(llm_config_id, { enabled: false })
    }
    
    async enable_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.llm.update_llm_config(llm_config_id, { enabled: true })
    }
    
    async delete_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/config/${llm_config_id}`, { method: 'DELETE' })
        await this.chat.llm.ensure_llm_configs(true)
    }
    
    async load_agent_llm_bindings (agent_id: string, provider_lookup?: Map<string, ILlmProvider>): Promise<IAgentLlmBinding[]> {
        try {
            if (!provider_lookup) {
                const providers = await this.chat.llm.ensure_llm_providers()
                provider_lookup = new Map(providers.map(p => [p.providerId, p] as const))
            }
            const result = await this.chat.agent.api_fetch(`/agent/${encodeURIComponent(agent_id)}/llm/list`)
            return (result.items || [ ]).map((item: any) => ({
                ...this.chat.llm._map_llm_config(item, provider_lookup),
                isDefault: item.isDefault ?? false,
                priority: item.priority ?? 0,
                accessExtra: item.accessExtra,
            }))
        } catch {
            return [ ]
        }
    }
    async bind_llm_to_agent (agent_id: string, llm_config_id: string, is_default = false, priority?: number): Promise<void> {
        const body: Record<string, any> = {
            llmConfigId: llm_config_id,
            isDefault: is_default,
        }
        if (priority !== undefined)
            body.priority = priority
        await this.chat.agent.api_fetch(`/agent/${agent_id}/llm/access`, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    }
    async unbind_llm_from_agent (agent_id: string, llm_config_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/agent/${agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    }
    async unbind_llm_config (llm_config_id: string): Promise<void> {
        if (!this.chat.agent_id)
            return
        await this.chat.agent.api_fetch(`/agent/${this.chat.agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    }
    get_subject_llm_access_path (subject_type: AgentAuthSubjectType, subject_id: string) {
        const [, validated_subject_id] = get_auth_subject_parameter(subject_type, subject_id)
        return `/${subject_type.toLowerCase()}/${encodeURIComponent(validated_subject_id)}/llm/access`
    }
    async load_subject_llm_access (subject_type: AgentAuthSubjectType, subject_id: string): Promise<IUserLlmAccessInfo[]> {
        const path = this.chat.llm.get_subject_llm_access_path(subject_type, subject_id)
        try {
            return await this.chat.llm.load_page_items(path)
        } catch {
            return [ ]
        }
    }
    async grant_subject_llm_access (subject_type: AgentAuthSubjectType, subject_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(this.chat.llm.get_subject_llm_access_path(subject_type, subject_id), {
            method: 'POST',
            body: JSON.stringify({ llmConfigId: llm_config_id }),
        })
        return result.items || [ ]
    }
    async revoke_subject_llm_access (subject_type: AgentAuthSubjectType, subject_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const path = this.chat.llm.get_subject_llm_access_path(subject_type, subject_id)
        const result = await this.chat.agent.api_fetch(`${path}?llmConfigId=${encodeURIComponent(llm_config_id)}`, {
            method: 'DELETE',
        })
        return result.items || [ ]
    }
    async load_llm_usage (params: { agentId: string, targetUserId?: string, startTime?: number, endTime?: number }): Promise<ILlmUsageStats> {
        const search = new URLSearchParams({ agentId: params.agentId })
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        if (params.startTime !== undefined)
            search.set('startTime', String(params.startTime))
        if (params.endTime !== undefined)
            search.set('endTime', String(params.endTime))
        return this.chat.agent.api_fetch(`/llm/usage?${search}`)
    }
    async load_llm_budget (params: { agentId: string, targetUserId?: string }): Promise<ILlmBudgetStatus> {
        const search = new URLSearchParams({ agentId: params.agentId })
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        return this.chat.agent.api_fetch(`/llm/budget?${search}`)
    }
    async update_llm_budget (agent_id: string, budget: ILlmBudgetConfig): Promise<ILlmBudgetStatus> {
        return this.chat.agent.api_fetch('/llm/budget', {
            method: 'PUT',
            body: JSON.stringify({ agentId: agent_id, budget }),
        })
    }
    async init_builtins (params: { dryRun?: boolean, includeDetails?: boolean }): Promise<IBuiltinInitResult> {
        return this.chat.agent.api_fetch('/builtin/init', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    async load_builtin_init_status (include_details = false): Promise<IBuiltinInitResult> {
        return this.chat.agent.api_fetch(`/builtin/init/status?includeDetails=${include_details}`)
    }
    async load_selectable_llms (agent_id?: string, provider_lookup?: Map<string, ILlmProvider>): Promise<ISelectableLlmInfo[]> {
        const aid = agent_id || this.chat.agent_id
        if (!aid)
            return [ ]
        try {
            if (!provider_lookup) {
                const providers = await this.chat.llm.load_llm_providers().catch(() => [ ])
                provider_lookup = new Map(providers.map(p => [p.providerId, p] as const))
            }
            const page_items = await this.chat.llm.load_page_items(`/agent/${aid}/llm/selectable`)
            const items: ISelectableLlmInfo[] = page_items.map((item: any) => ({
                ...this.chat.llm._map_llm_config(item, provider_lookup),
                source: item.source || 'agent',
                isAgentDefault: item.isAgentDefault ?? false,
                participatesInFallback: item.participatesInFallback ?? false,
                fallbackPriority: item.fallbackPriority ?? null,
            }))
            chat_shared_model.set({
                selectable_llms_by_agent_id: {
                    ...chat_shared_model.selectable_llms_by_agent_id,
                    [aid]: items,
                },
            })
            if (aid === this.chat.agent_id)
                this.chat.set({
                    use_native_tool_calling: this.chat.agent.should_use_native_tool_calling(this.chat.agent.get_effective_llm_config_id(), items),
                })
            return items
        } catch {
            if (aid === this.chat.agent_id) {
                chat_shared_model.set({
                    selectable_llms_by_agent_id: {
                        ...chat_shared_model.selectable_llms_by_agent_id,
                        [aid]: [ ],
                    },
                })
                this.chat.set({ use_native_tool_calling: true })
            }
            return [ ]
        }
    }
}
