import type { ChatModel } from '@/agent/model.ts'
import type { IMemoryEntry, IMemoryStats } from './types.ts'

export class ChatMemoryModel {
    constructor (private chat: ChatModel) { }
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
}
