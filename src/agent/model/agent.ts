import { t } from '@i18n'
import { model, storage_keys } from '@model'

import type { ChatCompletionOptions } from '@/agent/tool_call_adapters.ts'
import type { IAccessInfo, IAgentInfo, ISelectableLlmInfo } from './types.ts'
import { AGENT_ID_KEY } from './constants.ts'

export const chat_model_agent_actions = {
    should_attach_agent_header (this: any, path: string, options: RequestInit) {
        if (!this.agent_id)
            return false
            
        const url = new URL(path, this.base_url)
        const pathname = url.pathname.replace(/^\/agent-bus\/v1/, '')
        if (pathname.startsWith('/agent/') || url.searchParams.has('agentId'))
            return false
            
        if (/^\/skill\/[^/]+\/(catalog|context|bindings|user\/[^/]+\/denied)$/.test(pathname))
            return false
            
        if (typeof options.body === 'string')
            try {
                const body = JSON.parse(options.body)
                if (body && typeof body === 'object' && 'agentId' in body)
                    return false
            } catch { }
            
        return true
    },
    
    
    async api_fetch (this: any, path: string, options: RequestInit = { }): Promise<any> {
        const url = /^https?:\/\//.test(path) ? path : `${this.base_url}${path}`
        const token = (localStorage.getItem(storage_keys.agent_bus_token) || '').replace(/[\r\n]/g, '')
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : { }),
            ...(this.should_attach_agent_header(path, options) ? { 'x-agent-id': this.agent_id } : { }),
        }
        
        // 合并调用方传入的额外 headers
        if (options.headers)
            Object.assign(headers, options.headers)
            
        const { headers: _ignored, ...rest_options } = options
        const response = await fetch(url, { ...rest_options, headers })
        
        if (response.status === 403) {
            this.handle_auth_failed()
            throw new Error('Access denied')
        }
        
        if (!response.ok) {
            const text = await response.text()
            let parsed: any
            try { parsed = JSON.parse(text) } catch { parsed = { message: text } }
            
            // 检查 BUS_AUTH_FAILED 错误码
            const error_code = parsed?.error?.code || parsed?.headers?.busErrorCode
            if (error_code === 'BUS_AUTH_FAILED') {
                this.handle_auth_failed()
                throw new Error('Access denied')
            }
            
            throw new Error(parsed?.error?.message || parsed?.message || response.statusText)
        }
        
        const result = await response.json()
        
        if (result.type === 'ERROR') {
            const error_code = result.error?.code || result.headers?.busErrorCode
            if (error_code === 'BUS_AUTH_FAILED') {
                this.handle_auth_failed()
                throw new Error('Access denied')
            }
            throw new Error(result.error?.message || 'Unknown error')
        }
        
        const payload = result.payload ?? result.data ?? result
        if (payload?.code === 'WORKSPACE_REDIRECT' && payload.workspaceBaseUrl && payload.retryPath)
            return this.api_fetch(`${payload.workspaceBaseUrl}${payload.retryPath}`, options)
        return payload
    },
    
    
    handle_auth_failed (this: any) {
        console.warn('Agent-bus auth failed, redirecting to login')
        localStorage.removeItem(storage_keys.agent_bus_token)
        localStorage.removeItem(storage_keys.ticket)
        localStorage.removeItem(storage_keys.username)
        model.set({ logined: false, username: 'guest', admin: false })
        model.goto_login()
    },
    
    
    async init (this: any) {
        try {
            this.set({ loading: true })
            
            await this.load_agents()
            
            // 没有 agent 时不继续初始化，由 UI 引导用户创建
            if (!this.agent_id)
                return
                
            await Promise.all([
                this.load_sessions(),
                this.load_selectable_llms(),
                this.load_workspaces(),
            ])
        } catch (error) {
            console.error('Chat init failed:', error)
            model.message?.error(t('AI 助手初始化失败'))
        } finally {
            this.set({ loading: false })
        }
    },
    
    
    map_agent (this: any, a: any): IAgentInfo {
        return {
            agentId: a.agentId,
            agentName: a.agentName || a.agentId,
            ownerUserId: a.ownerUserId,
            description: a.description,
            systemPrompt: a.systemPrompt,
            llmConfigId: a.llmConfigId,
            status: a.status,
            statusName: a.statusName || '',
            createTime: a.createTime,
            updateTime: a.updateTime,
        }
    },
    
    
    async load_agents (this: any) {
        try {
            let result: any
            try {
                result = await this.api_fetch('/agent/list')
            } catch (error) {
                console.warn('Failed to list owned agents, fallback to accessible agents:', error)
                result = await this.api_fetch('/agent/accessible')
            }
            const items: IAgentInfo[] = (result.items || [ ]).map((a: any) => this.map_agent(a))
            this.set({ agents: items })
            
            // 如果缓存的 agent_id 仍然有效，继续使用
            if (this.agent_id) {
                const cached = items.find(a => a.agentId === this.agent_id && a.statusName === 'ACTIVE')
                if (cached)
                    return
            }
            
            // 选择第一个 ACTIVE agent
            const active = items.find(a => a.statusName === 'ACTIVE')
            if (active) {
                this.set({ agent_id: active.agentId })
                localStorage.setItem(AGENT_ID_KEY, active.agentId)
            } else {
                this.set({ agent_id: '' })
                localStorage.removeItem(AGENT_ID_KEY)
            }
        } catch (e) {
            console.warn('Failed to list agents:', e)
            this.set({ agents: [ ], agent_id: '' })
            localStorage.removeItem(AGENT_ID_KEY)
        }
    },
    
    
    async load_all_agents (this: any): Promise<IAgentInfo[]> {
        const result = await this.api_fetch('/agent/list')
        return (result.items || [ ]).map((a: any) => this.map_agent(a))
    },
    
    
    async get_agent (this: any, agent_id: string): Promise<IAgentInfo> {
        return this.map_agent(await this.api_fetch(`/agent/${agent_id}`))
    },
    
    
    async register_agent (this: any, params: {
        agentName: string
        description?: string
        systemPrompt?: string
    }): Promise<IAgentInfo> {
        const result = await this.api_fetch('/agent/register', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        
        const agent_id = result.agentId || result.agent_id || result.id
        if (!agent_id)
            throw new Error('Register response missing agentId')
            
        // 激活
        const activated = await this.activate_agent(agent_id)
        
        const agent: IAgentInfo = {
            agentId: activated.agentId || agent_id,
            agentName: activated.agentName || params.agentName,
            description: activated.description || params.description,
            systemPrompt: activated.systemPrompt || params.systemPrompt,
            status: activated.status ?? 1,
            statusName: activated.statusName || 'ACTIVE',
            createTime: activated.createTime,
            updateTime: activated.updateTime,
        }
        
        this.set({
            agents: [...this.agents, agent],
            agent_id: agent.agentId,
        })
        localStorage.setItem(AGENT_ID_KEY, agent.agentId)
        
        return agent
    },
    
    
    async activate_agent (this: any, agent_id: string) {
        const result = await this.api_fetch(`/agent/${agent_id}/activate`, { method: 'POST' })
        
        // 更新本地列表中的状态
        const agents = this.agents.map(a =>
            a.agentId === agent_id
                ? { ...a, status: result.status ?? 1, statusName: result.statusName || 'ACTIVE' }
                : a
        )
        this.set({ agents, agent_id })
        localStorage.setItem(AGENT_ID_KEY, agent_id)
        
        return result
    },
    
    
    async suspend_agent (this: any, agent_id: string) {
        const result = await this.api_fetch(`/agent/${agent_id}/suspend`, { method: 'POST' })
        const agents = this.agents.map(a =>
            a.agentId === agent_id
                ? { ...a, status: result.status ?? a.status, statusName: result.statusName || 'SUSPENDED' }
                : a
        )
        this.set({ agents })
        return result
    },
    
    
    async update_agent (this: any, agent_id: string, updates: Record<string, any>) {
        const result = await this.api_fetch(`/agent/${agent_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
        const agents = this.agents.map(a =>
            a.agentId === agent_id
                ? {
                    ...a,
                    description: result.description ?? updates.description ?? a.description,
                    systemPrompt: result.systemPrompt ?? updates.systemPrompt ?? a.systemPrompt,
                    llmConfigId: result.llmConfigId ?? updates.llmConfigId ?? a.llmConfigId,
                    updateTime: result.updateTime ?? a.updateTime,
                }
                : a
        )
        this.set({ agents })
        return result
    },
    
    
    async delete_agent (this: any, agent_id: string) {
        await this.api_fetch(`/agent/${agent_id}/delete`, { method: 'POST' })
        const new_agents = this.agents.filter(a => a.agentId !== agent_id)
        
        if (this.agent_id === agent_id) {
            const next = new_agents.find(a => a.statusName === 'ACTIVE')
            const next_id = next?.agentId || ''
            this.set({ agent_id: next_id, agents: new_agents })
            if (next_id)
                localStorage.setItem(AGENT_ID_KEY, next_id)
            else
                localStorage.removeItem(AGENT_ID_KEY)
        } else
            this.set({ agents: new_agents })
    },
    
    
    _map_access_info (this: any, item: any): IAccessInfo {
        return {
            ...item,
            userId: item.userId || item.subjectId,
            subjectId: item.subjectId,
            permission: item.permission,
        }
    },
    
    
    async load_agent_auth (this: any, agent_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth/list`)
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    },
    
    
    async grant_agent_auth (this: any, agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth`, {
            method: 'POST',
            body: JSON.stringify({ userId: user_id }),
        })
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    },
    
    
    async revoke_agent_auth (this: any, agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    },
    
    
    async load_global_agent_admins (this: any): Promise<IAccessInfo[]> {
        const result = await this.api_fetch('/admin/access')
        return result.items || [ ]
    },
    
    
    async grant_global_agent_admin (this: any, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch('/admin/access', {
            method: 'POST',
            body: JSON.stringify({ userId: user_id }),
        })
        return result.items || [ ]
    },
    
    
    async revoke_global_agent_admin (this: any, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/admin/access?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return result.items || [ ]
    },
    
    
    select_agent (this: any, agent_id: string) {
        this.set({
            agent_id,
            sessions: [ ],
            current_session_id: '',
            messages: [ ],
            selected_llm_config_id: '',
            use_native_tool_calling: true,
            selectable_llms: [ ],
            latest_ddb_result: null,
        })
        localStorage.setItem(AGENT_ID_KEY, agent_id)
        // 异步加载新 agent 的可选 LLM 列表
        this.load_selectable_llms(agent_id)
    },
    
    
    get_llm_for_tool_call_mode (this: any, llm_config_id = this.selected_llm_config_id, llms = this.selectable_llms) {
        if (llm_config_id)
            return llms.find(llm => llm.llmConfigId === llm_config_id)
        return llms.find(llm => llm.isAgentDefault) || llms[0]
    },
    
    
    should_use_native_tool_calling (this: any, llm_config_id = this.selected_llm_config_id, llms = this.selectable_llms) {
        const llm = this.get_llm_for_tool_call_mode(llm_config_id, llms)
        return llm?.custom?.tool_call !== false
    },
    
    
    select_llm_config (this: any, llm_config_id: string) {
        this.set({
            selected_llm_config_id: llm_config_id,
            use_native_tool_calling: this.should_use_native_tool_calling(llm_config_id),
        })
    }
}

export type ChatModelAgentActions = typeof chat_model_agent_actions
