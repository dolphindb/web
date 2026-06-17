import type { ChatModel } from '@/agent/model.ts'
import type { IMemoryConfigResult, IMemoryEntry, IMemoryJob, IMemoryPersonalSettings, IMemoryResetResult, IMemoryStats, IMemoryTriggerResult } from './types.ts'

export class ChatMemoryModel {
    constructor (private chat: ChatModel) { }
    async get_personal_settings (agent_id: string): Promise<IMemoryPersonalSettings> {
        return this.chat.agent.api_fetch(`/memory/personal/settings?agentId=${encodeURIComponent(agent_id)}`)
    }
    async set_personal_enabled (agent_id: string, enabled: boolean): Promise<IMemoryPersonalSettings> {
        return this.chat.agent.api_fetch('/memory/personal/settings', {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id, enabled }),
        })
    }
    async store_memory (memory: {
        agentId: string
        category: string
        content: string
        importance: number
        metadata?: Record<string, unknown>
        sourceRefs?: string
        expireTime?: number
    }, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<IMemoryEntry> {
        return this.chat.agent.api_fetch(scope_type === 'agent_public' ? '/admin/memory/public' : '/memory/personal', {
            method: 'POST',
            body: JSON.stringify(memory),
        })
    }
    async get_memory (memory_id: string, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<IMemoryEntry> {
        return this.chat.agent.api_fetch(`${scope_type === 'agent_public' ? '/admin/memory/public' : '/memory/personal'}/${encodeURIComponent(memory_id)}`)
    }
    async update_memory (memory_id: string, updates: Partial<IMemoryEntry>, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<IMemoryEntry> {
        return this.chat.agent.api_fetch(`${scope_type === 'agent_public' ? '/admin/memory/public' : '/memory/personal'}/${encodeURIComponent(memory_id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    async delete_memory (memory_id: string, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<{ memoryId: string, deleted: boolean }> {
        return this.chat.agent.api_fetch(`${scope_type === 'agent_public' ? '/admin/memory/public' : '/memory/personal'}/${encodeURIComponent(memory_id)}`, { method: 'DELETE' })
    }
    async search_memory (params: {
        agentId: string
        category?: string
        memoryType?: string
        textQuery?: string
        textMatchMode?: 'any' | 'all'
        topK?: number
        minImportance?: number
        sortBy?: 'RECENCY' | 'IMPORTANCE' | 'TEXT_SEARCH' | 'RANKED'
    }, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<{ items: IMemoryEntry[], size: number }> {
        const result = await this.chat.agent.api_fetch(scope_type === 'agent_public' ? '/admin/memory/public/search' : '/memory/personal/search', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return { ...result, items: result.items || [ ] }
    }
    async list_memory_by_category (params: { agentId: string, category: string, offset?: number, limit?: number }, scope_type: 'user_personal' | 'agent_public' = 'user_personal'): Promise<{ items: IMemoryEntry[], size: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams({
            agentId: params.agentId,
            category: params.category,
        })
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const result = await this.chat.agent.api_fetch(`${scope_type === 'agent_public' ? '/admin/memory/public/list' : '/memory/personal/list'}?${search}`)
        return { ...result, items: result.items || [ ] }
    }
    async load_memory_stats (agent_id: string): Promise<IMemoryStats> {
        return this.chat.agent.api_fetch(`/admin/memory/stats?agentId=${encodeURIComponent(agent_id)}`)
    }
    async forget_session (agent_id: string, session_id: string): Promise<{ agentId: string, sessionId: string, forgotten: boolean }> {
        return this.chat.agent.api_fetch('/memory/personal/forgetSession', {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id, sessionId: session_id }),
        })
    }
    async get_memory_config (agent_id: string): Promise<IMemoryConfigResult> {
        return this.chat.agent.api_fetch(`/admin/memory/config?agentId=${encodeURIComponent(agent_id)}`)
    }
    async update_memory_config (agent_id: string, memory_config: Record<string, unknown>): Promise<IMemoryConfigResult> {
        return this.chat.agent.api_fetch('/admin/memory/config', {
            method: 'PUT',
            body: JSON.stringify({ agentId: agent_id, memoryConfig: memory_config }),
        })
    }
    async list_memory_jobs (params: {
        agentId: string
        kind?: string
        status?: string
        targetUserId?: string
        offset?: number
        limit?: number
    }): Promise<{ items: IMemoryJob[], size: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams({ agentId: params.agentId })
        if (params.kind)
            search.set('kind', params.kind)
        if (params.status)
            search.set('status', params.status)
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const result = await this.chat.agent.api_fetch(`/admin/memory/jobs?${search}`)
        return { ...result, items: result.items || [ ] }
    }
    async retry_memory_job (agent_id: string, kind: string, job_key: string): Promise<IMemoryJob> {
        return this.chat.agent.api_fetch(`/admin/memory/jobs/${encodeURIComponent(kind)}/${encodeURIComponent(job_key)}/retry`, {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id }),
        })
    }
    async get_memory_job (agent_id: string, kind: string, job_key: string): Promise<IMemoryJob> {
        return this.chat.agent.api_fetch(`/admin/memory/jobs/${encodeURIComponent(kind)}/${encodeURIComponent(job_key)}?agentId=${encodeURIComponent(agent_id)}`)
    }
    async trigger_memory_pipeline (agent_id: string, params: { sessionId?: string, targetUserId?: string }): Promise<IMemoryTriggerResult> {
        return this.chat.agent.api_fetch('/admin/memory/pipeline/trigger', {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id, ...params }),
        })
    }
    async reset_user_personal_memory (agent_id: string, target_user_id: string, include_memories = true, include_stage1 = true): Promise<IMemoryResetResult> {
        return this.chat.agent.api_fetch('/admin/memory/reset', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id,
                targetUserId: target_user_id,
                includeMemories: include_memories,
                includeStage1: include_stage1,
            }),
        })
    }
}
