import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import { shell } from '@/shell/model.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import { parse_tool_result_payload } from '@/agent/utils/message.ts'

import type { IMessage, ISession, IToolCall } from './types.ts'

export class ChatSessionModel {
    constructor (private chat: ChatModel) { }
    async load_sessions () {
        const params = new URLSearchParams({
            agentId: this.chat.agent_id,
        })
        const result = await this.chat.agent.api_fetch(`/session/list?${params}`)
        const sessions: ISession[] = (result.items || [ ]).map((s: any) => this.chat.session.map_session(s))
        sessions.sort((a, b) => {
            const ta = a.updateTime ? Date.parse(a.updateTime) : 0
            const tb = b.updateTime ? Date.parse(b.updateTime) : 0
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
        })
        this.chat.set({ sessions })
    }
    async create_session (title = t('新会话')): Promise<ISession> {
        const script_execute_approval_mode = this.chat.script_execute_approval_mode
        const body: Record<string, any> = {
            agentId: this.chat.agent_id,
            title,
        }
        const llm_config_id = this.chat.agent.get_effective_llm_config_id()
        if (llm_config_id)
            body.llmConfigId = llm_config_id
            
        const result = await this.chat.agent.api_fetch('/session/create', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        const session: ISession = {
            sessionId: result.sessionId,
            agentId: result.agentId,
            title: result.title || t('新会话'),
            llmConfigId: result.llmConfigId,
            createTime: result.createTime,
            updateTime: result.updateTime,
        }
        this.chat._session_script_approval_modes.set(session.sessionId, script_execute_approval_mode)
        const workspace = await chat_workspace_store.ensure_default_workspace(session.sessionId, (path, options) => this.chat.agent.api_fetch(path, options))
        const workspaces = await chat_workspace_store.list_workspaces(session.sessionId, (path, options) => this.chat.agent.api_fetch(path, options))
        this.chat.set({
            sessions: [session, ...this.chat.sessions],
            current_session_id: session.sessionId,
            workspaces,
            current_workspace_id: workspace.workspace_id,
            current_workspace: workspace,
            steps: [ ],
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            script_execute_approval_mode,
            // 新会话同步 LLM 选择（后端可能返回实际绑定的 llmConfigId）
            selected_llm_config_id: session.llmConfigId || '',
            use_native_tool_calling: this.chat.agent.should_use_native_tool_calling(session.llmConfigId || ''),
        })
        return session
    }
    async select_session (session_id: string) {
        if (session_id === this.chat.current_session_id)
            return
            
        this.chat.runtime.abort_sse()
        const session = this.chat.sessions.find(s => s.sessionId === session_id) || await this.chat.session.get_session(session_id)
        if (!this.chat.sessions.some(s => s.sessionId === session_id))
            this.chat.set({ sessions: [session, ...this.chat.sessions] })
        
        this.chat.set({
            current_session_id: session_id,
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            latest_ddb_result: null,
            script_execute_approval_mode: this.chat.runtime.get_session_script_execute_approval_mode(session_id),
            // 同步会话级 LLM 选择
            selected_llm_config_id: session.llmConfigId || '',
            use_native_tool_calling: this.chat.agent.should_use_native_tool_calling(session.llmConfigId || ''),
        })
        
        await this.chat.workspace.refresh_workspace_context(session_id)
        
        // 加载历史消息
        const result = await this.chat.agent.api_fetch(`/session/${session_id}/messages`)
        const raw_items: any[] = result.items || [ ]
        const messages = raw_items
            .map((m: any) => this.chat.session.map_dolphinx_message(m))
            .filter((m): m is IMessage => m !== null)
        this.chat.set({ messages })
    }
    async delete_session (session_id: string) {
        await this.chat.agent.api_fetch(`/session/${session_id}`, { method: 'DELETE' })
        const new_sessions = this.chat.sessions.filter(s => s.sessionId !== session_id)
        
        if (this.chat.current_session_id === session_id) {
            this.chat.runtime.abort_sse()
            this.chat.set({
                current_session_id: '',
                current_workspace_id: '',
                current_workspace: null,
                steps: [ ],
                messages: [ ],
                buffered_messages: [ ],
            })
        }
        
        this.chat.set({ sessions: new_sessions })
    }
    map_session (s: any): ISession {
        return {
            sessionId: s.sessionId,
            agentId: s.agentId,
            title: s.title || t('新会话'),
            llmConfigId: s.llmConfigId,
            createTime: s.createTime,
            updateTime: s.updateTime,
        }
    }
    async get_session (session_id: string): Promise<ISession> {
        return this.chat.session.map_session(await this.chat.agent.api_fetch(`/session/${session_id}`))
    }
    async list_sessions (params: { agentId?: string, targetUserId?: string, offset?: number, limit?: number } = { }): Promise<{ items: ISession[], size: number, offset?: number, limit?: number, total?: number }> {
        const search = new URLSearchParams()
        if (params.agentId)
            search.set('agentId', params.agentId)
        if (params.targetUserId)
            search.set('targetUserId', params.targetUserId)
        if (params.offset !== undefined)
            search.set('offset', String(params.offset))
        if (params.limit !== undefined)
            search.set('limit', String(params.limit))
        
        const result = await this.chat.agent.api_fetch(`/session/list?${search}`)
        return {
            ...result,
            items: (result.items || [ ]).map((s: any) => this.chat.session.map_session(s)),
        }
    }
    async load_session_workspace_stats (session_id: string): Promise<{ workspaceSize: number, workspaceFileCount: number } | null> {
        try {
            const result = await this.chat.agent.api_fetch(`/workspace/${encodeURIComponent(session_id)}/files`)
            const items = Array.isArray(result.items) ? result.items : [ ]
            return {
                workspaceSize: items.reduce((total: number, item: any) => {
                    const size = Number(item.size)
                    return total + (Number.isFinite(size) ? size : 0)
                }, 0),
                workspaceFileCount: items.length,
            }
        } catch (error) {
            console.warn('Load session workspace stats failed:', error)
            return null
        }
    }
    async update_session_title (session_id: string, title: string) {
        const result = this.chat.session.map_session(await this.chat.agent.api_fetch(`/session/${session_id}`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        }))
        this.chat.set({
            sessions: this.chat.sessions.map(s =>
                s.sessionId === session_id ? { ...s, title, updateTime: result.updateTime ?? s.updateTime } : s
            )
        })
        shell.update_ai_tab_title(session_id, title)
    }
    async update_session (session_id: string, updates: Record<string, unknown>): Promise<ISession> {
        const result = this.chat.session.map_session(await this.chat.agent.api_fetch(`/session/${session_id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }))
        this.chat.set({
            sessions: this.chat.sessions.map(s => s.sessionId === session_id ? result : s)
        })
        return result
    }
    async generate_session_summary (session_id: string, params: { instructions?: string, llmConfigId?: string, force?: boolean, metadata?: Record<string, unknown> } = { }): Promise<any> {
        return this.chat.agent.api_fetch(`/session/${session_id}/summary`, {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    async preview_context (params: Record<string, unknown>): Promise<any> {
        return this.chat.agent.api_fetch('/context/preview', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    async auto_generate_title (session_id: string, message: string) {
        if (!session_id)
            return
            
        const title = await this.chat.session.generate_session_title(session_id, message)
        if (title)
            await this.chat.session.update_session_title(session_id, title)
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
        const fallback = this.chat.session.make_fallback_title(message)
        try {
            const result = await this.chat.agent.api_fetch('/llm/complete', {
                method: 'POST',
                body: JSON.stringify({
                    agentId: this.chat.agent_id,
                    sessionId: session_id,
                    stream: false,
                    includeReasoning: false,
                    llmConfigId: this.chat.agent.get_effective_llm_config_id() || undefined,
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
            return this.chat.session.normalize_session_title(String(content), fallback)
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
                else if (Array.isArray(parsed?.toolCalls))
                    tool_calls = parsed.toolCalls
                else if (Array.isArray(parsed?.tool_calls))
                    tool_calls = parsed.tool_calls
            } catch { }
            
        const content: string = m.content || ''
        let name: string | undefined
        
        let display_content = content
        let display_role = m.role as string
        if (message_type === 'tool_result' || message_type === 'skill_result' || message_type === 'tool_error')
            name = parse_tool_result_payload(content).tool
        else if (message_type === 'tool_call' && tool_calls?.length === 1)
            name = tool_calls[0].function.name
        
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
}
