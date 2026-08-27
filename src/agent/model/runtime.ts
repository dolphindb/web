import type { DdbEvalOptions } from 'dolphindb/browser.js'
import { t } from '@i18n'
import { model } from '@model'
import type { ChatModel } from '@/agent/model.ts'
import { chat_shared_model } from './shared.ts'
import type { ScriptResult, ToolContext } from '@/agent/scripts/types.ts'
import { build_web_assembly_config } from '@/agent/prompt.ts'
import {
    legacy_json_tool_call_adapter,
    native_tool_call_adapter,
    type ChatCompletionOptions,
    type ToolCallAdapter,
    type ToolCallContinuation,
} from '@/agent/tool_call_adapters.ts'
import type { ParsedToolCall } from '@/agent/tool_call_parser.ts'
import type {
    ChatCompletionStreamResult,
    IMessage,
    IToolCall,
    MessageType,
    ScriptExecuteApprovalDecision,
    ScriptExecuteApprovalMode,
    ToolExecutionResult,
} from './types.ts'
import { no_available_llm_config_message } from './agent.ts'
import {
    clear_pending_script_approval,
    get_session_script_execute_approval_mode,
    request_script_execution_approval,
    resolve_script_execution_approval,
    set_script_execute_approval_mode,
} from './runtime/approval.ts'
import {
    apply_loop_guard_to_tool_result,
    build_repeated_tool_call_result,
    check_repeated_tool_call,
    continue_tool_loop,
    get_tool_call_signature,
    ignore_tool_call_limit,
    is_failed_tool_result,
    request_tool_loop_decision,
    reset_loop_guard,
    set_tool_call_limit_enabled,
    update_repeated_tool_call_state,
} from './runtime/loop_guard.ts'
import {
    get_agent_bus_error_message,
    get_message_attachments,
    read_chat_completion_stream,
} from './runtime/stream.ts'
import {
    execute_tool_call,
    handle_tool_calls,
    normalize_mcp_tool_arguments,
    try_execute_mcp_tool_call,
} from './runtime/tool_execution.ts'


export class ChatRuntimeModel {
    constructor (private chat: ChatModel) { }
    
    last_doc_search_enabled = true
    
    abort_sse () {
        if (this.chat.sse_controller) {
            this.chat.sse_controller.abort()
            this.chat.sse_controller = null
        }
    }
    
    is_request_inactive (request_seq: number): boolean {
        return request_seq <= 0 ||
            request_seq !== this.chat._active_request_seq ||
            this.chat._interrupted_request_seq === request_seq
    }
    
    get_session_script_execute_approval_mode (session_id = this.chat.current_session_id): ScriptExecuteApprovalMode {
        return get_session_script_execute_approval_mode(this.chat, session_id)
    }
    
    set_script_execute_approval_mode (mode: ScriptExecuteApprovalMode, session_id = this.chat.current_session_id) {
        set_script_execute_approval_mode(this.chat, mode, session_id)
    }
    
    resolve_script_execution_approval (decision: ScriptExecuteApprovalDecision) {
        resolve_script_execution_approval(this.chat, decision)
    }
    
    async request_script_execution_approval (tool_name: string, script: string, message_id: string): Promise<ScriptExecuteApprovalDecision> {
        return request_script_execution_approval(this.chat, tool_name, script, message_id)
    }
    
    clear_pending_script_approval (decision: ScriptExecuteApprovalDecision = 'deny') {
        clear_pending_script_approval(this.chat, decision)
    }
    
    remove_pending_empty_assistant_messages () {
        if (this.chat._pending_assistant_msg_ids.length === 0)
            return
        
        const pending_ids = new Set(this.chat._pending_assistant_msg_ids)
        const messages = this.chat.messages.filter(msg => {
            if (!pending_ids.has(msg.msgId))
                return true
            return Boolean(msg.content.trim() || msg.reasoning_content?.trim() || msg.content_object)
        })
        this.chat._pending_assistant_msg_ids = [ ]
        if (messages.length !== this.chat.messages.length)
            this.chat.set({ messages })
    }
    
    interrupt_chat () {
        if (this.chat.agent_status.status === 'idle' && !this.chat.sse_controller)
            return
        
        this.chat._interrupted_request_seq = this.chat._active_request_seq
        this.abort_sse()
        this.clear_pending_script_approval('deny')
        this.remove_pending_empty_assistant_messages()
        this.chat.set({
            buffered_messages: [ ],
            pending_tool_loop_control: null,
            agent_status: { status: 'idle' },
        })
    }
    
    upsert_message (msg: IMessage) {
        const idx = this.chat.messages.findIndex(m => m.msgId === msg.msgId)
        if (idx < 0)
            this.chat.set({ messages: [...this.chat.messages, msg] })
        else {
            const current = this.chat.messages[idx]
            const merged: IMessage = {
                ...current,
                ...msg,
                messageType: msg.messageType ?? current.messageType,
                content_object: msg.content_object ?? current.content_object,
                reasoning_content: msg.reasoning_content ?? current.reasoning_content,
            }
            const next = [...this.chat.messages]
            next[idx] = merged
            this.chat.set({ messages: next })
        }
    }
    
    reset_loop_guard () {
        reset_loop_guard(this.chat)
    }
    
    is_ddb_connected () {
        return chat_shared_model.is_ddb_connected()
    }
    
    /** 执行 DolphinDB 脚本，委托全局 chat_shared_model 执行 */
    async eval_ddb (script: string, options?: DdbEvalOptions): Promise<any> {
        return chat_shared_model.eval_ddb(script, options)
    }
    
    clear_context_compaction_status () {
        if (this.chat.agent_status.status === 'compacting')
            this.chat.set({ agent_status: { status: 'thinking' } })
    }
    
    get_tool_call_adapter (): ToolCallAdapter {
        const use_native_tool_calling = this.chat._active_use_native_tool_calling
        if (use_native_tool_calling !== this.chat.use_native_tool_calling)
            this.chat.set({ use_native_tool_calling })
        return use_native_tool_calling
            ? native_tool_call_adapter
            : legacy_json_tool_call_adapter
    }
    
    start_turn () {
        const llm_config_id = this.chat.agent.get_turn_llm_config_id()
        this.chat._active_session_id = this.chat.current_session_id
        this.chat._active_agent_id = this.chat.agent_id
        this.chat._active_llm_config_id = llm_config_id
        this.chat._active_use_native_tool_calling = this.chat.agent.should_use_native_tool_calling(llm_config_id)
    }
    
    get_tool_call_signature (parsed_call: ParsedToolCall) {
        return get_tool_call_signature(parsed_call)
    }
    
    build_repeated_tool_call_result (parsed_call: ParsedToolCall, count: number, stop_loop: boolean): ToolExecutionResult {
        return build_repeated_tool_call_result(this.chat, parsed_call, count, stop_loop)
    }
    
    check_repeated_tool_call (parsed_call: ParsedToolCall): ToolExecutionResult | null {
        return check_repeated_tool_call(this.chat, parsed_call)
    }
    
    is_failed_tool_result (tool_name: string, message?: IMessage) {
        return is_failed_tool_result(tool_name, message)
    }
    
    update_repeated_tool_call_state (parsed_call: ParsedToolCall, message?: IMessage) {
        update_repeated_tool_call_state(this.chat, parsed_call, message)
    }
    
    apply_loop_guard_to_tool_result (tool_name: string, content: string): { content: string, stop: boolean } {
        return apply_loop_guard_to_tool_result(this.chat, tool_name, content)
    }
    
    request_tool_loop_decision (message: string, options: ChatCompletionOptions, tool_turn: number, request_seq: number) {
        request_tool_loop_decision(this.chat, message, options, tool_turn, request_seq)
    }
    
    set_tool_call_limit_enabled (enabled: boolean) {
        set_tool_call_limit_enabled(this.chat, enabled)
    }
    
    ignore_tool_call_limit () {
        ignore_tool_call_limit(this.chat)
    }
    
    continue_tool_loop () {
        continue_tool_loop(this.chat)
    }
    
    send_message (content: string, options: ChatCompletionOptions = { }) {
        if ((!content.trim() && !options.content?.length) || !this.chat.current_session_id)
            return
        if (!this.is_ddb_connected()) {
            model.message?.warning(t('DolphinDB 连接已断开，无法发送消息'))
            return
        }
        if (!this.chat.agent.has_available_llm_config()) {
            model.message?.warning(no_available_llm_config_message())
            return
        }
        
        if (this.chat.agent_status.status !== 'idle' || this.chat.sse_controller)
            this.interrupt_chat()
        
        const request_seq = ++this.chat._request_seq
        this.chat._active_request_seq = request_seq
        this.chat._interrupted_request_seq = 0
        this.chat._pending_assistant_msg_ids = [ ]
        this.reset_loop_guard()
        this.start_turn()
        this.chat._last_failed_completion = null
        this.chat.set({ pending_tool_loop_control: null })
        
        if (content.trim())
            this.chat.set({ buffered_messages: [...this.chat.buffered_messages, content.trim()] })
        
        this.do_chat_completions(content.trim(), options, 0, request_seq).catch(e => {
            console.error('Chat completions failed:', e)
        })
    }
    
    async read_chat_completion_stream (response: Response, assistant_msg_id: string, request_seq: number): Promise<ChatCompletionStreamResult> {
        return read_chat_completion_stream(this.chat, response, assistant_msg_id, request_seq)
    }
    
    async do_chat_completions (message: string, options: ChatCompletionOptions = { }, tool_turn = 0, request_seq = this.chat._active_request_seq) {
        // 工具结果只负责提供下一轮输入，整个 Agent 生命周期由这一层循环统一收尾。
        let should_refresh_sessions = false
        while (!this.is_request_inactive(request_seq)) {
            if (this.chat.tool_call_limit_enabled && tool_turn > this.chat._tool_turn_limit) {
                this.request_tool_loop_decision(message, options, tool_turn, request_seq)
                break
            }
            const continuation = await this.do_chat_completion_turn(message, options, tool_turn, request_seq)
            if (continuation === undefined)
                break
            should_refresh_sessions = true
            if (!continuation)
                break
            message = continuation.message
            options = continuation.options ?? { }
            tool_turn += 1
        }
        if (should_refresh_sessions && !this.is_request_inactive(request_seq))
            this.chat.session.load_sessions().catch(() => { })
    }
    private async do_chat_completion_turn (
        message: string,
        options: ChatCompletionOptions,
        tool_turn: number,
        request_seq: number,
    ): Promise<ToolCallContinuation | null | undefined> {
        if (this.is_request_inactive(request_seq))
            return
        const session_id = this.chat._active_session_id
        
        if (tool_turn === 0)
            this.abort_sse()
            
        const controller = new AbortController()
        this.chat.sse_controller = controller
        
        const message_attachments = get_message_attachments(options)
        if ((message || message_attachments.length) && tool_turn === 0 && options.append_user !== false) {
            const has_prior_user_msg = this.chat.messages.some(m => m.role === 'user')
            const user_msg: IMessage = {
                msgId: `user_${Date.now()}`,
                role: 'user',
                messageType: 'text',
                content: message,
                attachments: message_attachments,
            }
            this.chat.set({
                messages: [...this.chat.messages, user_msg],
                buffered_messages: [ ],
                agent_status: { status: 'thinking' },
            })
            
            if (!has_prior_user_msg)
                this.chat.session.auto_generate_title(session_id, message).catch(error => {
                    console.warn('Auto generate session title failed:', error)
                })
        } else
            this.chat.set({
                buffered_messages: [ ],
                agent_status: { status: 'thinking' },
            })
            
        const assistant_msg_id = `assistant_${Date.now()}`
        this.chat._pending_assistant_msg_ids.push(assistant_msg_id)
        this.chat.set({
            messages: [...this.chat.messages, {
                msgId: assistant_msg_id,
                role: 'assistant',
                messageType: 'text',
                content: '',
            }],
        })
        
        try {
            const url = `${this.chat.base_url}/chat/completions`
            const token = model.agent_bus_ticket || await model.refresh_agent_bus_ticket()
            
            const tool_call_adapter = this.get_tool_call_adapter()
            
            const agent = this.chat.agents.find(a => a.agentId === this.chat._active_agent_id)
            const doc_search_enabled = agent?.config?.docSearchEnabled !== false
            const doc_search_enabled_changed = doc_search_enabled !== this.last_doc_search_enabled
            this.last_doc_search_enabled = doc_search_enabled
            
            const assembly_config = build_web_assembly_config(
                agent,
                tool_call_adapter.build_system_prompt(doc_search_enabled, doc_search_enabled_changed),
                this.chat.current_workspace,
                this.chat.steps,
            )
            
            const body: Record<string, any> = {
                sessionId: session_id,
                stream: true,
                contextEvent: true,
                includeReasoning: true,
                assemblyConfig: assembly_config,
            }
            tool_call_adapter.apply_request_body(body, message, options, doc_search_enabled)
            const llm_config_id = this.chat._active_llm_config_id
            if (llm_config_id)
                body.llmConfigId = llm_config_id
                
            const send = (bearer: string) => fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(bearer ? { Authorization: `Bearer ${bearer}` } : { }),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            })
            
            let response = await send(token)
            
            if (response.status === 401) {
                const new_token = await model.refresh_agent_bus_ticket()
                if (new_token)
                    response = await send(new_token)
            }
            
            if (response.status === 401) {
                this.chat.agent.handle_auth_failed()
                throw new Error('Unauthorized')
            }
            
            if (!response.ok) {
                const err_text = await response.text()
                let parsed: any
                try { parsed = JSON.parse(err_text) } catch { }
                throw new Error(get_agent_bus_error_message(parsed, err_text || response.statusText))
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
                if (raw_result.type === 'ERROR')
                    throw new Error(get_agent_bus_error_message(raw_result, t('流式响应返回错误')))
                const data = raw_result.data || raw_result
                content = data.content || ''
                reasoning_content = data.reasoning || data.reasoning_content || data.reasoningContent || ''
                tool_calls = data.toolCalls || data.tool_calls
                const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : data
                if (metadata?.fallbackApplied === true || metadata?.fallbackApplied === 'true') {
                    const target_llm_config_id = metadata?.llmConfigId || data?.llmConfigId || metadata?.fallbackToLlmConfigId
                    if (target_llm_config_id && typeof target_llm_config_id === 'string') {
                        const use_native_tool_calling = this.chat.agent.should_use_native_tool_calling(target_llm_config_id)
                        this.chat._active_llm_config_id = target_llm_config_id
                        this.chat._active_use_native_tool_calling = use_native_tool_calling
                        this.chat.set({
                            selected_llm_config_id: target_llm_config_id,
                            use_native_tool_calling,
                        })
                    }
                }
                this.update_assistant_content(assistant_msg_id, {
                    content,
                    reasoning_content: reasoning_content || undefined,
                })
            }
            
            if (this.is_request_inactive(request_seq))
                return
            
            this.chat._last_failed_completion = null
            
            if (model.verbose)
                console.log('Chat completions response:', raw_result)
                
            const active_tool_call_adapter = this.get_tool_call_adapter()
            const parsed_calls = active_tool_call_adapter.parse_tool_calls(tool_calls, content)
            let continuation: ToolCallContinuation | null = null
            
            if (parsed_calls.length > 0) {
                this.chat.set({ agent_status: { status: 'tool_running' } })
                const tool_continuation = await this.handle_tool_calls(
                    parsed_calls,
                    reasoning_content,
                    request_seq,
                    assistant_msg_id,
                    content,
                    active_tool_call_adapter
                )
                if (tool_continuation === undefined)
                    return
                continuation = tool_continuation
            } else {
                if (!content.trim() && !reasoning_content.trim())
                    this.update_assistant_content(assistant_msg_id, {
                        content: t('模型返回了空响应'),
                        messageType: 'agent_error',
                    })
                    
                this.chat.set({ agent_status: { status: 'idle' } })
            }
            
            if (this.is_request_inactive(request_seq))
                return
            return continuation
        } catch (e: any) {
            if (e.name === 'AbortError') {
                if (this.is_request_inactive(request_seq))
                    this.remove_pending_empty_assistant_messages()
                return
            }
            if (this.is_request_inactive(request_seq))
                return
            console.error('Chat completions error:', e)
            this.chat._last_failed_completion = { message, options, toolTurn: tool_turn }
            this.chat.set({ agent_status: { status: 'idle' } })
            
            this.update_assistant_content(assistant_msg_id, {
                content: e.message || t('流式响应返回错误'),
                messageType: 'agent_error',
            })
        } finally {
            if (this.chat.sse_controller === controller)
                this.chat.sse_controller = null
        }
    }
    
    retry_last_message () {
        if (!this.chat.current_session_id)
            return
        if (!this.chat.agent.has_available_llm_config()) {
            model.message?.warning(no_available_llm_config_message())
            return
        }
        if (this.chat.agent_status.status !== 'idle' || this.chat.sse_controller)
            this.interrupt_chat()
            
        const messages = [...this.chat.messages]
        const last_message = messages[messages.length - 1]
        if (last_message?.role === 'assistant' && last_message.messageType === 'agent_error')
            messages.pop()
        
        const retry_completion = this.chat._last_failed_completion
        const last_user_message = retry_completion ? null : [...messages].reverse().find(msg => msg.role === 'user' && msg.content.trim())
        if (!retry_completion && !last_user_message)
            return
            
        const request_seq = ++this.chat._request_seq
        this.chat._active_request_seq = request_seq
        this.chat._interrupted_request_seq = 0
        this.chat._pending_assistant_msg_ids = [ ]
        this.reset_loop_guard()
        if (!retry_completion || retry_completion.toolTurn === 0)
            this.start_turn()
        this.chat.set({
            messages,
            buffered_messages: [ ],
            pending_tool_loop_control: null,
            agent_status: { status: 'thinking' },
        })
        this.do_chat_completions(
            retry_completion?.message ?? last_user_message!.content,
            retry_completion?.options ?? { append_user: false },
            retry_completion?.toolTurn ?? 0,
            request_seq
        ).catch(error => {
            console.error('Retry chat failed:', error)
            this.chat.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
        })
    }
    
    update_assistant_content (msg_id: string, updates: { content?: string, reasoning_content?: string, tool_calls?: IToolCall[], messageType?: MessageType, name?: string }) {
        const idx = this.chat.messages.findIndex(m => m.msgId === msg_id)
        if (idx < 0)
            return
            
        const current = this.chat.messages[idx]
        const next = [...this.chat.messages]
        next[idx] = {
            ...current,
            ...(updates.content !== undefined ? { content: updates.content } : { }),
            ...(updates.reasoning_content !== undefined ? { reasoning_content: updates.reasoning_content } : { }),
            ...(updates.tool_calls ? { tool_calls: updates.tool_calls } : { }),
            ...(updates.messageType ? { messageType: updates.messageType } : { }),
            ...(updates.name ? { name: updates.name } : { }),
        }
        this.chat.set({ messages: next })
    }
    
    async handle_tool_calls (
        parsed_calls: ParsedToolCall[],
        reasoning_content: string,
        request_seq: number,
        first_tool_call_msg_id: string,
        response_content: string,
        tool_call_adapter: ToolCallAdapter,
    ) {
        return handle_tool_calls(
            this.chat,
            parsed_calls,
            reasoning_content,
            request_seq,
            first_tool_call_msg_id,
            response_content,
            tool_call_adapter,
        )
    }
    
    async execute_tool_call (parsed_call: ParsedToolCall, request_seq: number, tool_call_msg_id: string): Promise<ToolExecutionResult | null> {
        return execute_tool_call(this.chat, parsed_call, request_seq, tool_call_msg_id)
    }
    
    normalize_mcp_tool_arguments (payload: unknown): Record<string, unknown> {
        return normalize_mcp_tool_arguments(payload)
    }
    
    async try_execute_mcp_tool_call (parsed_call: ParsedToolCall, context: ToolContext): Promise<ScriptResult> {
        return try_execute_mcp_tool_call(this.chat, parsed_call, context)
    }
}
