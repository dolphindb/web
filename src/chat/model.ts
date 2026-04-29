import { Model } from 'react-object-model'

import { t } from '@i18n'
import { model, storage_keys } from '@model'

import { init_scripts } from './scripts/init.ts'
import { get_script_handler } from './scripts/index.ts'
import type { ToolContext, ScriptResult } from './scripts/types.ts'
import { build_system_prompt } from './prompt.ts'
import { parse_tool_call } from './tool_call_parser.ts'
import type { ParsedToolCall } from './tool_call_parser.ts'


export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type MessageType = 'system' | 'text' | 'tool_call' | 'tool_result' | 'skill_result' | 'tool_error' | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'error'


export interface IMessage {
    msgId: string
    role: string
    messageType?: string
    content: string
    reasoning_content?: string
    content_object?: unknown
    /** 轻量标记：该消息关联了可展示的 DdbObj 结果 */
    _has_ddb_result?: boolean
    name?: string
    tool_call_id?: string
    tool_calls?: IToolCall[]
}


export interface IToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}


export interface ISession {
    sessionId: string
    agentId: string
    bizUserId: string
    title: string
    status: number
    statusName: string
    llmConfigId?: string
    createTime?: string
    updateTime?: string
}


export interface IAgentStatusEvent {
    status: AgentStatus
    message?: string
    timestamp?: number
}


/** LLM Provider（共享连接信息：adapterType + baseUrl + apiKey） */
export interface ILlmProvider {
    providerId: string
    name: string
    adapterType: string
    baseUrl: string
    apiKey?: string
    extra?: string
    status: number
    statusName: string
}


/** LLM 配置（模型级）：通过 providerId 引用 provider */
export interface ILlmConfig {
    llmConfigId: string
    name: string
    providerId: string
    /** 便捷字段：由前端合并 provider 信息后填充，用于展示 */
    providerName?: string
    /** 便捷字段：由前端合并 provider 信息后填充，用于展示 */
    adapterType?: string
    model: string
    capability?: 'chat' | 'embedding'
    embeddingDimension?: number
    embeddingMetric?: 'euclidean' | 'cosine'
    embeddingNormalize?: boolean
    requestPath: string
    defaultParams?: Record<string, unknown>
    contextWindow?: number
    maxConcurrency?: number
    rateLimitRPM?: number
    timeoutMs?: number
    retryConfig?: Record<string, unknown>
    extra?: string
    status: number
    statusName: string
}


/** Agent-LLM 绑定信息，继承 LlmConfigInfo 并包含绑定级别字段 */
export interface IAgentLlmBinding extends ILlmConfig {
    isDefault: boolean
    priority: number
    accessExtra?: string
}


/** 当前用户在指定 Agent 下可选择的 LLM */
export interface ISelectableLlmInfo extends ILlmConfig {
    source: 'agent' | 'user' | 'both'
    isAgentDefault: boolean
    participatesInFallback: boolean
    fallbackPriority: number | null
}


export interface ISkillInfo {
    skillId: string
    name: string
    description?: string
    status: number
    statusName: string
    category?: string
    displayName?: string
    version?: string
}


export interface ISkillBinding {
    skillId: string
    agentId: string
    enabled: boolean
    descOverride?: string
    skill?: ISkillInfo
}


export interface IAgentInfo {
    agentId: string
    agentName: string
    agentType: string
    ownerUserId?: string
    description?: string
    systemPrompt?: string
    llmConfigId?: string
    status: number
    statusName: string
    createTime?: string
    updateTime?: string
}


const AGENT_ID_KEY = 'ddb.chat.agent_id'
const BIZ_USER_ID_KEY = 'ddb.chat.biz_user_id'

/** 最大工具调用轮次，防止无限循环 */
const MAX_TOOL_TURNS = 20


// 初始化工具注册表
init_scripts()


class ChatModel extends Model<ChatModel> {
    agent_id = localStorage.getItem(AGENT_ID_KEY) || ''
    
    biz_user_id = localStorage.getItem(BIZ_USER_ID_KEY) || ''
    
    agents: IAgentInfo[] = [ ]
    
    sessions: ISession[] = [ ]
    
    current_session_id = ''
    
    messages: IMessage[] = [ ]
    
    buffered_messages: string[] = [ ]
    
    agent_status: IAgentStatusEvent = { status: 'idle' }
    
    sse_controller: AbortController | null = null
    
    /** 缓存的技能列表，工具续传轮次复用 */
    _cached_skills: ISkillInfo[] = [ ]
    
    /** 当前 Agent 下用户可选择的 LLM 列表 */
    selectable_llms: ISelectableLlmInfo[] = [ ]
    
    /** 用户显式选择的 LLM 配置 ID（不选则由后端使用 agent 默认） */
    selected_llm_config_id = ''
    
    /** 最近一次工具执行产生的 DdbObj，用于直接路由到 DataView */
    latest_ddb_result: unknown = null
    
    settings_visible = false
    
    loading = false
    
    _request_seq = 0
    
    _active_request_seq = 0
    
    _interrupted_request_seq = 0
    
    _pending_assistant_msg_ids: string[] = [ ]
    
    
    get base_url (): string {
        const protocol = location.protocol
        const hostname = model.hostname || location.hostname
        const port = model.port || location.port
        return `${protocol}//${hostname}${port ? ':' + port : ''}/agent-bus/v1`
    }
    
    
    async api_fetch (path: string, options: RequestInit = { }): Promise<any> {
        const url = `${this.base_url}${path}`
        const token = (localStorage.getItem(storage_keys.agent_bus_token) || '').replace(/[\r\n]/g, '')
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : { }),
            ...(this.agent_id ? { 'x-agent-id': this.agent_id } : { }),
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
        
        return result.payload ?? result.data ?? result
    }
    
    
    handle_auth_failed () {
        console.warn('Agent-bus auth failed, redirecting to login')
        localStorage.removeItem(storage_keys.agent_bus_token)
        model.goto_login()
    }
    
    
    async init () {
        try {
            this.set({ loading: true })
            
            await this.load_agents()
            
            // 没有 agent 时不继续初始化，由 UI 引导用户创建
            if (!this.agent_id)
                return
                
            await this.ensure_biz_user()
            await Promise.all([
                this.load_sessions(),
                this.load_selectable_llms(),
            ])
        } catch (error) {
            console.error('Chat init failed:', error)
            model.message?.error(t('AI 助手初始化失败'))
        } finally {
            this.set({ loading: false })
        }
    }
    
    
    /** 加载 agent 列表并选中第一个可用的 ACTIVE agent */
    async load_agents () {
        try {
            const result = await this.api_fetch('/agent/list')
            const items: IAgentInfo[] = (result.items || [ ]).map((a: any) => ({
                agentId: a.agentId,
                agentName: a.agentName || a.agentId,
                agentType: a.agentType || '',
                ownerUserId: a.ownerUserId,
                description: a.description,
                systemPrompt: a.systemPrompt,
                llmConfigId: a.llmConfigId,
                status: a.status,
                statusName: a.statusName || '',
                createTime: a.createTime,
                updateTime: a.updateTime,
            }))
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
    }
    
    
    /** 注册新 Agent 并激活 */
    async register_agent (params: {
        agentName: string
        agentType: string
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
            agentType: activated.agentType || params.agentType,
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
    }
    
    
    /** 激活 Agent */
    async activate_agent (agent_id: string) {
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
    }
    
    
    async suspend_agent (agent_id: string) {
        const result = await this.api_fetch(`/agent/${agent_id}/suspend`, { method: 'POST' })
        const agents = this.agents.map(a =>
            a.agentId === agent_id
                ? { ...a, status: result.status ?? a.status, statusName: result.statusName || 'SUSPENDED' }
                : a
        )
        this.set({ agents })
        return result
    }
    
    
    async update_agent (agent_id: string, updates: Record<string, any>) {
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
    }
    
    
    /** 删除 Agent */
    async delete_agent (agent_id: string) {
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
    }
    
    
    /** 选中一个 agent */
    select_agent (agent_id: string) {
        this.set({
            agent_id,
            sessions: [ ],
            current_session_id: '',
            messages: [ ],
            selected_llm_config_id: '',
            selectable_llms: [ ],
            latest_ddb_result: null,
        })
        localStorage.setItem(AGENT_ID_KEY, agent_id)
        // 异步加载新 agent 的可选 LLM 列表
        this.load_selectable_llms(agent_id)
    }
    
    
    async ensure_biz_user () {
        // 尝试使用缓存的 biz_user_id
        if (this.biz_user_id)
            try {
                await this.api_fetch(`/bizuser/${this.biz_user_id}`)
                // 确保已授权
                await this.grant_biz_user_access()
                return
            } catch {
                this.set({ biz_user_id: '' })
                localStorage.removeItem(BIZ_USER_ID_KEY)
            }
            
        // 注册业务用户
        try {
            const result = await this.api_fetch('/bizuser/register', {
                method: 'POST',
                body: JSON.stringify({
                    displayName: model.username || 'web_user'
                })
            })
            this.set({ biz_user_id: result.bizUserId })
            localStorage.setItem(BIZ_USER_ID_KEY, this.biz_user_id)
        } catch (e: any) {
            // 注册失败可能是已存在，尝试从 agent 的业务用户列表获取
            console.warn('BizUser registration:', e.message)
            try {
                const result = await this.api_fetch(`/agent/${this.agent_id}/bizuser/list`)
                const users = Array.isArray(result) ? result : (result?.items || [ ])
                if (users.length > 0) {
                    this.set({ biz_user_id: users[0].bizUserId })
                    localStorage.setItem(BIZ_USER_ID_KEY, this.biz_user_id)
                }
            } catch { }
        }
        
        await this.grant_biz_user_access()
    }
    
    
    async grant_biz_user_access () {
        if (!this.agent_id || !this.biz_user_id)
            return
        try {
            await this.api_fetch(`/agent/${this.agent_id}/bizuser/access`, {
                method: 'POST',
                body: JSON.stringify({ bizUserId: this.biz_user_id })
            })
        } catch {
            // 已授权则忽略
        }
    }
    
    
    async load_sessions () {
        const params = new URLSearchParams({
            agentId: this.agent_id,
            bizUserId: this.biz_user_id,
            status: '0',
        })
        const result = await this.api_fetch(`/session/list?${params}`)
        const sessions: ISession[] = (result.items || [ ]).map((s: any) => ({
            sessionId: s.sessionId,
            agentId: s.agentId,
            bizUserId: s.bizUserId,
            title: s.title || t('新会话'),
            status: s.status,
            statusName: s.statusName,
            llmConfigId: s.llmConfigId,
            createTime: s.createTime,
            updateTime: s.updateTime,
        }))
        sessions.sort((a, b) => {
            const ta = a.updateTime ? Date.parse(a.updateTime) : 0
            const tb = b.updateTime ? Date.parse(b.updateTime) : 0
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
        })
        this.set({ sessions })
    }
    
    
    async create_session (): Promise<ISession> {
        const body: Record<string, any> = {
            agentId: this.agent_id,
            bizUserId: this.biz_user_id,
            title: t('新会话'),
        }
        if (this.selected_llm_config_id)
            body.llmConfigId = this.selected_llm_config_id
            
        const result = await this.api_fetch('/session/create', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        const session: ISession = {
            sessionId: result.sessionId,
            agentId: result.agentId,
            bizUserId: result.bizUserId,
            title: result.title || t('新会话'),
            status: result.status,
            statusName: result.statusName,
            llmConfigId: result.llmConfigId,
            createTime: result.createTime,
            updateTime: result.updateTime,
        }
        this.set({
            sessions: [session, ...this.sessions],
            current_session_id: session.sessionId,
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            // 新会话同步 LLM 选择（后端可能返回实际绑定的 llmConfigId）
            selected_llm_config_id: session.llmConfigId || '',
        })
        return session
    }
    
    
    async select_session (session_id: string) {
        if (session_id === this.current_session_id)
            return
            
        this.abort_sse()
        
        this.set({
            current_session_id: session_id,
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            latest_ddb_result: null,
            // 同步会话级 LLM 选择
            selected_llm_config_id: this.sessions.find(s => s.sessionId === session_id)?.llmConfigId || '',
        })
        
        // 加载历史消息
        const result = await this.api_fetch(`/session/${session_id}/messages`)
        const raw_items: any[] = result.items || [ ]
        const messages = raw_items
            .map((m: any) => this.map_dolphinx_message(m))
            .filter((m): m is IMessage => m !== null)
        this.set({ messages })
    }
    
    
    async delete_session (session_id: string) {
        await this.api_fetch(`/session/${session_id}/delete`, { method: 'POST' })
        const new_sessions = this.sessions.filter(s => s.sessionId !== session_id)
        
        if (this.current_session_id === session_id) {
            this.abort_sse()
            this.set({
                current_session_id: '',
                messages: [ ],
                buffered_messages: [ ],
            })
        }
        
        this.set({ sessions: new_sessions })
    }
    
    
    async update_session_title (session_id: string, title: string) {
        await this.api_fetch(`/session/${session_id}`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        })
        this.set({
            sessions: this.sessions.map(s =>
                s.sessionId === session_id ? { ...s, title, updateTime: new Date().toISOString() } : s
            )
        })
    }
    
    
    /** 根据第一条用户消息自动生成会话标题 */
    async auto_generate_title (message: string) {
        if (!this.current_session_id)
            return
            
        const MAX_TITLE_LENGTH = 20
        const trimmed = message.replace(/\s+/g, ' ').trim()
        const title = trimmed.length > MAX_TITLE_LENGTH
            ? trimmed.slice(0, MAX_TITLE_LENGTH) + '...'
            : trimmed
            
        if (title)
            await this.update_session_title(this.current_session_id, title)
    }
    
    
    map_dolphinx_message (m: any): IMessage | null {
        if (!m)
            return null
            
        let message_type: string | undefined
        switch (m.contentType) {
            case 'text':
                message_type = 'text'
                break
            case 'tool_call':
                message_type = 'tool_call'
                break
            case 'tool_result':
                message_type = 'tool_result'
                break
            case 'summary':
                message_type = 'system'
                break
            default:
                message_type = m.contentType
        }
        
        let tool_calls: IToolCall[] | undefined
        if (m.contentType === 'tool_call' && m.content)
            try {
                const parsed = JSON.parse(m.content)
                if (Array.isArray(parsed))
                    tool_calls = parsed
            } catch { }
            
        const content: string = m.content || ''
        let name: string | undefined
        
        // 文本格式的工具调用检测：dolphinx 存储的 contentType 始终是 text，
        // 但实际内容可能是 {"tool_call":"name","args":[...]} 格式
        if (message_type === 'text' && m.role === 'assistant' && content.trim()) {
            const parsed_call = parse_tool_call(undefined, content)
            if (parsed_call) {
                message_type = 'tool_call'
                name = parsed_call.type
            }
        }
        
        // 文本格式的工具结果检测：tool result 以 [tool_result:name] 或 [tool_error:name] 前缀发送
        let display_content = content
        let display_role = m.role as string
        if (message_type === 'text' && m.role === 'user' && content.trim()) {
            const result_match = /^\[(tool_result|tool_error|skill_result):([^\]]+)\]\s*/i.exec(content)
            if (result_match) {
                message_type = result_match[1] as string
                name = result_match[2]
                display_content = content.slice(result_match[0].length)
                display_role = 'tool'
            }
        }
        
        return {
            msgId: m.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: display_role,
            messageType: message_type,
            content: display_content,
            content_object: m.contentObject ?? m.content_object,
            tool_call_id: m.toolCallId,
            tool_calls,
            name,
        }
    }
    
    
    abort_sse () {
        if (this.sse_controller) {
            this.sse_controller.abort()
            this.sse_controller = null
        }
    }
    
    
    is_request_interrupted (request_seq: number): boolean {
        return request_seq > 0 && this._interrupted_request_seq === request_seq
    }
    
    
    remove_pending_empty_assistant_messages () {
        if (this._pending_assistant_msg_ids.length === 0)
            return
        
        const pending_ids = new Set(this._pending_assistant_msg_ids)
        const messages = this.messages.filter(msg => {
            if (!pending_ids.has(msg.msgId))
                return true
            return Boolean(msg.content.trim() || msg.reasoning_content?.trim() || msg.content_object)
        })
        this._pending_assistant_msg_ids = [ ]
        if (messages.length !== this.messages.length)
            this.set({ messages })
    }
    
    
    interrupt_chat () {
        if (this.agent_status.status === 'idle' && !this.sse_controller)
            return
        
        this._interrupted_request_seq = this._active_request_seq
        this.abort_sse()
        this.remove_pending_empty_assistant_messages()
        this.set({
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
        })
    }
    
    
    /** Upsert a message into the messages array (update existing or append) */
    upsert_message (msg: IMessage) {
        const idx = this.messages.findIndex(m => m.msgId === msg.msgId)
        if (idx < 0)
            this.set({ messages: [...this.messages, msg] })
        else {
            const current = this.messages[idx]
            const merged: IMessage = {
                ...current,
                ...msg,
                messageType: msg.messageType ?? current.messageType,
                content_object: msg.content_object ?? current.content_object,
                reasoning_content: msg.reasoning_content ?? current.reasoning_content,
            }
            const next = [...this.messages]
            next[idx] = merged
            this.set({ messages: next })
        }
    }
    
    
    send_message (content: string) {
        if (!content.trim() || !this.current_session_id)
            return
        
        if (this.agent_status.status !== 'idle' || this.sse_controller)
            this.interrupt_chat()
        
        const request_seq = ++this._request_seq
        this._active_request_seq = request_seq
        this._interrupted_request_seq = 0
        this._pending_assistant_msg_ids = [ ]
        
        // 添加待发送提示
        this.set({ buffered_messages: [...this.buffered_messages, content.trim()] })
        
        // 异步执行 SSE 对话
        this.do_chat_completions(content.trim(), undefined, 0, request_seq).catch(e => {
            console.error('Chat completions failed:', e)
        })
    }
    
    
    async do_chat_completions (message: string, _unused?: unknown, _tool_turn = 0, request_seq = this._active_request_seq) {
        if (_tool_turn > MAX_TOOL_TURNS) {
            this.set({ agent_status: { status: 'error', message: t('工具调用轮次超过上限') } })
            return
        }
        if (this.is_request_interrupted(request_seq))
            return
        
        // 首轮（非工具续传）时才中断上一次 SSE
        if (_tool_turn === 0)
            this.abort_sse()
            
        const controller = new AbortController()
        this.sse_controller = controller
        
        // 添加用户消息到 UI（仅新消息时）
        if (message && _tool_turn === 0) {
            const user_msg: IMessage = {
                msgId: `user_${Date.now()}`,
                role: 'user',
                messageType: 'text',
                content: message,
            }
            this.set({
                messages: [...this.messages, user_msg],
                buffered_messages: [ ],
                agent_status: { status: 'thinking' },
            })
            
            // 第一条用户消息时自动生成会话标题
            const has_prior_user_msg = this.messages.some(m => m.role === 'user')
            if (!has_prior_user_msg)
                this.auto_generate_title(message).catch(() => { })
        } else
            this.set({
                buffered_messages: [ ],
                agent_status: { status: 'thinking' },
            })
            
        // 创建助手消息占位
        const assistant_msg_id = `assistant_${Date.now()}`
        this._pending_assistant_msg_ids.push(assistant_msg_id)
        this.set({
            messages: [...this.messages, {
                msgId: assistant_msg_id,
                role: 'assistant',
                messageType: 'text',
                content: '',
            }],
        })
        
        try {
            const url = `${this.base_url}/chat/completions`
            const token = localStorage.getItem(storage_keys.agent_bus_token) || ''
            
            // 加载当前 Agent 绑定的技能列表用于系统提示词
            const skills = _tool_turn === 0 ? await this.load_bound_skills() : this._cached_skills
            this._cached_skills = skills
            
            const body: Record<string, any> = {
                sessionId: this.current_session_id,
                stream: false,
                message,
                assemblyConfig: {
                    contextBlocks: [{
                        name: 'web_tool_call_rules',
                        content: build_system_prompt(skills),
                        position: 'after_system',
                    }],
                },
            }
            if (this.selected_llm_config_id)
                body.llmConfigId = this.selected_llm_config_id
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : { }),
                    ...(this.agent_id ? { 'x-agent-id': this.agent_id } : { }),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            })
            
            if (response.status === 403) {
                this.handle_auth_failed()
                throw new Error('Access denied')
            }
            
            if (!response.ok) {
                const err_text = await response.text()
                let parsed: any
                try { parsed = JSON.parse(err_text) } catch { }
                if (parsed?.error?.code === 'BUS_AUTH_FAILED') {
                    this.handle_auth_failed()
                    throw new Error('Access denied')
                }
                throw new Error(parsed?.error?.message || err_text)
            }
            
            // 非流式响应：直接解析 JSON
            const result = await response.json()
            const data = result.data || result
            const content = data.content || ''
            const reasoning_content = data.reasoning_content || data.reasoningContent || ''
            const tool_calls = data.toolCalls
            if (this.is_request_interrupted(request_seq))
                return
            
            console.log('Chat completions response:', result)
            
            this.update_assistant_content(assistant_msg_id, {
                content,
                reasoning_content: reasoning_content || undefined,
            })
            
            // 从文本内容或 function calling 格式中解析工具调用
            console.log('[debug] content length:', content.length, 'toolCalls:', tool_calls)
            const parsed_call = parse_tool_call(tool_calls, content)
            console.log('[debug] parsed_call:', parsed_call)
            
            if (parsed_call) {
                console.log('[debug] Tool call detected:', parsed_call.type, 'payload type:', typeof parsed_call.payload)
                const tool_call_payload = { tool_call: parsed_call.type, args: parsed_call.payload }
                this.update_assistant_content(assistant_msg_id, {
                    content: JSON.stringify(tool_call_payload),
                    reasoning_content: reasoning_content || undefined,
                    messageType: 'tool_call',
                    name: parsed_call.type,
                })
                
                this.set({ agent_status: { status: 'tool_running' } })
                console.log('[debug] Calling handle_text_tool_call...')
                await this.handle_text_tool_call(parsed_call, reasoning_content, _tool_turn, request_seq)
                console.log('[debug] handle_text_tool_call completed')
            } else {
                // 没有工具调用 → 普通文本回复
                if (!content.trim() && !reasoning_content.trim())
                    this.update_assistant_content(assistant_msg_id, {
                        content: t('模型返回了空响应'),
                        messageType: 'agent_error',
                    })
                    
                this.set({ agent_status: { status: 'idle' } })
            }
            
            // 刷新会话列表以更新标题/时间
            this.load_sessions().catch(() => { })
        } catch (e: any) {
            if (e.name === 'AbortError') {
                if (this.is_request_interrupted(request_seq))
                    this.remove_pending_empty_assistant_messages()
                return
            }
            console.error('Chat completions error:', e)
            this.set({ agent_status: { status: 'error', message: e.message } })
            
            // 更新占位消息为错误信息
            this.update_assistant_content(assistant_msg_id, { content: t('发送失败: {{error}}', { error: e.message }) })
        } finally {
            if (this.sse_controller === controller)
                this.sse_controller = null
        }
    }
    
    
    update_assistant_content (msg_id: string, updates: { content?: string, reasoning_content?: string, tool_calls?: IToolCall[], messageType?: MessageType, name?: string }) {
        const idx = this.messages.findIndex(m => m.msgId === msg_id)
        if (idx < 0)
            return
            
        const current = this.messages[idx]
        const next = [...this.messages]
        next[idx] = {
            ...current,
            ...(updates.content !== undefined ? { content: updates.content } : { }),
            ...(updates.reasoning_content !== undefined ? { reasoning_content: updates.reasoning_content } : { }),
            ...(updates.tool_calls ? { tool_calls: updates.tool_calls } : { }),
            ...(updates.messageType ? { messageType: updates.messageType } : { }),
            ...(updates.name ? { name: updates.name } : { }),
        }
        this.set({ messages: next })
    }
    
    
    /** 处理文本解析出的工具调用（text-based tool calling） */
    async handle_text_tool_call (parsed_call: ParsedToolCall, reasoning_content: string, tool_turn: number, request_seq: number) {
        if (this.is_request_interrupted(request_seq))
            return
        
        // 构建 ToolContext
        const context: ToolContext = {
            eval: script => model.ddb.eval(script),
            api_fetch: (path, options) => this.api_fetch(path, options),
        }
        
        // 执行工具
        const handler = get_script_handler(parsed_call.type)
        console.log('[debug] handler found:', !!handler, 'for type:', parsed_call.type)
        let script_result: ScriptResult
        
        if (handler) {
            const payload_str = typeof parsed_call.payload === 'string'
                ? parsed_call.payload
                : JSON.stringify(parsed_call.payload)
            console.log('[debug] calling handler with payload_str:', payload_str.slice(0, 200))
            try {
                script_result = await handler(parsed_call.type, payload_str, context)
                console.log('[debug] handler result:', { next_loop: script_result.next_loop, has_message: !!script_result.save_message, messageType: script_result.save_message?.messageType })
            } catch (e) {
                console.error('[debug] handler threw:', e)
                script_result = {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: parsed_call.type,
                        content: `Tool execution error: ${e instanceof Error ? e.message : String(e)}`,
                    },
                }
            }
        } else
            script_result = {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: parsed_call.type,
                    content: `Tool '${parsed_call.type}' is not supported.`,
                },
            }
        
        if (this.is_request_interrupted(request_seq))
            return
        
        // 显示工具结果消息
        if (script_result.save_message) {
            const result_msg: IMessage = {
                ...script_result.save_message,
                msgId: script_result.save_message.msgId || `tr_${Date.now()}`,
                _has_ddb_result: !!script_result.ddb_result,
            }
            this.set({ messages: [...this.messages, result_msg] })
        }
        
        // 路由 DdbObj 到 DataView
        if (script_result.ddb_result)
            this.set({ latest_ddb_result: script_result.ddb_result })
            
        if (!script_result.next_loop) {
            this.set({ agent_status: { status: 'idle' } })
            return
        }
        
        // 继续 agent loop：将工具结果作为 user 消息发送回 LLM
        const tool_result_content = script_result.save_message
            ? `[${script_result.save_message.messageType}:${parsed_call.type}] ${script_result.save_message.content}`
            : ''
        
        if (tool_result_content)
            await this.do_chat_completions(tool_result_content, undefined, tool_turn + 1, request_seq)
        else
            this.set({ agent_status: { status: 'idle' } })
    }
    
    // ─── LLM Provider 管理 ───
    
    /** 通用的 LlmConfig 字段映射器 */
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
            maxConcurrency: item.maxConcurrency,
            rateLimitRPM: item.rateLimitRPM,
            timeoutMs: item.timeoutMs,
            retryConfig: item.retryConfig,
            extra: item.extra,
            status: item.status,
            statusName: item.statusName || '',
        }
    }
    
    
    async load_llm_providers (): Promise<ILlmProvider[]> {
        try {
            const result = await this.api_fetch('/llm/provider/list')
            return (result.items || [ ]).map((item: any) => ({
                providerId: item.providerId,
                name: item.name || item.providerId,
                adapterType: item.adapterType || '',
                baseUrl: item.baseUrl || '',
                apiKey: item.apiKey,
                extra: item.extra,
                status: item.status,
                statusName: item.statusName || '',
            }))
        } catch {
            return [ ]
        }
    }
    
    
    async register_llm_provider (provider: {
        name: string
        adapterType: string
        baseUrl: string
        apiKey?: string
        extra?: string
    }): Promise<ILlmProvider> {
        return this.api_fetch('/llm/provider/register', {
            method: 'POST',
            body: JSON.stringify(provider),
        })
    }
    
    
    async update_llm_provider (provider_id: string, updates: Record<string, any>): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    
    
    async disable_llm_provider (provider_id: string): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}/disable`, { method: 'POST' })
    }
    
    
    async enable_llm_provider (provider_id: string): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}/enable`, { method: 'POST' })
    }
    
    
    /** 删除 Provider：后端要求调用方先显式禁用 */
    async delete_llm_provider (provider_id: string): Promise<void> {
        await this.api_fetch(`/llm/provider/${provider_id}`, { method: 'DELETE' })
    }
    
    
    // ─── LLM 配置管理 ───
    
    async load_llm_configs (provider_lookup?: Map<string, ILlmProvider>): Promise<ILlmConfig[]> {
        try {
            const result = await this.api_fetch('/llm/config/list')
            return (result.items || [ ]).map((item: any) => this._map_llm_config(item, provider_lookup))
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
        defaultParams?: Record<string, unknown>
        contextWindow?: number
        maxConcurrency?: number
        rateLimitRPM?: number
        timeoutMs?: number
        retryConfig?: Record<string, unknown>
        extra?: string
    }): Promise<ILlmConfig> {
        return this.api_fetch('/llm/config/register', {
            method: 'POST',
            body: JSON.stringify(config),
        })
    }
    
    
    async update_llm_config (llm_config_id: string, updates: Record<string, any>): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    
    
    async disable_llm_config (llm_config_id: string): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}/disable`, { method: 'POST' })
    }
    
    
    async enable_llm_config (llm_config_id: string): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}/enable`, { method: 'POST' })
    }
    
    
    /** 删除模型配置：后端要求调用方先显式禁用 */
    async delete_llm_config (llm_config_id: string): Promise<void> {
        await this.api_fetch(`/llm/config/${llm_config_id}`, { method: 'DELETE' })
    }
    
    
    async load_agent_llm_bindings (agent_id: string, provider_lookup?: Map<string, ILlmProvider>): Promise<IAgentLlmBinding[]> {
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
    }
    
    
    async bind_llm_to_agent (agent_id: string, llm_config_id: string, is_default = false, priority?: number): Promise<void> {
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
    }
    
    
    async unbind_llm_from_agent (agent_id: string, llm_config_id: string): Promise<void> {
        await this.api_fetch(`/agent/${agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    }
    
    
    async unbind_llm_config (llm_config_id: string): Promise<void> {
        if (!this.agent_id)
            return
        await this.api_fetch(`/agent/${this.agent_id}/llm/access?llmConfigId=${llm_config_id}`, {
            method: 'DELETE',
        })
    }
    
    
    /** 加载当前用户在指定 Agent 下可显式选择的 LLM 列表 */
    async load_selectable_llms (agent_id?: string, provider_lookup?: Map<string, ILlmProvider>): Promise<ISelectableLlmInfo[]> {
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
            this.set({ selectable_llms: items })
            return items
        } catch {
            if (aid === this.agent_id)
                this.set({ selectable_llms: [ ] })
            return [ ]
        }
    }
    
    
    // ─── 技能管理 ───
    
    async load_skills (): Promise<ISkillInfo[]> {
        try {
            const result = await this.api_fetch('/skill/list')
            return (result.items || [ ]).map((s: any) => ({
                skillId: s.skillId,
                name: s.name || s.skillName,
                description: s.description,
                status: s.status,
                statusName: s.statusName || '',
                category: s.category,
                displayName: s.displayName,
                version: s.version,
            }))
        } catch {
            return [ ]
        }
    }
    
    
    async load_skill_bindings (agent_id?: string): Promise<ISkillBinding[]> {
        const id = agent_id || this.agent_id
        try {
            if (!id)
                return [ ]
            const result = await this.api_fetch(`/skill/${id}/bindings`)
            return (result.items || [ ]).map((b: any) => ({
                skillId: b.skillId,
                agentId: b.agentId,
                enabled: b.enabled !== false,
                descOverride: b.descOverride,
                skill: b.skill,
            }))
        } catch {
            return [ ]
        }
    }
    
    
    /** 加载当前 Agent 绑定且启用的技能列表，用于系统提示词注入 */
    async load_bound_skills (): Promise<ISkillInfo[]> {
        try {
            if (!this.agent_id)
                return [ ]
            const bindings = await this.load_skill_bindings(this.agent_id)
            return bindings
                .filter(b => b.enabled && b.skill)
                .map(b => {
                    const s = b.skill!
                    return {
                        skillId: b.skillId || s.skillId,
                        name: s.name || (s as any).skillName,
                        description: b.descOverride ?? s.description,
                        status: s.status,
                        statusName: s.statusName || '',
                        category: s.category,
                        displayName: s.displayName,
                        version: s.version,
                    }
                })
        } catch {
            return [ ]
        }
    }
    
    
    async bind_skill (skill_id: string, agent_id?: string): Promise<void> {
        await this.api_fetch('/skill/bind', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id || this.agent_id,
                skillId: skill_id,
            }),
        })
    }
    
    
    async unbind_skill (skill_id: string, agent_id?: string): Promise<void> {
        await this.api_fetch('/skill/unbind', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id || this.agent_id,
                skillId: skill_id,
            }),
        })
    }
    
    
    async toggle_skill_binding (skill_id: string, enabled: boolean, agent_id?: string): Promise<void> {
        await this.api_fetch('/skill/binding/enable', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id || this.agent_id,
                skillId: skill_id,
                enabled,
            }),
        })
    }
    
    
    /** 注册新技能（上传 ZIP 技能包） */
    async register_skill (file: File, overrides?: Record<string, string>): Promise<ISkillInfo> {
        const buffer = await file.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        
        const body: Record<string, any> = { packageBase64: base64 }
        if (overrides && Object.keys(overrides).length > 0)
            body.overrides = overrides
            
        const result = await this.api_fetch('/skill/register', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        return {
            skillId: result.skillId || result.skill_id || result.id,
            name: result.name,
            description: result.description,
            status: result.status ?? 0,
            statusName: result.statusName || 'ACTIVE',
            category: result.category,
            displayName: result.displayName,
            version: result.version,
        }
    }
    
    
    /** 删除技能 */
    async delete_skill (skill_id: string): Promise<void> {
        await this.api_fetch(`/skill/${skill_id}/delete`, { method: 'POST' })
    }
    
    
    async activate_skill (skill_id: string): Promise<void> {
        await this.api_fetch(`/skill/${skill_id}/activate`, { method: 'POST' })
    }
    
    
    async disable_skill (skill_id: string): Promise<void> {
        await this.api_fetch(`/skill/${skill_id}/disable`, { method: 'POST' })
    }
    
    
    async deprecate_skill (skill_id: string): Promise<void> {
        await this.api_fetch(`/skill/${skill_id}/deprecate`, { method: 'POST' })
    }
}


export let chat_model = new ChatModel()
