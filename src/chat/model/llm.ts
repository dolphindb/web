import type { IAgentLlmBinding, IBuiltinInitResult, ILlmConfig, ILlmProvider, ILlmUsageStats, ISelectableLlmInfo, ISkillInfo, IUserLlmAccessInfo } from './types.ts'
import { get_enabled, get_status, get_status_name, normalize_json_object, normalize_json_object_string, optional_positive_number } from './helpers.ts'

export const chat_model_llm_actions = {
    _map_llm_config (this: any, item: any, provider_lookup?: Map<string, ILlmProvider>): ILlmConfig {
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
    },
    
    
    _map_llm_provider (this: any, item: any): ILlmProvider {
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
    },
    
    
    _map_skill (this: any, s: any): ISkillInfo {
        return {
            skillId: s.skillId,
            name: s.name || s.skillName,
            description: s.description,
            enabled: get_enabled(s),
            status: get_status(s),
            statusName: get_status_name(s),
            category: s.category,
            displayName: s.displayName,
            version: s.version,
            license: s.license,
            compatibility: s.compatibility,
            argumentHint: s.argumentHint,
            disableModelInvocation: s.disableModelInvocation,
            userInvocable: s.userInvocable,
            hasInstruction: s.hasInstruction,
            contentRevision: s.contentRevision,
            contentHash: s.contentHash,
            isCommon: s.isCommon,
            ownerUserId: s.ownerUserId,
            metadata: s.metadata,
            schemaVersion: s.schemaVersion,
            extra: s.extra,
            createTime: s.createTime,
            updateTime: s.updateTime,
        }
    },
    
    
    async load_llm_providers (this: any): Promise<ILlmProvider[]> {
        try {
            const result = await this.api_fetch('/llm/provider/list')
            return (result.items || [ ]).map((item: any) => this._map_llm_provider(item))
        } catch {
            return [ ]
        }
    },
    
    
    async register_llm_provider (this: any, provider: {
        name: string
        adapterType: string
        baseUrl: string
        apiKey?: string | null
        enabled?: boolean
        extra?: string
    }): Promise<ILlmProvider> {
        return this.api_fetch('/llm/provider/register', {
            method: 'POST',
            body: JSON.stringify(provider),
        })
    },
    
    
    async update_llm_provider (this: any, provider_id: string, updates: Record<string, any>): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    },
    
    
    async disable_llm_provider (this: any, provider_id: string): Promise<void> {
        await this.update_llm_provider(provider_id, { enabled: false })
    },
    
    
    async enable_llm_provider (this: any, provider_id: string): Promise<void> {
        await this.update_llm_provider(provider_id, { enabled: true })
    },
    
    
    async delete_llm_provider (this: any, provider_id: string): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}`, { method: 'DELETE' })
    },
    
    
    async load_llm_configs (this: any, provider_lookup?: Map<string, ILlmProvider>): Promise<ILlmConfig[]> {
        try {
            const result = await this.api_fetch('/llm/config/list')
            return (result.items || [ ]).map((item: any) => this._map_llm_config(item, provider_lookup))
        } catch {
            return [ ]
        }
    },
    
    
    async register_llm_config (this: any, config: {
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
        return this.api_fetch('/llm/config/register', {
            method: 'POST',
            body: JSON.stringify(config),
        })
    },
    
    
    async update_llm_config (this: any, llm_config_id: string, updates: Record<string, any>): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    },
    
    
    async disable_llm_config (this: any, llm_config_id: string): Promise<void> {
        await this.update_llm_config(llm_config_id, { enabled: false })
    },
    
    
    async enable_llm_config (this: any, llm_config_id: string): Promise<void> {
        await this.update_llm_config(llm_config_id, { enabled: true })
    },
    
    
    async delete_llm_config (this: any, llm_config_id: string): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}`, { method: 'DELETE' })
    },
    
    
    async load_agent_llm_bindings (this: any, agent_id: string, provider_lookup?: Map<string, ILlmProvider>): Promise<IAgentLlmBinding[]> {
        try {
            const result = await this.api_fetch(`/agent/${agent_id}/llm/list`)
            return (result.items || [ ]).map((item: any) => ({
                ...this._map_llm_config(item, provider_lookup),
                isDefault: item.isDefault ?? false,
                priority: item.priority ?? 0,
                accessExtra: item.accessExtra,
            }))
        } catch {
            return [ ]
        }
    },
    
    
    async bind_llm_to_agent (this: any, agent_id: string, llm_config_id: string, is_default = false, priority?: number): Promise<void> {
        const body: Record<string, any> = {
            llmConfigId: llm_config_id,
            isDefault: is_default,
        }
        if (priority !== undefined)
            body.priority = priority
        await this.api_fetch(`/agent/${agent_id}/llm/access`, {
            method: 'POST',
            body: JSON.stringify(body),
        })
    },
    
    
    async unbind_llm_from_agent (this: any, agent_id: string, llm_config_id: string): Promise<void> {
        await this.api_fetch(`/agent/${agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    },
    
    
    async unbind_llm_config (this: any, llm_config_id: string): Promise<void> {
        if (!this.agent_id)
            return
        await this.api_fetch(`/agent/${this.agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    },
    
    
    async load_user_llm_access (this: any, user_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`)
        return result.items || [ ]
    },
    
    
    async grant_user_llm_access (this: any, user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`, {
            method: 'POST',
            body: JSON.stringify({ llmConfigId: llm_config_id }),
        })
        return result.items || [ ]
    },
    
    
    async revoke_user_llm_access (this: any, user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access?llmConfigId=${encodeURIComponent(llm_config_id)}`, {
            method: 'DELETE',
        })
        return result.items || [ ]
    },
    
    
    async load_llm_usage (this: any, params: { agentId: string, targetUserId?: string, startTime?: number, endTime?: number }): Promise<ILlmUsageStats> {
        const search = new URLSearchParams({ agentId: params.agentId })
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        if (params.startTime !== undefined)
            search.set('startTime', String(params.startTime))
        if (params.endTime !== undefined)
            search.set('endTime', String(params.endTime))
        return this.api_fetch(`/llm/usage?${search}`)
    },
    
    
    async init_builtins (this: any, params: { dryRun?: boolean, includeDetails?: boolean }): Promise<IBuiltinInitResult> {
        return this.api_fetch('/builtin/init', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    },
    
    
    async load_builtin_init_status (this: any, include_details = false): Promise<IBuiltinInitResult> {
        return this.api_fetch(`/builtin/init/status?includeDetails=${include_details}`)
    },
    
    
    async load_selectable_llms (this: any, agent_id?: string, provider_lookup?: Map<string, ILlmProvider>): Promise<ISelectableLlmInfo[]> {
        const aid = agent_id || this.agent_id
        if (!aid)
            return [ ]
        try {
            const result = await this.api_fetch(`/agent/${aid}/llm/selectable`)
            // 防止快速切换 agent 时旧请求覆盖新数据
            if (aid !== this.agent_id)
                return [ ]
            const items: ISelectableLlmInfo[] = (result.items || [ ]).map((item: any) => ({
                ...this._map_llm_config(item, provider_lookup),
                source: item.source || 'agent',
                isAgentDefault: item.isAgentDefault ?? false,
                participatesInFallback: item.participatesInFallback ?? false,
                fallbackPriority: item.fallbackPriority ?? null,
            }))
            this.set({
                selectable_llms: items,
                use_native_tool_calling: this.should_use_native_tool_calling(this.selected_llm_config_id, items),
            })
            return items
        } catch {
            if (aid === this.agent_id)
                this.set({ selectable_llms: [ ], use_native_tool_calling: true })
            return [ ]
        }
    }
}

export type ChatModelLlmActions = typeof chat_model_llm_actions
