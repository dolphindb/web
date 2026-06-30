import { t } from '@i18n'
import { model, storage_keys } from '@model'
import type { ChatModel } from '@/agent/model.ts'

import type { IAccessInfo, IAgentInfo } from './types.ts'
import { chat_shared_model } from './shared.ts'

export function agent_access_denied_message () {
    return t('没有权限访问 AI 助手，请联系管理员授权。')
}

export function no_active_agent_message () {
    return t('当前账号没有可用的 Agent，请联系管理员授权。')
}

export function no_available_llm_config_message () {
    return t('未配置 AI 模型服务，请先在系统设置中完成模型绑定。')
}

export function is_no_available_llm_config_error (message: string) {
    return /no active [il]lm config is available/i.test(message)
}

function parse_agent_config (value: any) {
    if (!value)
        return { }
    if (typeof value === 'string')
        try {
            return JSON.parse(value)
        } catch {
            return { }
        }
    return typeof value === 'object' ? value : { }
}


export class ChatAgentModel {
    constructor (private chat: ChatModel) { }
    async load_agent_page_items (path: string, limit = 100): Promise<any[]> {
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
    set_active_agent (agent_id: string, agents = this.chat.agents) {
        this.chat.runtime.abort_sse()
        this.chat.set({
            agents,
            agent_id,
            sessions: [ ],
            current_session_id: '',
            workspaces: [ ],
            current_workspace_id: '',
            current_workspace: null,
            steps: [ ],
            messages: [ ],
            buffered_messages: [ ],
            selected_llm_config_id: '',
            use_native_tool_calling: true,
            latest_ddb_result: null,
            agent_status: { status: 'idle' },
        })
        if (agent_id)
            this.chat.llm.load_selectable_llms(agent_id)
    }
    async api_fetch (path: string, options: RequestInit = { }): Promise<any> {
        const url = /^https?:\/\//.test(path) ? path : `${this.chat.base_url}${path}`
        const token = (localStorage.getItem(storage_keys.agent_bus_token) || '').replace(/[\r\n]/g, '')
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : { }),
        }
        
        // 合并调用方传入的额外 headers
        if (options.headers)
            Object.assign(headers, options.headers)
            
        const { headers: _ignored, ...rest_options } = options
        const response = await fetch(url, { ...rest_options, headers })
        
        if (response.status === 401) {
            this.chat.agent.handle_auth_failed()
            throw new Error('Unauthorized')
        }
        
        if (!response.ok) {
            const text = await response.text()
            let parsed: any
            try { parsed = JSON.parse(text) } catch { parsed = { message: text } }
            
            if (response.status === 403)
                throw new Error(agent_access_denied_message())
                
            const message = parsed?.error?.message || parsed?.message || response.statusText
            throw new Error(is_no_available_llm_config_error(message) ? no_available_llm_config_message() : message)
        }
        
        const result = await response.json()
        
        if (result.type === 'ERROR') {
            if (Number(result.headers?.httpStatus) === 403)
                throw new Error(agent_access_denied_message())
            const message = result.error?.message || 'Unknown error'
            throw new Error(is_no_available_llm_config_error(message) ? no_available_llm_config_message() : message)
        }
            
            
        const payload = result.payload ?? result.data ?? result
        if (payload?.code === 'WORKSPACE_REDIRECT' && payload.workspaceBaseUrl && payload.retryPath)
            return this.chat.agent.api_fetch(`${payload.workspaceBaseUrl}${payload.retryPath}`, options)
        return payload
    }
    handle_auth_failed () {
        console.warn('Agent-bus auth failed, redirecting to login')
        model.clear_login_auth()
        this.chat.agent.set_active_agent('', [ ])
        this.chat.set({ can_manage_agents: false })
        model.set({ logined: false, username: 'guest', admin: false })
        model.goto_login()
    }
    async init () {
        try {
            this.chat.set({ loading: true })
            
            await this.chat.agent.load_agents()
            
            // 没有 agent 时不继续初始化，由 UI 引导用户创建
            if (!this.chat.agent_id)
                return
                
            await Promise.all([
                this.chat.session.load_sessions(),
                this.chat.llm.load_selectable_llms(),
                this.chat.workspace.load_workspaces(),
            ])
        } catch (error) {
            console.error('Chat init failed:', error)
            model.message?.error(t('AI 助手初始化失败'))
        } finally {
            this.chat.set({ loading: false })
        }
    }
    map_agent (a: any): IAgentInfo {
        return {
            agentId: a.agentId,
            agentName: a.agentName || a.agentId,
            ownerUserId: a.ownerUserId,
            description: a.description,
            systemPrompt: a.systemPrompt,
            llmConfigId: a.llmConfigId,
            config: parse_agent_config(a.config),
            status: a.status,
            statusName: a.statusName || '',
            createTime: a.createTime,
            updateTime: a.updateTime,
        }
    }
    async load_agents () {
        try {
            let result: any
            let can_manage_agents = true
            try {
                result = { items: await this.chat.agent.load_agent_page_items('/agent/list') }
            } catch (error) {
                console.warn('Failed to list owned agents, fallback to accessible agents:', error)
                can_manage_agents = false
                result = { items: await this.chat.agent.load_agent_page_items('/agent/accessible') }
            }
            const items: IAgentInfo[] = (result.items || [ ]).map((a: any) => this.chat.agent.map_agent(a))
            this.chat.set({ last_agent_load_error: '', can_manage_agents })
            
            // 如果当前运行时 agent_id 仍然有效，继续使用
            if (this.chat.agent_id) {
                const cached = items.find(a => a.agentId === this.chat.agent_id && a.statusName === 'ACTIVE')
                if (cached) {
                    this.chat.set({ agents: items })
                    return
                }
            }
            
            // 选择第一个 ACTIVE agent
            const active = items.find(a => a.statusName === 'ACTIVE')
            this.chat.agent.set_active_agent(active?.agentId || '', items)
        } catch (e) {
            console.warn('Failed to list agents:', e)
            this.chat.set({ agents: [ ], agent_id: '', can_manage_agents: false, last_agent_load_error: e instanceof Error ? e.message : '' })
        }
    }
    async ensure_active_agent () {
        if (!this.chat.agent_id || !this.chat.agents.some(a => a.agentId === this.chat.agent_id && a.statusName === 'ACTIVE'))
            await this.chat.agent.load_agents()
        return Boolean(this.chat.agent_id && this.chat.agents.some(a => a.agentId === this.chat.agent_id && a.statusName === 'ACTIVE'))
    }
    async load_all_agents (): Promise<IAgentInfo[]> {
        return (await this.chat.agent.load_agent_page_items('/agent/list')).map((a: any) => this.chat.agent.map_agent(a))
    }
    async get_agent (agent_id: string): Promise<IAgentInfo> {
        return this.chat.agent.map_agent(await this.chat.agent.api_fetch(`/agent/${agent_id}`))
    }
    async register_agent (params: {
        agentName: string
        description?: string
        systemPrompt?: string
        config?: Record<string, any>
    }): Promise<IAgentInfo> {
        const result = await this.chat.agent.api_fetch('/agent/register', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        
        const agent_id = result.agentId || result.agent_id || result.id
        if (!agent_id)
            throw new Error('Register response missing agentId')
            
        // 激活
        const activated = await this.chat.agent.activate_agent(agent_id)
        
        const agent: IAgentInfo = {
            agentId: activated.agentId || agent_id,
            agentName: activated.agentName || params.agentName,
            description: activated.description || params.description,
            systemPrompt: activated.systemPrompt || params.systemPrompt,
            config: parse_agent_config(activated.config ?? params.config),
            status: activated.status ?? 1,
            statusName: activated.statusName || 'ACTIVE',
            createTime: activated.createTime,
            updateTime: activated.updateTime,
        }
        
        this.chat.agent.set_active_agent(agent.agentId, [...this.chat.agents.filter(a => a.agentId !== agent.agentId), agent])
        
        return agent
    }
    async activate_agent (agent_id: string) {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/activate`, { method: 'POST' })
        
        // 更新本地列表中的状态
        const agents = this.chat.agents.map(a =>
            a.agentId === agent_id
                ? { ...a, status: result.status ?? 1, statusName: result.statusName || 'ACTIVE' }
                : a
        )
        this.chat.agent.set_active_agent(agent_id, agents)
        
        return result
    }
    async suspend_agent (agent_id: string) {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/suspend`, { method: 'POST' })
        const agents = this.chat.agents.map(a =>
            a.agentId === agent_id
                ? { ...a, status: result.status ?? a.status, statusName: result.statusName || 'SUSPENDED' }
                : a
        )
        this.chat.set({ agents })
        return result
    }
    async update_agent (agent_id: string, updates: Record<string, any>) {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
        const agents = this.chat.agents.map(a =>
            a.agentId === agent_id
                ? {
                    ...a,
                    description: result.description ?? updates.description ?? a.description,
                    systemPrompt: result.systemPrompt ?? updates.systemPrompt ?? a.systemPrompt,
                    llmConfigId: result.llmConfigId ?? updates.llmConfigId ?? a.llmConfigId,
                    config: parse_agent_config(result.config ?? updates.config ?? a.config),
                    updateTime: result.updateTime ?? a.updateTime,
                }
                : a
        )
        this.chat.set({ agents })
        return result
    }
    async delete_agent (agent_id: string) {
        await this.chat.agent.api_fetch(`/agent/${agent_id}/delete`, { method: 'POST' })
        const new_agents = this.chat.agents.filter(a => a.agentId !== agent_id)
        
        if (this.chat.agent_id === agent_id) {
            const next = new_agents.find(a => a.statusName === 'ACTIVE')
            const next_id = next?.agentId || ''
            this.chat.agent.set_active_agent(next_id, new_agents)
        } else
            this.chat.set({ agents: new_agents })
    }
    _map_access_info (item: any): IAccessInfo {
        return {
            ...item,
            userId: item.userId || item.subjectId,
            subjectId: item.subjectId,
            permission: item.permission,
        }
    }
    async load_agent_auth (agent_id: string): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/auth/list`)
        return (result.items || [ ]).map((item: any) => this.chat.agent._map_access_info(item))
    }
    async grant_agent_auth (agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/auth`, {
            method: 'POST',
            body: JSON.stringify({ userId: user_id }),
        })
        return (result.items || [ ]).map((item: any) => this.chat.agent._map_access_info(item))
    }
    async revoke_agent_auth (agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/agent/${agent_id}/auth?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return (result.items || [ ]).map((item: any) => this.chat.agent._map_access_info(item))
    }
    async load_global_agent_admins (): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch('/admin/access')
        return result.items || [ ]
    }
    async grant_global_agent_admin (user_id: string): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch('/admin/access', {
            method: 'POST',
            body: JSON.stringify({ userId: user_id }),
        })
        return result.items || [ ]
    }
    async revoke_global_agent_admin (user_id: string): Promise<IAccessInfo[]> {
        const result = await this.chat.agent.api_fetch(`/admin/access?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return result.items || [ ]
    }
    select_agent (agent_id: string) {
        this.chat.agent.set_active_agent(agent_id)
    }
    get_selectable_llms (agent_id = this.chat.agent_id) {
        return (chat_shared_model.selectable_llms_by_agent_id[agent_id] || [ ])
            .filter(llm => llm.capability !== 'embedding' && llm.enabled !== false && llm.statusName !== 'DELETED')
    }
    has_available_llm_config (agent_id = this.chat.agent_id) {
        return this.chat.agent.get_selectable_llms(agent_id).length > 0
    }
    async ensure_available_llm_config () {
        if (!this.chat.agent_id)
            return false
        if (!this.chat.agent.has_available_llm_config())
            await this.chat.llm.load_selectable_llms()
        return this.chat.agent.has_available_llm_config()
    }
    get_effective_llm_config_id (llm_config_id = this.chat.selected_llm_config_id) {
        return llm_config_id && this.chat.agent.get_selectable_llms().some(llm => llm.llmConfigId === llm_config_id)
            ? llm_config_id
            : ''
    }
    get_llm_for_tool_call_mode (llm_config_id = this.chat.agent.get_effective_llm_config_id(), llms = this.chat.agent.get_selectable_llms()) {
        if (llm_config_id)
            return llms.find(llm => llm.llmConfigId === llm_config_id)
        return llms.find(llm => llm.isAgentDefault) || llms[0]
    }
    should_use_native_tool_calling (llm_config_id = this.chat.agent.get_effective_llm_config_id(), llms = this.chat.agent.get_selectable_llms()) {
        const llm = this.chat.agent.get_llm_for_tool_call_mode(llm_config_id, llms)
        return llm?.custom?.tool_call !== false
    }
    select_llm_config (llm_config_id: string) {
        const selected_llm_config_id = this.chat.agent.get_effective_llm_config_id(llm_config_id)
        this.chat.set({
            selected_llm_config_id,
            use_native_tool_calling: this.chat.agent.should_use_native_tool_calling(selected_llm_config_id),
        })
    }
}
