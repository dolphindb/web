import type { IMemoryEntry, IMemoryStats } from './types.ts'

export const chat_model_memory_actions = {
    async store_memory (this: any, memory: {
        agentId: string
        scope?: 'agent' | 'user'
        category: string
        content: string
        importance: number
        metadata?: Record<string, unknown>
        source?: string
        sourceRef?: string
        expireTime?: number
    }): Promise<IMemoryEntry> {
        return this.api_fetch('/memory/store', {
            method: 'POST',
            body: JSON.stringify(memory),
        })
    },
    
    
    async get_memory (this: any, memory_id: string): Promise<IMemoryEntry> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`)
    },
    
    
    async update_memory (this: any, memory_id: string, updates: Partial<IMemoryEntry>): Promise<IMemoryEntry> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    },
    
    
    async delete_memory (this: any, memory_id: string): Promise<{ memoryId: string, deleted: boolean }> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`, { method: 'DELETE' })
    },
    
    
    async search_memory (this: any, params: {
        agentId: string
        targetUserId?: string
        scope?: 'agent' | 'user'
        category?: string
        textQuery?: string
        textMatchMode?: 'any' | 'all'
        topK?: number
        minImportance?: number
        sortBy?: 'RECENCY' | 'IMPORTANCE' | 'RELEVANCE' | 'TEXT_SEARCH' | 'HYBRID'
    }): Promise<{ items: IMemoryEntry[], size: number }> {
        const result = await this.api_fetch('/memory/search', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return { ...result, items: result.items || [ ] }
    },
    
    
    async list_memory_by_category (this: any, params: { agentId: string, category: string, offset?: number, limit?: number }): Promise<{ items: IMemoryEntry[], size: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams({
            agentId: params.agentId,
            category: params.category,
        })
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        const result = await this.api_fetch(`/memory/list?${search}`)
        return { ...result, items: result.items || [ ] }
    },
    
    
    async load_memory_stats (this: any, agent_id: string): Promise<IMemoryStats> {
        return this.api_fetch(`/memory/stats?agentId=${encodeURIComponent(agent_id)}`)
    }
}

export type ChatModelMemoryActions = typeof chat_model_memory_actions
