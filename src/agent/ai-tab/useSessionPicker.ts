import { useEffect, useState } from 'react'

import { t } from '@i18n'
import { model } from '@model'
import type { ChatModel } from '@/agent/model.ts'
import type { ISession } from '@/agent/model/types.ts'

export function use_session_picker (chat: ChatModel, open: boolean) {
    const { agent_id, agents, sessions } = chat.use(['agent_id', 'agents', 'sessions'])
    const [selected_agent, set_selected_agent] = useState(agent_id)
    const [search, set_search] = useState('')
    const [cache, set_cache] = useState<Record<string, ISession[]>>({ })
    const searching = Boolean(search)
    
    useEffect(() => {
        if (open) {
            set_selected_agent(agent_id)
            set_search('')
        }
    }, [open, agent_id])
    
    useEffect(() => {
        if (!open)
            return
        let cancelled = false
        // 搜索覆盖所有 Agent；浏览时仅刷新选中的 Agent，不改变当前对话。
        const agent_ids = searching ? agents.map(agent => agent.agentId) : [selected_agent]
        for (const id of new Set(agent_ids.filter(Boolean)))
            load_sessions(id).catch(error => {
                if (!cancelled)
                    model.message?.error(error instanceof Error ? error.message : t('加载会话失败'))
            })
            
        async function load_sessions (id: string) {
            const items: ISession[] = [ ]
            const seen = new Set<string>()
            const limit = 100
            for (let offset = 0;  ;  offset += limit) {
                const result = await chat.session.list_sessions({ agentId: id, offset, limit })
                if (cancelled)
                    return
                // 后端忽略 offset 时停止，避免重复数据和无限请求。
                const new_items = result.items.filter(session => !seen.has(session.sessionId))
                if (!new_items.length)
                    break
                for (const session of new_items)
                    seen.add(session.sessionId)
                items.push(...new_items)
                if (result.items.length !== limit || result.total !== undefined && items.length >= result.total)
                    break
            }
            set_cache(previous => ({ ...previous, [id]: items }))
        }
        return () => { cancelled = true }
    }, [open, selected_agent, searching, agents, chat])
    
    function agent_sessions (id: string) {
        return cache[id] ?? sessions.filter(session => session.agentId === id)
    }
    
    const items = searching ? agents.flatMap(agent => agent_sessions(agent.agentId)) : agent_sessions(selected_agent)
    const names = new Map(agents.map(agent => [agent.agentId, agent.agentName]))
    const rows = items.map(session => ({
        session,
        title: searching ? `${names.get(session.agentId) || session.agentId}/${session.title || t('新会话')}` : session.title || t('新会话'),
    })).filter(row => row.title.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (Date.parse(b.session.updateTime || '') || 0) - (Date.parse(a.session.updateTime || '') || 0))
        
    return { agents, selected_agent, set_selected_agent, search, set_search, searching, rows }
}
