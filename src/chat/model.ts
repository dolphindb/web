import { Model } from 'react-object-model'

import { t } from '@i18n'
import { model, storage_keys } from '@model'

import { init_scripts } from './scripts/init.ts'
import { get_script_handler } from './scripts/index.ts'
import type { ToolContext, ScriptResult } from './scripts/types.ts'
import {
    append_tool_result_hint,
    is_structured_tool_result_helpful,
    normalize_script_args,
    parse_tool_result_json,
    tool_result_json,
} from './scripts/helpers.ts'
import { build_current_todo_prompt, build_system_prompt } from './prompt.ts'
import { parse_tool_calls } from './tool_call_parser.ts'
import type { ParsedToolCall } from './tool_call_parser.ts'
import { chat_workspace_store } from './workspace.ts'
import type { IChatWorkspace, IWorkspaceStep } from './workspace.ts'


export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type MessageType = 'system' | 'text' | 'tool_call' | 'tool_result' | 'skill_result' | 'tool_error' | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'compacting' | 'error'

export type ScriptExecuteApprovalMode = 'approval' | 'auto'

export type ScriptExecuteApprovalDecision = 'allow' | 'allow_session' | 'deny'


export interface IScriptExecutionApproval {
    id: string
    sessionId: string
    messageId: string
    toolName: string
    script: string
}


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


export interface IToolLoopControl {
    id: string
    sessionId: string
    requestSeq: number
    toolTurn: number
    message: string
}


/** LLM Provider（共享连接信息：adapterType + baseUrl + apiKey） */
export interface ILlmProvider {
    providerId: string
    name: string
    adapterType: string
    baseUrl: string
    apiKey?: string
    extra?: string
    enabled: boolean
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
    enabled: boolean
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
    enabled: boolean
    license?: string
    compatibility?: string
    argumentHint?: string
    disableModelInvocation?: boolean
    userInvocable?: boolean
    hasInstruction?: boolean
    contentRevision?: number
    contentHash?: string
    isCommon?: boolean
    ownerUserId?: string
    metadata?: Record<string, unknown>
    schemaVersion?: number
    extra?: string
    createTime?: string
    updateTime?: string
}


export interface ISkillBinding {
    skillId: string
    agentId: string
    enabled: boolean
    available?: boolean
    source?: string
    subjectType?: string
    subjectId?: string
    descOverride?: string
    createTime?: string
    updateTime?: string
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


export interface IAccessInfo {
    userId: string
    subjectId?: string
    permission?: string
    grantedBy?: string
    createTime?: string
    updateTime?: string
}


export interface IUserLlmAccessInfo {
    userId: string
    llmConfigId: string
    grantedBy?: string
    createTime?: string
    updateTime?: string
    llmConfig?: ILlmConfig
}


export interface IMemoryEntry {
    memoryId: string
    agentId: string
    userId?: string
    scope?: 'agent' | 'user'
    category: string
    content: string
    importance: number
    metadata?: Record<string, unknown>
    source?: string
    sourceRef?: string
    expireTime?: number
    createTime?: string
    updateTime?: string
    textScore?: number
    relevanceScore?: number
    hybridScore?: number
}


export interface IMemoryStats {
    totalCount: number
    agentScopeCount: number
    userScopeCount: number
    avgImportance: number
    categoryDistribution?: Record<string, number>
}


export interface ISkillFileContent {
    skillId: string
    filePath: string
    encoding?: string
    content: string
    size?: number
}


export interface ILlmUsageStats {
    agentId: string
    userId?: string
    startTime?: number
    endTime?: number
    totalPromptTokens?: number
    totalCompletionTokens?: number
    totalTokens?: number
    requestCount?: number
}


export interface IBuiltinInitSummary {
    createdAgents?: number
    createdSkills?: number
    updatedSkills?: number
    createdBindings?: number
    skippedExisting?: number
    skippedUnchanged?: number
    skippedUserModified?: number
    failed?: number
}


export interface IBuiltinInitItem {
    resourceType?: string
    resourceKey?: string
    resourceId?: string
    action?: string
    status?: string
    errorCode?: string
    message?: string
}


export interface IBuiltinStateRecord {
    manifestId?: string
    targetType?: string
    targetKey?: string
    payloadSchemaVersion?: number
    payload?: Record<string, unknown>
    createTime?: string
    updateTime?: string
}


export interface IBuiltinInitResult {
    initialized?: boolean
    state?: string
    runId?: string
    manifestId?: string
    manifestVersion?: string
    manifestHash?: string
    lastRunId?: string
    lastRunTime?: string
    dryRun?: boolean
    summary?: IBuiltinInitSummary
    items?: IBuiltinInitItem[]
    lastFailures?: IBuiltinInitItem[]
    states?: IBuiltinStateRecord[]
    errorCode?: string
    message?: string
}


const AGENT_ID_KEY = 'ddb.chat.agent_id'
const BIZ_USER_ID_KEY = 'ddb.chat.biz_user_id'

/** 最大工具调用轮次，防止无限循环 */
const MAX_TOOL_TURNS = 12

const MAX_REPEATED_TOOL_CALLS = 2

const MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT = 2

const DDB_RESULT_TOOLS = new Set<string>(['execute', 'show', 'coldefs', 'testsql'])

const SCRIPT_APPROVAL_TOOLS = new Set<string>(['execute', 'show'])

const REPEAT_GUARD_EXEMPT_TOOLS = new Set<string>(['execute_file'])


interface ChatCompletionStreamResult {
    content: string
    reasoning_content: string
    tool_calls?: any[]
    final_data?: any
}


interface ChatCompletionOptions {
    append_user?: boolean
}


interface ToolExecutionResult {
    tool_result_content: string
    next_loop: boolean
    stopped?: boolean
}


function parse_json_string (value: string): unknown {
    const trimmed = value.trim()
    if (!trimmed)
        return value
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
        try { return JSON.parse(trimmed) } catch { }
    return value
}


function get_enabled (item: any): boolean {
    if (typeof item?.enabled === 'boolean')
        return item.enabled
    if (item?.statusName)
        return item.statusName === 'ACTIVE'
    return true
}


function get_status_name (item: any): string {
    if (item?.statusName)
        return item.statusName
    return get_enabled(item) ? 'ACTIVE' : 'DISABLED'
}


function get_status (item: any): number {
    return item?.status ?? (get_enabled(item) ? 1 : 0)
}


function stable_json_value (value: unknown): unknown {
    if (typeof value === 'string')
        return stable_json_value(parse_json_string(value))
    if (Array.isArray(value))
        return value.map(stable_json_value)
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        return Object.fromEntries(
            Object.keys(obj)
                .sort()
                .map(key => [key, stable_json_value(obj[key])])
        )
    }
    return value
}


function stable_json_stringify (value: unknown): string {
    try {
        return JSON.stringify(stable_json_value(value))
    } catch {
        return String(value)
    }
}


function strip_json_segments (text: string): string {
    let result = text.replace(/```(?:json)?\s*[\s\S]*?```/gi, '\n\n')
    const ranges: Array<[number, number]> = [ ]
    let start = -1
    let depth = 0
    let in_string = false
    let escape = false
    
    for (let index = 0;  index < result.length;  index += 1) {
        const ch = result[index]
        if (escape) {
            escape = false
            continue
        }
        if (ch === '\\') {
            escape = true
            continue
        }
        if (ch === '"') {
            in_string = !in_string
            continue
        }
        if (in_string)
            continue
        if (ch === '{') {
            if (depth === 0)
                start = index
            depth += 1
            continue
        }
        if (ch === '}' && depth > 0) {
            depth -= 1
            if (depth === 0 && start >= 0) {
                ranges.push([start, index + 1])
                start = -1
            }
        }
    }
    
    for (let index = ranges.length - 1;  index >= 0;  index -= 1) {
        const [from, to] = ranges[index]
        result = `${result.slice(0, from)}\n${result.slice(to)}`
    }
    
    return result
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}


function to_stream_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}


function get_reasoning_text (data: any): string {
    return to_stream_text(data?.reasoning ?? data?.reasoning_content ?? data?.reasoningContent)
}


function parse_sse_event (raw_event: string): { event: string, data: string } | null {
    const lines = raw_event.split('\n')
    let event = ''
    const data_lines: string[] = [ ]
    
    for (const raw_line of lines) {
        const line = raw_line.trimEnd()
        if (!line || line.startsWith(':'))
            continue
        if (line.startsWith('event:'))
            event = line.slice('event:'.length).trim()
        else if (line.startsWith('data:'))
            data_lines.push(line.slice('data:'.length).trimStart())
    }
    
    if (data_lines.length === 0)
        return null
    
    return { event, data: data_lines.join('\n') }
}


// 初始化工具注册表
init_scripts()


class ChatModel extends Model<ChatModel> {
    agent_id = localStorage.getItem(AGENT_ID_KEY) || ''
    
    biz_user_id = localStorage.getItem(BIZ_USER_ID_KEY) || ''
    
    agents: IAgentInfo[] = [ ]
    
    sessions: ISession[] = [ ]
    
    current_session_id = ''
    
    workspaces: IChatWorkspace[] = [ ]
    
    current_workspace_id = ''
    
    current_workspace: IChatWorkspace | null = null
    
    steps: IWorkspaceStep[] = [ ]
    
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
    
    /** DolphinDB 脚本工具执行审批模式，仅保存在当前前端运行时 */
    script_execute_approval_mode: ScriptExecuteApprovalMode = 'approval'
    
    pending_script_approval: IScriptExecutionApproval | null = null
    
    pending_tool_loop_control: IToolLoopControl | null = null
    
    settings_visible = false
    
    loading = false
    
    _request_seq = 0
    
    _active_request_seq = 0
    
    _interrupted_request_seq = 0
    
    _pending_assistant_msg_ids: string[] = [ ]
    
    _script_approval_resolver: ((decision: ScriptExecuteApprovalDecision) => void) | null = null
    
    _session_script_approval_modes = new Map<string, ScriptExecuteApprovalMode>()
    
    _last_tool_call_signature = ''
    
    _last_tool_call_failed = false
    
    _consecutive_failed_tool_call_count = 0
    
    _consecutive_ddb_failures = 0
    
    _tool_turn_limit = MAX_TOOL_TURNS
    
    
    get base_url (): string {
        const protocol = location.protocol
        const hostname = model.hostname || location.hostname
        const port = model.port || location.port
        return `${protocol}//${hostname}${port ? ':' + port : ''}/agent-bus/v1`
    }
    
    
    should_attach_agent_header (path: string, options: RequestInit) {
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
    }
    
    
    async api_fetch (path: string, options: RequestInit = { }): Promise<any> {
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
    }
    
    
    handle_auth_failed () {
        console.warn('Agent-bus auth failed, redirecting to login')
        localStorage.removeItem(storage_keys.agent_bus_token)
        localStorage.removeItem(storage_keys.ticket)
        localStorage.removeItem(storage_keys.username)
        model.set({ logined: false, username: 'guest', admin: false })
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
                this.load_workspaces(),
            ])
        } catch (error) {
            console.error('Chat init failed:', error)
            model.message?.error(t('AI 助手初始化失败'))
        } finally {
            this.set({ loading: false })
        }
    }
    
    
    map_agent (a: any): IAgentInfo {
        return {
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
        }
    }
    
    
    /** 加载 agent 列表并选中第一个可用的 ACTIVE agent */
    async load_agents () {
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
    }
    
    
    async load_all_agents (): Promise<IAgentInfo[]> {
        const result = await this.api_fetch('/agent/list')
        return (result.items || [ ]).map((a: any) => this.map_agent(a))
    }
    
    
    async get_agent (agent_id: string): Promise<IAgentInfo> {
        return this.map_agent(await this.api_fetch(`/agent/${agent_id}`))
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
    
    
    _map_access_info (item: any): IAccessInfo {
        return {
            ...item,
            userId: item.userId || item.subjectId,
            subjectId: item.subjectId,
            permission: item.permission,
        }
    }
    
    
    async load_agent_auth (agent_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth/list`)
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    }
    
    
    async grant_agent_auth (agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth`, {
            method: 'POST',
            body: JSON.stringify({ userId: user_id }),
        })
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    }
    
    
    async revoke_agent_auth (agent_id: string, user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/agent/${agent_id}/auth?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return (result.items || [ ]).map((item: any) => this._map_access_info(item))
    }
    
    
    async load_global_agent_admins (): Promise<IAccessInfo[]> {
        const result = await this.api_fetch('/admin/access')
        return result.items || [ ]
    }
    
    
    async grant_global_agent_admin (user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch('/admin/access', {
            method: 'POST',
            body: JSON.stringify({ userId: user_id, permission: 'AGENT_ADMIN' }),
        })
        return result.items || [ ]
    }
    
    
    async revoke_global_agent_admin (user_id: string): Promise<IAccessInfo[]> {
        const result = await this.api_fetch(`/admin/access?userId=${encodeURIComponent(user_id)}`, {
            method: 'DELETE',
        })
        return result.items || [ ]
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
    
    
    async load_workspaces () {
        const workspaces = await chat_workspace_store.list_workspaces(this.current_session_id, (path, options) => this.api_fetch(path, options))
        this.set({ workspaces })
        return workspaces
    }
    
    
    async create_workspace (name?: string): Promise<IChatWorkspace> {
        return chat_workspace_store.create_workspace()
    }
    
    
    async load_steps (session_id = this.current_session_id): Promise<IWorkspaceStep[]> {
        if (!session_id) {
            this.set({ steps: [ ] })
            return [ ]
        }
        const steps = await chat_workspace_store.list_active_steps(session_id, (path, options) => this.api_fetch(path, options))
        if (session_id === this.current_session_id)
            this.set({ steps })
        return steps
    }
    
    
    async refresh_workspace_context (session_id = this.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.ensure_session_workspace(session_id, (path, options) => this.api_fetch(path, options))
        const [workspaces, steps] = await Promise.all([
            chat_workspace_store.list_workspaces(session_id, (path, options) => this.api_fetch(path, options)),
            chat_workspace_store.list_active_steps(session_id, (path, options) => this.api_fetch(path, options)),
        ])
        if (session_id === this.current_session_id)
            this.set({
                workspaces,
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                steps,
            })
    }
    
    
    async select_workspace (_workspace_id: string, session_id = this.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.get_workspace(session_id, (path, options) => this.api_fetch(path, options))
        if (session_id === this.current_session_id)
            this.set({
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                workspaces: await chat_workspace_store.list_workspaces(session_id, (path, options) => this.api_fetch(path, options)),
            })
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
        const workspace = await chat_workspace_store.ensure_default_workspace(session.sessionId, (path, options) => this.api_fetch(path, options))
        const workspaces = await chat_workspace_store.list_workspaces(session.sessionId, (path, options) => this.api_fetch(path, options))
        this.set({
            sessions: [session, ...this.sessions],
            current_session_id: session.sessionId,
            workspaces,
            current_workspace_id: workspace.workspace_id,
            current_workspace: workspace,
            steps: [ ],
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            script_execute_approval_mode: 'approval',
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
            script_execute_approval_mode: this.get_session_script_execute_approval_mode(session_id),
            // 同步会话级 LLM 选择
            selected_llm_config_id: this.sessions.find(s => s.sessionId === session_id)?.llmConfigId || '',
        })
        
        await this.refresh_workspace_context(session_id)
        
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
                current_workspace_id: '',
                current_workspace: null,
                steps: [ ],
                messages: [ ],
                buffered_messages: [ ],
            })
        }
        
        this.set({ sessions: new_sessions })
    }
    
    
    map_session (s: any): ISession {
        return {
            sessionId: s.sessionId,
            agentId: s.agentId,
            bizUserId: s.bizUserId,
            title: s.title || t('新会话'),
            status: s.status,
            statusName: s.statusName,
            llmConfigId: s.llmConfigId,
            createTime: s.createTime,
            updateTime: s.updateTime,
        }
    }
    
    
    async get_session (session_id: string): Promise<ISession> {
        return this.map_session(await this.api_fetch(`/session/${session_id}`))
    }
    
    
    async list_sessions (params: { agentId?: string, targetUserId?: string, status?: number, offset?: number, limit?: number } = { }): Promise<{ items: ISession[], size: number, offset?: number, limit?: number }> {
        const search = new URLSearchParams()
        if (params.agentId)
            search.set('agentId', params.agentId)
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        if (params.status !== undefined)
            search.set('status', String(params.status))
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        
        const result = await this.api_fetch(`/session/list?${search}`)
        return {
            ...result,
            items: (result.items || [ ]).map((s: any) => this.map_session(s)),
        }
    }
    
    
    async archive_session (session_id: string): Promise<ISession> {
        const result = this.map_session(await this.api_fetch(`/session/${session_id}/archive`, { method: 'POST' }))
        this.set({
            sessions: this.sessions.map(s => s.sessionId === session_id ? result : s)
        })
        return result
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
    
    
    async update_session (session_id: string, updates: Record<string, unknown>): Promise<ISession> {
        const result = this.map_session(await this.api_fetch(`/session/${session_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }))
        this.set({
            sessions: this.sessions.map(s => s.sessionId === session_id ? result : s)
        })
        return result
    }
    
    
    async generate_session_summary (session_id: string, params: { instructions?: string, llmConfigId?: string, force?: boolean, metadata?: Record<string, unknown> } = { }): Promise<any> {
        return this.api_fetch(`/session/${session_id}/summary`, {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    
    
    async preview_context (params: Record<string, unknown>): Promise<any> {
        return this.api_fetch('/context/preview', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    
    
    /** 根据第一条用户消息自动生成会话标题 */
    async auto_generate_title (session_id: string, message: string) {
        if (!session_id)
            return
            
        const title = await this.generate_session_title(session_id, message)
        if (title)
            await this.update_session_title(session_id, title)
    }
    
    
    make_fallback_title (message: string) {
        const MAX_TITLE_LENGTH = 24
        const trimmed = message.replace(/\s+/g, ' ').trim()
        return trimmed.length > MAX_TITLE_LENGTH
            ? trimmed.slice(0, MAX_TITLE_LENGTH) + '...'
            : trimmed
    }
    
    
    normalize_session_title (title: string, fallback: string) {
        const normalized = title
            .replace(/\s+/g, ' ')
            .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '')
            .replace(/^标题[:：]\s*/, '')
            .trim()
        if (!normalized)
            return fallback
        return normalized.length > 24 ? normalized.slice(0, 24) : normalized
    }
    
    
    async generate_session_title (session_id: string, message: string) {
        const fallback = this.make_fallback_title(message)
        try {
            const result = await this.api_fetch('/llm/complete', {
                method: 'POST',
                body: JSON.stringify({
                    agentId: this.agent_id,
                    sessionId: session_id,
                    stream: false,
                    includeReasoning: false,
                    llmConfigId: this.selected_llm_config_id || undefined,
                    messages: [
                        {
                            role: 'system',
                            content: '你是会话标题生成器。请根据用户第一条消息生成一个简短、具体的中文标题。只输出标题本身，不要解释，不要加引号，不要超过 12 个汉字或 24 个英文字符。',
                        },
                        {
                            role: 'user',
                            content: message,
                        },
                    ],
                }),
            })
            const content = result?.content ?? result?.message ?? ''
            return this.normalize_session_title(String(content), fallback)
        } catch (error) {
            console.warn('Generate session title by LLM failed, fallback to truncated prompt:', error)
            return fallback
        }
    }
    
    
    map_dolphinx_message (m: any): IMessage | null {
        if (!m)
            return null
        if (m.contentType === 'summary')
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
            const parsed_call = parse_tool_calls(undefined, content)[0]
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
            } else {
                const parsed = parse_tool_result_json(content)
                if (parsed && typeof parsed.tool === 'string') {
                    message_type = parsed.ok === false ? 'tool_error' : 'tool_result'
                    name = parsed.tool
                    display_role = 'tool'
                }
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
    
    
    get_session_script_execute_approval_mode (session_id = this.current_session_id): ScriptExecuteApprovalMode {
        if (!session_id)
            return 'approval'
        return this._session_script_approval_modes.get(session_id) || 'approval'
    }
    
    
    set_script_execute_approval_mode (mode: ScriptExecuteApprovalMode, session_id = this.current_session_id) {
        if (session_id)
            this._session_script_approval_modes.set(session_id, mode)
        
        if (!session_id || session_id === this.current_session_id)
            this.set({ script_execute_approval_mode: mode })
        
        if (
            mode === 'auto' &&
            this.pending_script_approval?.sessionId === session_id &&
            this._script_approval_resolver
        )
            this.resolve_script_execution_approval('allow_session')
    }
    
    
    resolve_script_execution_approval (decision: ScriptExecuteApprovalDecision) {
        const resolver = this._script_approval_resolver
        const pending = this.pending_script_approval
        
        this._script_approval_resolver = null
        if (decision === 'allow_session' && pending?.sessionId)
            this.set_script_execute_approval_mode('auto', pending.sessionId)
        
        this.set({ pending_script_approval: null })
        resolver?.(decision)
    }
    
    
    async request_script_execution_approval (tool_name: string, script: string, message_id: string): Promise<ScriptExecuteApprovalDecision> {
        const session_id = this.current_session_id
        if (
            this.get_session_script_execute_approval_mode(session_id) === 'auto'
        )
            return 'allow'
        
        return new Promise(resolve => {
            const approval: IScriptExecutionApproval = {
                id: `script_approval_${Date.now()}`,
                sessionId: session_id,
                messageId: message_id,
                toolName: tool_name,
                script,
            }
            
            this._script_approval_resolver = resolve
            this.set({
                pending_script_approval: approval,
                agent_status: { status: 'tool_running', message: t('等待 DolphinDB 脚本执行审批...') },
            })
        })
    }
    
    
    clear_pending_script_approval (decision: ScriptExecuteApprovalDecision = 'deny') {
        if (this._script_approval_resolver || this.pending_script_approval)
            this.resolve_script_execution_approval(decision)
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
        this.clear_pending_script_approval('deny')
        this.remove_pending_empty_assistant_messages()
        this.set({
            buffered_messages: [ ],
            pending_tool_loop_control: null,
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
    
    
    reset_loop_guard () {
        this._last_tool_call_signature = ''
        this._last_tool_call_failed = false
        this._consecutive_failed_tool_call_count = 0
        this._consecutive_ddb_failures = 0
        this._tool_turn_limit = MAX_TOOL_TURNS
    }
    
    
    is_ddb_connected () {
        return Boolean(model.ddb?.connected)
    }
    
    
    clear_context_compaction_status () {
        if (this.agent_status.status === 'compacting')
            this.set({ agent_status: { status: 'thinking' } })
    }
    
    
    get_tool_call_signature (parsed_call: ParsedToolCall) {
        const tool_name = parsed_call.type.trim()
        if (DDB_RESULT_TOOLS.has(tool_name))
            return `${tool_name}\u001f${(normalize_script_args(parsed_call.payload)[0] || '').trim()}`
        return `${tool_name}\u001f${stable_json_stringify(parsed_call.payload)}`
    }
    
    
    build_repeated_tool_call_result (parsed_call: ParsedToolCall, count: number, stop_loop: boolean): ToolExecutionResult {
        const content = tool_result_json({
            ok: false,
            tool: parsed_call.type,
            repeatedCall: true,
            content: '',
            error: t('重复工具调用已跳过'),
            hint: stop_loop
                ? t('模型仍在重复同一个工具调用，流程已停止。请基于已有工具结果回答，或换一个明确不同的策略。')
                : t('这个完全相同的工具调用已经尝试过 {{count}} 次，不要继续重复；请改用不同参数、查询文档，或基于已有结果回答。', { count }),
        })
        this.set({
            messages: [...this.messages, {
                msgId: `tool_repeat_${Date.now()}`,
                role: 'tool',
                messageType: 'tool_error',
                name: parsed_call.type,
                content,
            }],
            ...(stop_loop ? { agent_status: { status: 'idle' as const } } : { }),
        })
        return {
            tool_result_content: content,
            next_loop: !stop_loop,
            stopped: stop_loop,
        }
    }
    
    
    check_repeated_tool_call (parsed_call: ParsedToolCall): ToolExecutionResult | null {
        if (REPEAT_GUARD_EXEMPT_TOOLS.has(parsed_call.type.trim()))
            return null
        
        const signature = this.get_tool_call_signature(parsed_call)
        if (
            signature !== this._last_tool_call_signature ||
            !this._last_tool_call_failed ||
            this._consecutive_failed_tool_call_count < MAX_REPEATED_TOOL_CALLS
        )
            return null
        
        const count = this._consecutive_failed_tool_call_count + 1
        this._consecutive_failed_tool_call_count = count
        return this.build_repeated_tool_call_result(
            parsed_call,
            count,
            count > MAX_REPEATED_TOOL_CALLS + 1
        )
    }
    
    
    is_failed_tool_result (tool_name: string, message?: IMessage) {
        if (!message)
            return false
        if (message.messageType === 'tool_error' || message.messageType === 'agent_error')
            return true
        
        const payload = parse_tool_result_json(message.content)
        return Boolean(
            payload &&
            payload.tool === tool_name &&
            (payload.ok === false || payload.repeatedCall)
        )
    }
    
    
    update_repeated_tool_call_state (parsed_call: ParsedToolCall, message?: IMessage) {
        const signature = this.get_tool_call_signature(parsed_call)
        const failed = this.is_failed_tool_result(parsed_call.type, message)
        this._consecutive_failed_tool_call_count = signature === this._last_tool_call_signature && failed
            ? this._consecutive_failed_tool_call_count + 1
            : failed ? 1 : 0
        this._last_tool_call_signature = signature
        this._last_tool_call_failed = failed
    }
    
    
    apply_loop_guard_to_tool_result (tool_name: string, content: string): { content: string, stop: boolean } {
        if (!DDB_RESULT_TOOLS.has(tool_name))
            return { content, stop: false }
        
        const helpful = is_structured_tool_result_helpful(content)
        if (helpful) {
            this._consecutive_ddb_failures = 0
            return { content, stop: false }
        }
        
        this._consecutive_ddb_failures += 1
        if (this._consecutive_ddb_failures < MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT)
            return { content, stop: false }
        
        const hint = t('{{count}} 次连续 DolphinDB 工具结果都没有提供有效信息。不要继续猜测 API；请查询官方文档、运行更小的验证脚本，或基于已知结果说明不确定性。', { count: this._consecutive_ddb_failures })
        return {
            content: append_tool_result_hint(content, hint),
            stop: false,
        }
    }
    
    
    request_tool_loop_decision (message: string, tool_turn: number, request_seq: number) {
        this.set({
            pending_tool_loop_control: {
                id: `tool_loop_${Date.now()}`,
                sessionId: this.current_session_id,
                requestSeq: request_seq,
                toolTurn: tool_turn,
                message,
            },
            agent_status: {
                status: 'tool_running',
                message: t('工具调用已达到 {{count}} 轮，等待选择停止或继续。', { count: this._tool_turn_limit }),
            },
        })
    }
    
    
    continue_tool_loop () {
        const pending = this.pending_tool_loop_control
        if (!pending)
            return
        if (pending.sessionId !== this.current_session_id) {
            this.set({ pending_tool_loop_control: null })
            return
        }
        
        this._tool_turn_limit += MAX_TOOL_TURNS
        this.set({
            pending_tool_loop_control: null,
            agent_status: { status: 'thinking' },
        })
        this.do_chat_completions(pending.message, undefined, pending.toolTurn, pending.requestSeq).catch(error => {
            console.error('Continue tool loop failed:', error)
            this.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
        })
    }
    
    
    send_message (content: string) {
        if (!content.trim() || !this.current_session_id)
            return
        if (!this.is_ddb_connected()) {
            model.message?.warning(t('DolphinDB 连接已断开，无法发送消息'))
            return
        }
        const current_session = this.sessions.find(session => session.sessionId === this.current_session_id)
        if (current_session?.status === 1 || current_session?.statusName === 'ARCHIVED') {
            model.message?.warning(t('归档会话不可继续发送消息'))
            return
        }
        
        if (this.agent_status.status !== 'idle' || this.sse_controller)
            this.interrupt_chat()
        
        const request_seq = ++this._request_seq
        this._active_request_seq = request_seq
        this._interrupted_request_seq = 0
        this._pending_assistant_msg_ids = [ ]
        this.reset_loop_guard()
        this.set({ pending_tool_loop_control: null })
        
        // 添加待发送提示
        this.set({ buffered_messages: [...this.buffered_messages, content.trim()] })
        
        // 异步执行 SSE 对话
        this.do_chat_completions(content.trim(), undefined, 0, request_seq).catch(e => {
            console.error('Chat completions failed:', e)
        })
    }
    
    
    async read_chat_completion_stream (response: Response, assistant_msg_id: string, request_seq: number): Promise<ChatCompletionStreamResult> {
        const reader = response.body?.getReader()
        if (!reader)
            throw new Error(t('流式响应不可读取'))
        
        const decoder = new TextDecoder()
        let buffer = ''
        let content = ''
        let reasoning_content = ''
        let final_data: any
        
        const apply_event = (raw_event: string) => {
            const parsed_event = parse_sse_event(raw_event)
            if (!parsed_event || parsed_event.data === '[DONE]')
                return
            
            let payload: any
            try {
                payload = JSON.parse(parsed_event.data)
            } catch (error) {
                throw new Error(t('流式响应 JSON 解析失败: {{error}}', { error: error instanceof Error ? error.message : String(error) }))
            }
            
            const type = payload.type || parsed_event.event
            const data = payload.data || payload
            
            if (payload.action === 'context.compaction') {
                const phase = String(data?.phase || '')
                if (phase === 'start')
                    this.set({ agent_status: { status: 'compacting', message: t('正在压缩上下文...') } })
                else
                    this.clear_context_compaction_status()
                return
            }
            
            if (type === 'EVENT')
                return
            
            this.clear_context_compaction_status()
            
            if (type === 'STREAM_START' || parsed_event.event === 'stream_start')
                return
            
            if (type === 'STREAM_CHUNK' || parsed_event.event === 'chunk') {
                const delta = to_stream_text(data.content)
                if (delta) {
                    content += delta
                    this.update_assistant_content(assistant_msg_id, { content })
                }
                return
            }
            
            if (type === 'STREAM_REASONING' || parsed_event.event === 'reasoning_delta') {
                const delta = get_reasoning_text(data)
                if (delta) {
                    reasoning_content += delta
                    this.update_assistant_content(assistant_msg_id, { reasoning_content })
                }
                return
            }
            
            if (type === 'STREAM_END' || parsed_event.event === 'stream_end') {
                final_data = data
                const final_content = to_stream_text(data.content)
                const final_reasoning = get_reasoning_text(data)
                if (!content && final_content)
                    content = final_content
                if (!reasoning_content && final_reasoning)
                    reasoning_content = final_reasoning
                this.update_assistant_content(assistant_msg_id, {
                    content,
                    reasoning_content: reasoning_content || undefined,
                })
                return
            }
            
            if (type === 'ERROR' || type === 'STREAM_ERROR')
                throw new Error(data?.message || payload.message || t('流式响应返回错误'))
        }
        
        function consume_buffer () {
            buffer = buffer.replace(/\r\n/g, '\n')
            let sep = buffer.indexOf('\n\n')
            while (sep >= 0) {
                const raw_event = buffer.slice(0, sep)
                buffer = buffer.slice(sep + 2)
                apply_event(raw_event)
                sep = buffer.indexOf('\n\n')
            }
        }
        
        while (true) {
            if (this.is_request_interrupted(request_seq))
                return { content, reasoning_content, final_data }
            
            const { done, value } = await reader.read()
            if (done)
                break
            
            buffer += decoder.decode(value, { stream: true })
            consume_buffer()
        }
        
        buffer += decoder.decode()
        if (buffer.trim())
            apply_event(buffer)
        
        return {
            content,
            reasoning_content,
            tool_calls: final_data?.toolCalls ?? final_data?.tool_calls,
            final_data,
        }
    }
    
    
    async do_chat_completions (message: string, options: ChatCompletionOptions = { }, _tool_turn = 0, request_seq = this._active_request_seq) {
        if (_tool_turn > this._tool_turn_limit) {
            this.request_tool_loop_decision(message, _tool_turn, request_seq)
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
        if (message && _tool_turn === 0 && options.append_user !== false) {
            const has_prior_user_msg = this.messages.some(m => m.role === 'user')
            const session_id = this.current_session_id
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
            if (!has_prior_user_msg)
                this.auto_generate_title(session_id, message).catch(error => {
                    console.warn('Auto generate session title failed:', error)
                })
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
            const current_todo_prompt = build_current_todo_prompt(this.current_workspace, this.steps)
            const context_blocks = [
                {
                    name: 'web_tool_call_rules',
                    content: build_system_prompt(skills),
                    position: 'after_system',
                },
                ...current_todo_prompt
                    ? [{
                        name: 'web_current_todo',
                        content: current_todo_prompt,
                        position: 'before_current_turn',
                    }]
                    : [ ],
            ]
            
            const body: Record<string, any> = {
                sessionId: this.current_session_id,
                stream: true,
                contextEvent: true,
                includeReasoning: true,
                message,
                assemblyConfig: {
                    contextBlocks: context_blocks,
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
            
            const content_type = response.headers.get('content-type') || ''
            let content = ''
            let reasoning_content = ''
            let tool_calls: any[] | undefined
            let raw_result: any
            
            if (response.body && content_type.toLowerCase().includes('text/event-stream')) {
                const stream_result = await this.read_chat_completion_stream(response, assistant_msg_id, request_seq)
                raw_result = stream_result.final_data
                content = stream_result.content
                reasoning_content = stream_result.reasoning_content
                tool_calls = stream_result.tool_calls
            } else {
                raw_result = await response.json()
                const data = raw_result.data || raw_result
                content = data.content || ''
                reasoning_content = data.reasoning || data.reasoning_content || data.reasoningContent || ''
                tool_calls = data.toolCalls || data.tool_calls
                this.update_assistant_content(assistant_msg_id, {
                    content,
                    reasoning_content: reasoning_content || undefined,
                })
            }
            
            if (this.is_request_interrupted(request_seq))
                return
            
            console.log('Chat completions response:', raw_result)
            
            // 从文本内容或 function calling 格式中解析工具调用
            console.log('[debug] content length:', content.length, 'toolCalls:', tool_calls)
            const parsed_calls = parse_tool_calls(tool_calls, content)
            console.log('[debug] parsed_calls:', parsed_calls)
            
            if (parsed_calls.length > 0) {
                this.set({ agent_status: { status: 'tool_running' } })
                console.log('[debug] Calling handle_text_tool_calls...')
                await this.handle_text_tool_calls(parsed_calls, reasoning_content, _tool_turn, request_seq, assistant_msg_id, strip_json_segments(content))
                console.log('[debug] handle_text_tool_calls completed')
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
            this.set({ agent_status: { status: 'idle' } })
            
            // 更新占位消息为错误信息
            this.update_assistant_content(assistant_msg_id, {
                content: e.message || t('流式响应返回错误'),
                messageType: 'agent_error',
            })
        } finally {
            if (this.sse_controller === controller)
                this.sse_controller = null
        }
    }
    
    
    retry_last_message () {
        if (!this.current_session_id)
            return
        const current_session = this.sessions.find(session => session.sessionId === this.current_session_id)
        if (current_session?.status === 1 || current_session?.statusName === 'ARCHIVED') {
            model.message?.warning(t('归档会话不可继续发送消息'))
            return
        }
        const last_user_message = [...this.messages].reverse().find(msg => msg.role === 'user' && msg.content.trim())
        if (!last_user_message)
            return
            
        if (this.sse_controller)
            this.abort_sse()
            
        const messages = [...this.messages]
        const last_message = messages[messages.length - 1]
        if (last_message?.role === 'assistant' && last_message.messageType === 'agent_error')
            messages.pop()
            
        const request_seq = ++this._request_seq
        this._active_request_seq = request_seq
        this._interrupted_request_seq = 0
        this._pending_assistant_msg_ids = [ ]
        this.reset_loop_guard()
        this.set({
            messages,
            buffered_messages: [ ],
            pending_tool_loop_control: null,
            agent_status: { status: 'thinking' },
        })
        this.do_chat_completions(last_user_message.content, { append_user: false }, 0, request_seq).catch(error => {
            console.error('Retry chat failed:', error)
            this.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
        })
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
    
    
    build_tool_call_message (parsed_call: ParsedToolCall, msg_id: string, reasoning_content?: string, natural_text?: string): IMessage {
        const tool_call_payload = {
            tool_call: parsed_call.type,
            args: parsed_call.payload,
            ...(natural_text ? { naturalText: natural_text } : { }),
        }
        return {
            msgId: msg_id,
            role: 'assistant',
            messageType: 'tool_call',
            name: parsed_call.type,
            content: JSON.stringify(tool_call_payload),
            reasoning_content: reasoning_content || undefined,
        }
    }
    
    
    async handle_text_tool_calls (
        parsed_calls: ParsedToolCall[],
        reasoning_content: string,
        tool_turn: number,
        request_seq: number,
        first_tool_call_msg_id: string,
        natural_text = '',
    ) {
        const tool_result_contents: string[] = [ ]
        let should_continue_loop = false
        
        for (let index = 0;  index < parsed_calls.length;  index += 1) {
            if (this.is_request_interrupted(request_seq))
                return
            
            const parsed_call = parsed_calls[index]
            const tool_call_msg_id = index === 0
                ? first_tool_call_msg_id
                : `assistant_tool_${Date.now()}_${index}`
            const tool_call_msg = this.build_tool_call_message(
                parsed_call,
                tool_call_msg_id,
                index === 0 ? reasoning_content : undefined,
                index === 0 ? natural_text : '',
            )
            
            if (index === 0)
                this.update_assistant_content(tool_call_msg_id, {
                    content: tool_call_msg.content,
                    reasoning_content: tool_call_msg.reasoning_content,
                    messageType: 'tool_call',
                    name: parsed_call.type,
                })
            else
                this.set({ messages: [...this.messages, tool_call_msg] })
            
            const result = await this.handle_text_tool_call(parsed_call, request_seq, tool_call_msg_id)
            if (!result)
                return
            if (result.stopped)
                return
            if (result.tool_result_content)
                tool_result_contents.push(result.tool_result_content)
            if (result.next_loop)
                should_continue_loop = true
        }
        
        if (this.is_request_interrupted(request_seq))
            return
        
        if (tool_result_contents.length > 0 && should_continue_loop)
            await this.do_chat_completions(tool_result_contents.join('\n\n'), undefined, tool_turn + 1, request_seq)
        else
            this.set({ agent_status: { status: 'idle' } })
    }
    
    
    /** 执行单个文本解析出的工具调用（text-based tool calling） */
    async handle_text_tool_call (parsed_call: ParsedToolCall, request_seq: number, tool_call_msg_id: string): Promise<ToolExecutionResult | null> {
        if (this.is_request_interrupted(request_seq))
            return null
        
        const repeated_result = this.check_repeated_tool_call(parsed_call)
        if (repeated_result)
            return repeated_result
        
        // 构建 ToolContext
        const context: ToolContext = {
            eval: (script, options) => model.ddb.eval(script, options),
            api_fetch: (path, options) => this.api_fetch(path, options),
            session_id: this.current_session_id,
            workspace_id: this.current_session_id,
            workspace_store: chat_workspace_store,
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
            
            const script = SCRIPT_APPROVAL_TOOLS.has(parsed_call.type)
                ? normalize_script_args(parsed_call.payload)[0] || ''
                : ''
            if (script) {
                const decision = await this.request_script_execution_approval(parsed_call.type, script, tool_call_msg_id)
                if (this.is_request_interrupted(request_seq))
                    return null
                if (decision === 'deny') {
                    this._interrupted_request_seq = request_seq
                    this.set({
                        messages: [...this.messages, {
                            msgId: `tool_denied_${Date.now()}`,
                            role: 'tool',
                            messageType: 'tool_error',
                            name: parsed_call.type,
                            content: t('用户未允许执行 DolphinDB 脚本，流程已中断。'),
                        }],
                        agent_status: { status: 'idle' },
                    })
                    return { tool_result_content: '', next_loop: false, stopped: true }
                }
                this.set({ agent_status: { status: 'tool_running' } })
            }
            
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
            return null
        
        let stop_loop = false
        if (script_result.save_message) {
            const guarded = this.apply_loop_guard_to_tool_result(parsed_call.type, script_result.save_message.content)
            script_result = {
                ...script_result,
                next_loop: script_result.next_loop && !guarded.stop,
                save_message: {
                    ...script_result.save_message,
                    content: guarded.content,
                },
            }
            stop_loop = guarded.stop
        }
        this.update_repeated_tool_call_state(parsed_call, script_result.save_message)
        
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
        if (
            parsed_call.type.startsWith('step_') ||
            parsed_call.type.startsWith('vfs_') ||
            parsed_call.type === 'skill_file_copy' ||
            parsed_call.type.startsWith('workspace_state_')
        )
            await this.refresh_workspace_context().catch(error => {
                console.warn('Refresh workspace context failed:', error)
            })
        if (stop_loop)
            this.set({ agent_status: { status: 'idle' } })
            
        // 返回工具结果，由调用方在同一轮多个工具全部结束后合并续传
        const tool_result_content = script_result.save_message
            ? parse_tool_result_json(script_result.save_message.content)
                ? script_result.save_message.content
                : `[${script_result.save_message.messageType}:${parsed_call.type}] ${script_result.save_message.content}`
            : ''
        
        return {
            tool_result_content,
            next_loop: script_result.next_loop,
            stopped: stop_loop,
        }
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
    
    
    _map_skill (s: any): ISkillInfo {
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
    }
    
    
    async load_llm_providers (): Promise<ILlmProvider[]> {
        try {
            const result = await this.api_fetch('/llm/provider/list')
            return (result.items || [ ]).map((item: any) => this._map_llm_provider(item))
        } catch {
            return [ ]
        }
    }
    
    
    async register_llm_provider (provider: {
        name: string
        adapterType: string
        baseUrl: string
        apiKey?: string
        enabled?: boolean
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
        await this.update_llm_provider(provider_id, { enabled: false })
    }
    
    
    async enable_llm_provider (provider_id: string): Promise<void> {
        await this.update_llm_provider(provider_id, { enabled: true })
    }
    
    
    /** 删除 Provider：后端要求没有未删除的模型配置引用 */
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
        enabled?: boolean
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
        await this.update_llm_config(llm_config_id, { enabled: false })
    }
    
    
    async enable_llm_config (llm_config_id: string): Promise<void> {
        await this.update_llm_config(llm_config_id, { enabled: true })
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
    
    
    async load_user_llm_access (user_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`)
        return result.items || [ ]
    }
    
    
    async grant_user_llm_access (user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access`, {
            method: 'POST',
            body: JSON.stringify({ llmConfigId: llm_config_id }),
        })
        return result.items || [ ]
    }
    
    
    async revoke_user_llm_access (user_id: string, llm_config_id: string): Promise<IUserLlmAccessInfo[]> {
        const result = await this.api_fetch(`/user/${encodeURIComponent(user_id)}/llm/access?llmConfigId=${encodeURIComponent(llm_config_id)}`, {
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
        return this.api_fetch(`/llm/usage?${search}`)
    }
    
    
    async init_builtins (params: { dryRun?: boolean, includeDetails?: boolean }): Promise<IBuiltinInitResult> {
        return this.api_fetch('/builtin/init', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    
    
    async load_builtin_init_status (include_details = false): Promise<IBuiltinInitResult> {
        return this.api_fetch(`/builtin/init/status?includeDetails=${include_details}`)
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
    
    
    // ─── 记忆管理 ───
    
    async store_memory (memory: {
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
    }
    
    
    async get_memory (memory_id: string): Promise<IMemoryEntry> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`)
    }
    
    
    async update_memory (memory_id: string, updates: Partial<IMemoryEntry>): Promise<IMemoryEntry> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        })
    }
    
    
    async delete_memory (memory_id: string): Promise<{ memoryId: string, deleted: boolean }> {
        return this.api_fetch(`/memory/${encodeURIComponent(memory_id)}`, { method: 'DELETE' })
    }
    
    
    async search_memory (params: {
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
    }
    
    
    async list_memory_by_category (params: { agentId: string, category: string, offset?: number, limit?: number }): Promise<{ items: IMemoryEntry[], size: number, offset?: number, limit?: number }> {
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
    }
    
    
    async load_memory_stats (agent_id: string): Promise<IMemoryStats> {
        return this.api_fetch(`/memory/stats?agentId=${encodeURIComponent(agent_id)}`)
    }
    
    
    // ─── 技能管理 ───
    
    async load_skills (): Promise<ISkillInfo[]> {
        try {
            const result = await this.api_fetch('/skill/list')
            return (result.items || [ ]).map((s: any) => this._map_skill(s))
        } catch {
            return [ ]
        }
    }
    
    
    async get_skill (skill_id: string): Promise<ISkillInfo> {
        return this._map_skill(await this.api_fetch(`/skill/${encodeURIComponent(skill_id)}`))
    }
    
    
    async get_skill_by_name (skill_name: string): Promise<ISkillInfo> {
        return this._map_skill(await this.api_fetch(`/skill/byName/${encodeURIComponent(skill_name)}`))
    }
    
    
    async update_skill (skill_id: string, file?: File, overrides?: Record<string, unknown>): Promise<ISkillInfo> {
        const body: Record<string, any> = { }
        if (file) {
            const buffer = await file.arrayBuffer()
            body.packageBase64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
        }
        if (overrides && Object.keys(overrides).length > 0)
            body.overrides = overrides
        return this._map_skill(await this.api_fetch(`/skill/${encodeURIComponent(skill_id)}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        }))
    }
    
    
    async load_skill_instruction (skill_id: string): Promise<any> {
        return this.api_fetch(`/skill/${encodeURIComponent(skill_id)}/instruction`)
    }
    
    
    async load_skill_files (skill_id: string): Promise<{ skillId: string, items: string[], size: number }> {
        const result = await this.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/list`)
        return { ...result, items: result.items || [ ] }
    }
    
    
    async get_skill_file (skill_id: string, file_path: string): Promise<ISkillFileContent> {
        return this.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/get?filePath=${encodeURIComponent(file_path)}`)
    }
    
    
    async batch_get_skill_files (skill_id: string, file_paths: string[]): Promise<{ items: ISkillFileContent[], size: number }> {
        const result = await this.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/batchGet`, {
            method: 'POST',
            body: JSON.stringify({ filePaths: file_paths }),
        })
        return { ...result, items: result.items || [ ] }
    }
    
    
    async load_skill_catalog (agent_id: string): Promise<any> {
        return this.api_fetch(`/skill/${encodeURIComponent(agent_id)}/catalog`)
    }
    
    
    async load_skill_context (agent_id: string, active_skill_names: string[] = [ ]): Promise<any> {
        return this.api_fetch(`/skill/${encodeURIComponent(agent_id)}/context`, {
            method: 'POST',
            body: JSON.stringify({ activeSkillNames: active_skill_names }),
        })
    }
    
    
    async deny_user_skill (agent_id: string, skill_id: string, user_id: string): Promise<any> {
        return this.api_fetch('/skill/user/deny', {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id, skillId: skill_id, userId: user_id }),
        })
    }
    
    
    async allow_user_skill (agent_id: string, skill_id: string, user_id: string): Promise<any> {
        return this.api_fetch('/skill/user/allow', {
            method: 'POST',
            body: JSON.stringify({ agentId: agent_id, skillId: skill_id, userId: user_id }),
        })
    }
    
    
    async load_denied_user_skills (agent_id: string, user_id: string): Promise<{ agentId: string, userId: string, skillIds: string[], size: number }> {
        const result = await this.api_fetch(`/skill/${encodeURIComponent(agent_id)}/user/${encodeURIComponent(user_id)}/denied`)
        return { ...result, skillIds: result.skillIds || [ ] }
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
                enabled: (b.available ?? b.enabled) !== false,
                available: b.available ?? b.enabled,
                source: b.source,
                subjectType: b.subjectType,
                subjectId: b.subjectId,
                descOverride: b.descOverride,
                createTime: b.createTime,
                updateTime: b.updateTime,
                skill: b.skill ? this._map_skill(b.skill) : undefined,
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
                .filter(b => b.enabled && b.available !== false && b.skill)
                .map(b => {
                    const s = b.skill!
                    return {
                        skillId: b.skillId || s.skillId,
                        name: s.name || (s as any).skillName,
                        description: b.descOverride ?? s.description,
                        enabled: s.enabled,
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
    
    
    async toggle_skill_binding (skill_id: string, enabled: boolean, agent_id = this.agent_id): Promise<void> {
        if (!agent_id)
            throw new Error(t('请先选择 Agent'))
        if (enabled)
            await this.bind_skill(skill_id, agent_id)
        else
            await this.unbind_skill(skill_id, agent_id)
    }
    
    
    /** 注册新技能（上传 ZIP 技能包） */
    async register_skill (file: File, overrides?: Record<string, unknown>): Promise<ISkillInfo> {
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
        return this._map_skill({
            ...result,
            skillId: result.skillId || result.skill_id || result.id,
        })
    }
    
    
    /** 删除技能 */
    async delete_skill (skill_id: string): Promise<void> {
        await this.api_fetch(`/skill/${encodeURIComponent(skill_id)}`, { method: 'DELETE' })
    }
    
    
    async set_skill_enabled (skill_id: string, enabled: boolean): Promise<void> {
        await this.update_skill(skill_id, undefined, { enabled })
    }
}


export let chat_model = new ChatModel()
