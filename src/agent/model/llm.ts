import type { ChatModel } from '@/agent/model.ts'
import type { IAgentLlmBinding, IBuiltinInitResult, ILlmConfig, ILlmProvider, ILlmUsageStats, ISelectableLlmInfo, IUserLlmAccessInfo } from './types.ts'
import { get_enabled, get_status, get_status_name, normalize_json_object, normalize_json_object_string, optional_positive_number } from './helpers.ts'
import { chat_shared_model } from './shared.ts'

export class ChatLlmModel {
    constructor (private chat: ChatModel) { }
    async load_page_items (path: string, limit = 100): Promise<any[]> {
        const items: any[] = [ ]
        for (let offset = 0;  ;  offset += limit) {
            const search = new URLSearchParams({ offset: String(offset), limit: String(limit) })
            const result = await this.chat.agent.api_fetch(`${path}?${search}`)
            const page_items = result.items || [ ]
            items.push(...page_items)
            const size = Number(result.size)
            if (page_items.length < limit || Number.isFinite(size) && items.length >= size)
                break
        }
        return items
    }
    _map_llm_config (item: any, provider_lookup?: Map<string, ILlmProvider>): ILlmConfig {
        const provider = item.providerId && provider_lookup?.get(item.providerId)
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
            extra: item.extra,
            enabled: get_enabled(item),
            status: get_status(item),
            statusName: get_status_name(item),
        }
    }
    async load_llm_providers (): Promise<ILlmProvider[]> {
        try {
            return (await this.chat.llm.load_page_items('/llm/provider/list')).map((item: any) => this.chat.llm._map_llm_provider(item))
        } catch {
            return [ ]
        }
    }
    async register_llm_provider (provider: {
        name: string
        adapterType: string
        baseUrl: string
        apiKey?: string | null
        enabled?: boolean
        extra?: string
    }): Promise<ILlmProvider> {
        return this.chat.agent.api_fetch('/llm/provider/register', {
            method: 'POST',
            body: JSON.stringify(provider),
        })
    }
    async update_llm_provider (provider_id: string, updates: Record<string, any>): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/provider/${provider_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    async disable_llm_provider (provider_id: string): Promise<void> {
        await this.chat.llm.update_llm_provider(provider_id, { enabled: false })
    }
    async enable_llm_provider (provider_id: string): Promise<void> {
        await this.chat.llm.update_llm_provider(provider_id, { enabled: true })
    }
    async delete_llm_provider (provider_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/provider/${provider_id}`, { method: 'DELETE' })
    }
    async load_llm_configs (provider_lookup?: Map<string, ILlmProvider>): Promise<ILlmConfig[]> {
        try {
            return (await this.chat.llm.load_page_items('/llm/config/list')).map((item: any) => this.chat.llm._map_llm_config(item, provider_lookup))
        } catch {
            return [ ]
        }
    }
    async register_llm_config (config: {
        name: string
        providerId: string
        model: string
        capability?: 'chat' | 'embedding'
        embeddingDimension?: number
        embeddingMetric?: 'euclidean' | 'cosine'
        embeddingNormalize?: boolean
        requestPath: string
        defaultParams?: Record<string, unknown> | null
        contextWindow?: number | null
        maxConcurrency?: number | null
        rateLimitRPM?: number | null
        timeoutMs?: number | null
        retryConfig?: Record<string, unknown> | null
        customData?: string
        enabled?: boolean
        extra?: string
    }): Promise<ILlmConfig> {
        return this.chat.agent.api_fetch('/llm/config/register', {
            method: 'POST',
            body: JSON.stringify(config),
        })
    }
    async update_llm_config (llm_config_id: string, updates: Record<string, any>): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/config/${llm_config_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    async disable_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.llm.update_llm_config(llm_config_id, { enabled: false })
    }
    async enable_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.llm.update_llm_config(llm_config_id, { enabled: true })
    }
    async delete_llm_config (llm_config_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/llm/config/${llm_config_id}`, { method: 'DELETE' })
    }
    async load_agent_llm_bindings (agent_id: string, provider_lookup?: Map<string, ILlmProvider>): Promise<IAgentLlmBinding[]> {
        try {
            const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/llm/list`)
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
    async load_user_llm_access (user_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`)
        return result.items || [ ]
    }
    async grant_user_llm_access (user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`, {
            method: 'POST',
            body: JSON.stringify({ llmConfigId: llm_config_id }),
        })
        return result.items || [ ]
    }
    async revoke_user_llm_access (user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access?llmConfigId=${encodeURIComponent(llm_config_id)}`, {
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
            const result = await this.chat.agent.api_fetch(`/agent/${aid}/llm/selectable`)
            // 防止快速切换 agent 时旧请求覆盖新数据
            if (aid !== this.chat.agent_id)
                return [ ]
            const items: ISelectableLlmInfo[] = (result.items || [ ]).map((item: any) => ({
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
