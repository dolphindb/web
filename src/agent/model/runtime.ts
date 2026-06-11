import { t } from '@i18n'
import { model, storage_keys } from '@model'

import { get_script_handler } from '@/agent/scripts/index.ts'
import type { ToolContext, ScriptResult } from '@/agent/scripts/types.ts'
import {
    append_tool_result_hint,
    is_structured_tool_result_helpful,
    normalize_script_args,
    parse_tool_result_json,
    tool_result_json,
} from '@/agent/scripts/helpers.ts'
import { build_current_todo_prompt } from '@/agent/prompt.ts'
import {
    legacy_json_tool_call_adapter,
    native_tool_call_adapter,
} from '@/agent/tool_call_adapters.ts'
import type { ChatCompletionOptions, ToolCallAdapter, ToolResultPayload } from '@/agent/tool_call_adapters.ts'
import { INVALID_TOOL_CALL_FORMAT } from '@/agent/tool_call_parser.ts'
import type { ParsedToolCall } from '@/agent/tool_call_parser.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import type { ChatCompletionStreamResult, IMessage, IScriptExecutionApproval, IToolCall, MessageType, ScriptExecuteApprovalDecision, ScriptExecuteApprovalMode, ToolExecutionResult } from './types.ts'
import { MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT, MAX_REPEATED_TOOL_CALLS, MAX_TOOL_TURNS, REPEAT_GUARD_EXEMPT_TOOLS, DDB_RESULT_TOOLS, SCRIPT_APPROVAL_TOOLS, TOOL_CALL_LIMIT_ENABLED_KEY } from './constants.ts'
import { get_reasoning_text, parse_sse_event, stable_json_stringify, to_stream_text } from './helpers.ts'

export const chat_model_runtime_actions = {
    abort_sse (this: any) {
        if (this.sse_controller) {
            this.sse_controller.abort()
            this.sse_controller = null
        }
    },
    
    
    is_request_interrupted (this: any, request_seq: number): boolean {
        return request_seq > 0 && this._interrupted_request_seq === request_seq
    },
    
    
    get_session_script_execute_approval_mode (this: any, session_id = this.current_session_id): ScriptExecuteApprovalMode {
        if (!session_id)
            return 'approval'
        return this._session_script_approval_modes.get(session_id) || 'approval'
    },
    
    
    set_script_execute_approval_mode (this: any, mode: ScriptExecuteApprovalMode, session_id = this.current_session_id) {
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
    },
    
    
    resolve_script_execution_approval (this: any, decision: ScriptExecuteApprovalDecision) {
        const resolver = this._script_approval_resolver
        const pending = this.pending_script_approval
        
        this._script_approval_resolver = null
        if (decision === 'allow_session' && pending?.sessionId)
            this.set_script_execute_approval_mode('auto', pending.sessionId)
        
        this.set({ pending_script_approval: null })
        resolver?.(decision)
    },
    
    
    async request_script_execution_approval (this: any, tool_name: string, script: string, message_id: string): Promise<ScriptExecuteApprovalDecision> {
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
    },
    
    
    clear_pending_script_approval (this: any, decision: ScriptExecuteApprovalDecision = 'deny') {
        if (this._script_approval_resolver || this.pending_script_approval)
            this.resolve_script_execution_approval(decision)
    },
    
    
    remove_pending_empty_assistant_messages (this: any) {
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
    },
    
    
    interrupt_chat (this: any) {
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
    },
    
    
    upsert_message (this: any, msg: IMessage) {
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
    },
    
    
    reset_loop_guard (this: any) {
        this._last_tool_call_signature = ''
        this._last_tool_call_failed = false
        this._consecutive_failed_tool_call_count = 0
        this._consecutive_ddb_failures = 0
        this._tool_turn_limit = MAX_TOOL_TURNS
    },
    
    
    is_ddb_connected (this: any) {
        return Boolean(model.ddb?.connected)
    },
    
    
    clear_context_compaction_status (this: any) {
        if (this.agent_status.status === 'compacting')
            this.set({ agent_status: { status: 'thinking' } })
    },
    
    
    get_tool_call_adapter (this: any): ToolCallAdapter {
        const use_native_tool_calling = this.should_use_native_tool_calling()
        if (use_native_tool_calling !== this.use_native_tool_calling)
            this.set({ use_native_tool_calling })
        return use_native_tool_calling
            ? native_tool_call_adapter
            : legacy_json_tool_call_adapter
    },
    
    
    get_tool_call_signature (this: any, parsed_call: ParsedToolCall) {
        const tool_name = parsed_call.type.trim()
        if (DDB_RESULT_TOOLS.has(tool_name))
            return `${tool_name}\u001f${(normalize_script_args(parsed_call.payload)[0] || '').trim()}`
        return `${tool_name}\u001f${stable_json_stringify(parsed_call.payload)}`
    },
    
    
    build_repeated_tool_call_result (this: any, parsed_call: ParsedToolCall, count: number, stop_loop: boolean): ToolExecutionResult {
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
    },
    
    
    check_repeated_tool_call (this: any, parsed_call: ParsedToolCall): ToolExecutionResult | null {
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
    },
    
    
    is_failed_tool_result (this: any, tool_name: string, message?: IMessage) {
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
    },
    
    
    update_repeated_tool_call_state (this: any, parsed_call: ParsedToolCall, message?: IMessage) {
        const signature = this.get_tool_call_signature(parsed_call)
        const failed = this.is_failed_tool_result(parsed_call.type, message)
        this._consecutive_failed_tool_call_count = signature === this._last_tool_call_signature && failed
            ? this._consecutive_failed_tool_call_count + 1
            : failed ? 1 : 0
        this._last_tool_call_signature = signature
        this._last_tool_call_failed = failed
    },
    
    
    apply_loop_guard_to_tool_result (this: any, tool_name: string, content: string): { content: string, stop: boolean } {
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
    },
    
    
    request_tool_loop_decision (this: any, message: string, options: ChatCompletionOptions, tool_turn: number, request_seq: number) {
        this.set({
            pending_tool_loop_control: {
                id: `tool_loop_${Date.now()}`,
                sessionId: this.current_session_id,
                requestSeq: request_seq,
                toolTurn: tool_turn,
                message,
                options,
            },
            agent_status: {
                status: 'tool_running',
                message: t('Agent 已连续运行较长时间，是否继续'),
            },
        })
    },
    
    
    set_tool_call_limit_enabled (this: any, enabled: boolean) {
        localStorage.setItem(TOOL_CALL_LIMIT_ENABLED_KEY, String(enabled))
        this.set({ tool_call_limit_enabled: enabled })
    },
    
    
    ignore_tool_call_limit (this: any) {
        this.set_tool_call_limit_enabled(false)
        this.continue_tool_loop()
    },
    
    
    continue_tool_loop (this: any) {
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
        this.do_chat_completions(pending.message, pending.options, pending.toolTurn, pending.requestSeq).catch(error => {
            console.error('Continue tool loop failed:', error)
            this.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
        })
    },
    
    
    send_message (this: any, content: string) {
        if (!content.trim() || !this.current_session_id)
            return
        if (!this.is_ddb_connected()) {
            model.message?.warning(t('DolphinDB 连接已断开，无法发送消息'))
            return
        }
        
        if (this.agent_status.status !== 'idle' || this.sse_controller)
            this.interrupt_chat()
        
        const request_seq = ++this._request_seq
        this._active_request_seq = request_seq
        this._interrupted_request_seq = 0
        this._pending_assistant_msg_ids = [ ]
        this.reset_loop_guard()
        this._last_failed_completion = null
        this.set({ pending_tool_loop_control: null })
        
        // 添加待发送提示
        this.set({ buffered_messages: [...this.buffered_messages, content.trim()] })
        
        // 异步执行 SSE 对话
        this.do_chat_completions(content.trim(), undefined, 0, request_seq).catch(e => {
            console.error('Chat completions failed:', e)
        })
    },
    
    
    async read_chat_completion_stream (this: any, response: Response, assistant_msg_id: string, request_seq: number): Promise<ChatCompletionStreamResult> {
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
    },
    
    
    async do_chat_completions (this: any, message: string, options: ChatCompletionOptions = { }, _tool_turn = 0, request_seq = this._active_request_seq) {
        if (this.tool_call_limit_enabled && _tool_turn > this._tool_turn_limit) {
            this.request_tool_loop_decision(message, options, _tool_turn, request_seq)
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
            const tool_call_adapter = this.get_tool_call_adapter()
            const is_tool_result_turn = Boolean(options.tool_results?.length)
            const current_todo_prompt = is_tool_result_turn ? '' : build_current_todo_prompt(this.current_workspace, this.steps)
            const context_blocks = [
                {
                    name: 'web_tool_call_rules',
                    content: tool_call_adapter.build_system_prompt(skills),
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
                assemblyConfig: {
                    contextBlocks: context_blocks,
                },
            }
            tool_call_adapter.apply_request_body(body, message, options)
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
            
            this._last_failed_completion = null
            
            console.log('Chat completions response:', raw_result)
            
            // 从文本内容或 function calling 格式中解析工具调用
            console.log('[debug] content length:', content.length, 'toolCalls:', tool_calls)
            const parsed_calls = tool_call_adapter.parse_tool_calls(tool_calls, content)
            console.log('[debug] parsed_calls:', parsed_calls)
            
            if (parsed_calls.length > 0) {
                this.set({ agent_status: { status: 'tool_running' } })
                console.log('[debug] Calling handle_tool_calls...')
                await this.handle_tool_calls(
                    parsed_calls,
                    reasoning_content,
                    _tool_turn,
                    request_seq,
                    assistant_msg_id,
                    content,
                    tool_call_adapter
                )
                console.log('[debug] handle_tool_calls completed')
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
            this._last_failed_completion = { message, options, toolTurn: _tool_turn }
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
    },
    
    
    retry_last_message (this: any) {
        if (!this.current_session_id)
            return
        if (this.sse_controller)
            this.abort_sse()
            
        const messages = [...this.messages]
        const last_message = messages[messages.length - 1]
        if (last_message?.role === 'assistant' && last_message.messageType === 'agent_error')
            messages.pop()
        
        const retry_completion = this._last_failed_completion
        const last_user_message = retry_completion ? null : [...messages].reverse().find(msg => msg.role === 'user' && msg.content.trim())
        if (!retry_completion && !last_user_message)
            return
            
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
        this.do_chat_completions(
            retry_completion?.message ?? last_user_message!.content,
            retry_completion?.options ?? { append_user: false },
            retry_completion?.toolTurn ?? 0,
            request_seq
        ).catch(error => {
            console.error('Retry chat failed:', error)
            this.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
        })
    },
    
    
    update_assistant_content (this: any, msg_id: string, updates: { content?: string, reasoning_content?: string, tool_calls?: IToolCall[], messageType?: MessageType, name?: string }) {
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
    },
    
    
    async handle_tool_calls (this: any, 
        parsed_calls: ParsedToolCall[],
        reasoning_content: string,
        tool_turn: number,
        request_seq: number,
        first_tool_call_msg_id: string,
        response_content: string,
        tool_call_adapter: ToolCallAdapter,
    ) {
        const tool_result_contents: string[] = [ ]
        const tool_results: ToolResultPayload[] = [ ]
        let should_continue_loop = false
        const natural_text = tool_call_adapter.get_natural_text(response_content).trim()
        const has_natural_text = Boolean(natural_text)
        
        if (has_natural_text)
            this.update_assistant_content(first_tool_call_msg_id, {
                content: natural_text,
                reasoning_content: reasoning_content || undefined,
                messageType: 'text',
            })
        
        for (let index = 0;  index < parsed_calls.length;  index += 1) {
            if (this.is_request_interrupted(request_seq))
                return
            
            const parsed_call = parsed_calls[index]
            const tool_call_msg_id = !has_natural_text && index === 0
                ? first_tool_call_msg_id
                : `assistant_tool_${Date.now()}_${index}`
            const tool_call_msg = tool_call_adapter.build_tool_call_message(
                parsed_call,
                tool_call_msg_id,
                !has_natural_text && index === 0 ? reasoning_content : undefined,
                '',
            )
            
            if (!has_natural_text && index === 0)
                this.update_assistant_content(tool_call_msg_id, {
                    content: tool_call_msg.content,
                    reasoning_content: tool_call_msg.reasoning_content,
                    messageType: 'tool_call',
                    name: parsed_call.type,
                    tool_calls: tool_call_msg.tool_calls,
                })
            else
                this.set({ messages: [...this.messages, tool_call_msg] })
            
            const result = await this.execute_tool_call(parsed_call, request_seq, tool_call_msg_id)
            if (!result)
                return
            if (result.stopped)
                return
            if (result.tool_result_content)
                tool_result_contents.push(result.tool_result_content)
            tool_call_adapter.collect_tool_result(parsed_call, result.tool_result_content, tool_results)
            if (result.next_loop)
                should_continue_loop = true
        }
        
        if (this.is_request_interrupted(request_seq))
            return
        
        const runtime_context = build_current_todo_prompt(this.current_workspace, this.steps)
        const continuation = tool_call_adapter.build_continuation(tool_result_contents, tool_results, runtime_context)
        if (continuation && should_continue_loop)
            await this.do_chat_completions(continuation.message, continuation.options, tool_turn + 1, request_seq)
        else
            this.set({ agent_status: { status: 'idle' } })
    },
    
    
    async execute_tool_call (this: any, parsed_call: ParsedToolCall, request_seq: number, tool_call_msg_id: string): Promise<ToolExecutionResult | null> {
        if (this.is_request_interrupted(request_seq))
            return null
        if (parsed_call.type === INVALID_TOOL_CALL_FORMAT) {
            const content = tool_result_json({
                ok: false,
                tool: parsed_call.type,
                content: '',
                error: t('工具调用 JSON 格式错误'),
                hint: t('检测到以 tool 开头的 JSON 字段，但格式不符合要求。请使用 {"tool_call":"工具名","args":[...]}，例如 {"tool_call":"step_update","args":["0","true"]}。不要使用 tool_update、tool_calls_update 等自定义字段。'),
                preview: parsed_call.payload,
            })
            this.set({
                messages: [...this.messages, {
                    msgId: `tool_invalid_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: parsed_call.type,
                    content,
                }],
            })
            return {
                tool_result_content: content,
                next_loop: true,
            }
        }
        
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
}

export type ChatModelRuntimeActions = typeof chat_model_runtime_actions
