import { t } from '@i18n'
import { model } from '@model'
import type { ChatModel } from '@/agent/model.ts'

import type { AgentAuthSubjectType, IAccessInfo, IAgentInfo } from './types.ts'
import { format_agent_bus_error, get_auth_subject_parameter } from './helpers.ts'
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


export function clean_json_string (raw: string): string {
    let result = ''
    let in_string = false
    let is_escaped = false
    
    for (let i = 0;  i < raw.length;  i++) {
        const char = raw[i]
        const code = raw.charCodeAt(i)
        
        if (in_string) {
            if (is_escaped) {
                result += char
                is_escaped = false
                continue
            }
            if (char === '\\') {
                result += char
                is_escaped = true
                continue
            }
            if (char === '"') {
                result += char
                in_string = false
                continue
            }
            if (code < 0x20) {
                if (char === '\n')
                    result += '\\n'
                else if (char === '\r')
                    result += '\\r'
                else if (char === '\t')
                    result += '\\t'
                else if (char === '\b')
                    result += '\\b'
                else if (char === '\f')
                    result += '\\f'
                else
                    result += `\\u${code.toString(16).padStart(4, '0')}`
                continue
            }
            result += char
        } else {
            if (char === '"')
                in_string = true
            result += char
        }
    }
    
    return result
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


function localize_builtin_text (value: string | undefined, config: Record<string, any>) {
    if (!value || !config.builtin)
        return value
    return t(value.replace(/\r\n/g, '\n').trim())
}


export class ChatAgentModel {
    constructor (private chat: ChatModel) { }
    private async api_request (path: string, options: RequestInit = { }, retried = false): Promise<Response> {
        const url = /^https?:\/\//.test(path) ? path : `${this.chat.base_url}${path}`
        const token = model.agent_bus_ticket.replace(/[\r\n]/g, '')
        const is_form_data = typeof FormData !== 'undefined' && options.body instanceof FormData
        const headers: Record<string, string> = {
            ...(!is_form_data ? { 'Content-Type': 'application/json' } : { }),
            ...(token ? { Authorization: `Bearer ${token}` } : { }),
        }
        // 合并调用方传入的额外 headers
        if (options.headers)
            Object.assign(headers, options.headers)
        const { headers: _ignored, ...rest_options } = options
        const response = await fetch(url, { ...rest_options, headers })
        if (response.status === 401) {
            // ticket 可能已过期，web 的登录还在的话重新申请一个再试一次
            if (!retried && await model.refresh_agent_bus_ticket())
                return this.chat.agent.api_request(path, options, true)
            this.chat.agent.handle_auth_failed()
            throw new Error('Unauthorized')
        }
        if (!response.ok) {
            const text = await response.text()
            let parsed: any
            try { parsed = JSON.parse(text) } catch { parsed = { message: text } }
            if (response.status === 403)
                throw new Error(agent_access_denied_message())
            const raw_message = parsed?.error?.message || parsed?.message || response.statusText
            const message = format_agent_bus_error(raw_message, this.chat.agents)
            throw new Error(is_no_available_llm_config_error(message) ? no_available_llm_config_message() : message)
        }
        return response
    }
    // 响应里的 size 是本页条数而非总数，只能用 total 判断是否取完；max_pages 防止后端忽略 offset 时死循环
    async load_agent_page_items (path: string, limit = 100, max_pages = 20): Promise<any[]> {
        const items: any[] = [ ]
        for (let page = 0;  page < max_pages;  page++) {
            const search = new URLSearchParams({ offset: String(page * limit), limit: String(limit) })
            const result = await this.chat.agent.api_fetch(`${path}?${search}`)
            const page_items = result.items || [ ]
            items.push(...page_items)
            const total = Number(result.total)
            // 本页不足 limit 说明已是末页；多于 limit 说明后端忽略了分页参数，已一次性返回全部
            if (page_items.length !== limit || Number.isFinite(total) && items.length >= total)
                break
        }
        return items
    }
    set_active_agent (agent_id: string, agents = this.chat.agents) {
        this.chat.runtime.interrupt_chat()
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
            has_more_messages: false,
            loading_older_messages: false,
            buffered_messages: [ ],
            selected_llm_config_id: '',
            use_native_tool_calling: true,
            latest_ddb_result: null,
            agent_status: { status: 'idle' },
        })
        this.chat._first_message_seq = 0
        if (agent_id)
            this.chat.llm.load_selectable_llms(agent_id)
    }
    async api_fetch (path: string, options: RequestInit = { }, retried = false): Promise<any> {
        const response = await this.chat.agent.api_request(path, options, retried)
        
        const text = await response.text()
        let result: any
        try {
            result = JSON.parse(text)
        } catch {
            try {
                result = JSON.parse(clean_json_string(text))
            } catch {
                throw new Error(text || 'Invalid JSON response')
            }
        }
        
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
    async api_fetch_blob (path: string, options: RequestInit = { }): Promise<Blob> {
        return (await this.chat.agent.api_request(path, options)).blob()
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
        const config = parse_agent_config(a.config)
        return {
            agentId: a.agentId,
            agentName: a.agentName || a.agentId,
            ownerUserId: a.ownerUserId,
            description: localize_builtin_text(a.description, config),
            systemPrompt: localize_builtin_text(a.systemPrompt, config),
            llmConfigId: a.llmConfigId,
            config,
            status: a.status,
            statusName: a.statusName || '',
            createTime: a.createTime,
            updateTime: a.updateTime,
        }
    }
    async load_agents () {
        try {
            const accessible_items = await this.chat.agent.load_agent_page_items('/agent/accessible')
            const can_manage_agents = model.admin || accessible_items.some((a: any) => a.myPermission === 'AGENT_ADMIN')
            let result_items = accessible_items
            // 先通过运行时接口确认权限，普通用户不试探管控接口。
            if (can_manage_agents)
                try {
                    result_items = await this.chat.agent.load_agent_page_items('/agent/list')
                } catch (error) {
                    console.warn('Failed to list managed agents, fallback to accessible agents:', error)
                }
            const items: IAgentInfo[] = result_items.map((a: any) => this.chat.agent.map_agent(a))
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
        const subject_type: AgentAuthSubjectType = item.subjectType === 'GROUP' || (!item.subjectType && item.groupId) ? 'GROUP' : 'USER'
        const subject_id = item.subjectId || (subject_type === 'GROUP' ? item.groupId : item.userId)
        return {
            ...item,
            userId: subject_type === 'USER' ? subject_id : item.userId,
            groupId: subject_type === 'GROUP' ? subject_id : item.groupId,
            subjectType: subject_type,
            subjectId: subject_id,
            permission: item.permission,
        }
    }
    // 授权列表接口默认 limit = 100，必须翻页拉全，否则判断用户是否已授权会漏
    async load_agent_auth (agent_id: string): Promise<IAccessInfo[]> {
        return (await this.chat.agent.load_agent_page_items(`/agent/${agent_id}/auth/list`))
            .map((item: any) => this.chat.agent._map_access_info(item))
    }
    async grant_agent_auth (agent_id: string, subject_type: AgentAuthSubjectType, subject_id: string): Promise<IAccessInfo[]> {
        const [subject_key, subject_value] = get_auth_subject_parameter(subject_type, subject_id)
        await this.chat.agent.api_fetch(`/agent/${agent_id}/auth`, {
            method: 'POST',
            body: JSON.stringify({ [subject_key]: subject_value }),
        })
        return this.chat.agent.load_agent_auth(agent_id)
    }
    async revoke_agent_auth (agent_id: string, subject_type: AgentAuthSubjectType, subject_id: string): Promise<IAccessInfo[]> {
        const [subject_key, subject_value] = get_auth_subject_parameter(subject_type, subject_id)
        await this.chat.agent.api_fetch(`/agent/${agent_id}/auth?${subject_key}=${encodeURIComponent(subject_value)}`, {
            method: 'DELETE',
        })
        return this.chat.agent.load_agent_auth(agent_id)
    }
    async load_global_agent_admins (): Promise<IAccessInfo[]> {
        return (await this.chat.agent.load_agent_page_items('/admin/access'))
            .map((item: any) => this.chat.agent._map_access_info(item))
    }
    async grant_global_agent_admin (subject_type: AgentAuthSubjectType, subject_id: string): Promise<IAccessInfo[]> {
        const [subject_key, subject_value] = get_auth_subject_parameter(subject_type, subject_id)
        await this.chat.agent.api_fetch('/admin/access', {
            method: 'POST',
            body: JSON.stringify({ [subject_key]: subject_value }),
        })
        return this.chat.agent.load_global_agent_admins()
    }
    async revoke_global_agent_admin (subject_type: AgentAuthSubjectType, subject_id: string): Promise<IAccessInfo[]> {
        const [subject_key, subject_value] = get_auth_subject_parameter(subject_type, subject_id)
        await this.chat.agent.api_fetch(`/admin/access?${subject_key}=${encodeURIComponent(subject_value)}`, {
            method: 'DELETE',
        })
        return this.chat.agent.load_global_agent_admins()
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
    get_turn_llm_config_id () {
        return this.chat.agent.get_effective_llm_config_id() ||
            this.chat.agent.get_llm_for_tool_call_mode()?.llmConfigId ||
            ''
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
        if (!['idle', 'error'].includes(this.chat.agent_status.status) || this.chat.sse_controller)
            return
        const selected_llm_config_id = this.chat.agent.get_effective_llm_config_id(llm_config_id)
        this.chat.set({
            selected_llm_config_id,
            use_native_tool_calling: this.chat.agent.should_use_native_tool_calling(selected_llm_config_id),
        })
    }
}
