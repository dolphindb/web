import { t } from '@i18n'
import { model } from '@model'
import type { ChatModel } from '@/agent/model.ts'
import { get_script_handler } from '@/agent/scripts/index.ts'
import type { ScriptResult, ToolContext } from '@/agent/scripts/types.ts'
import {
    is_ddb_connection_error,
    normalize_script_args,
    parse_tool_result_json,
    tool_result_json,
} from '@/agent/scripts/helpers.ts'
import type { ToolCallAdapter, ToolCallContinuation, ToolResultPayload } from '@/agent/tool_call_adapters.ts'
import { INVALID_TOOL_CALL_FORMAT, type ParsedToolCall } from '@/agent/tool_call_parser.ts'
import { spill_large_tool_result_content_if_needed } from '@/agent/tool_result_spill.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import type { IMessage, ToolExecutionResult } from '@/agent/model/types.ts'
import { SCRIPT_APPROVAL_TOOLS } from '@/agent/model/constants.ts'


export function normalize_mcp_tool_arguments (payload: unknown): Record<string, unknown> {
    if (payload === null || payload === undefined)
        return { }
    if (typeof payload === 'string') {
        const trimmed = payload.trim()
        if (!trimmed)
            return { }
        try {
            return normalize_mcp_tool_arguments(JSON.parse(trimmed))
        } catch {
            return { value: payload }
        }
    }
    if (typeof payload === 'object' && !Array.isArray(payload))
        return payload as Record<string, unknown>
    return { value: payload }
}


export async function try_execute_mcp_tool_call (chat: ChatModel, parsed_call: ParsedToolCall, context: ToolContext): Promise<ScriptResult> {
    try {
        const result = await context.api_fetch('/mcp/tools/call', {
            method: 'POST',
            body: JSON.stringify({
                agentId: context.agent_id,
                sessionId: context.session_id,
                toolName: parsed_call.type,
                arguments: normalize_mcp_tool_arguments(parsed_call.payload),
            }),
        })
        const ok = result?.ok !== false && result?.isError !== true
        const content = await spill_large_tool_result_content_if_needed(
            JSON.stringify(result?.content ?? result?.raw ?? result ?? { }),
            parsed_call.type,
            context,
        )
        return {
            next_loop: true,
            save_message: {
                msgId: `tool_${Date.now()}`,
                role: 'tool',
                messageType: ok ? 'tool_result' : 'tool_error',
                name: parsed_call.type,
                content: tool_result_json({
                    ok,
                    tool: parsed_call.type,
                    resultType: 'mcp',
                    content,
                    error: result?.error,
                    preview: {
                        ok: result?.ok,
                        tool: result?.tool,
                        mcpServerId: result?.mcpServerId,
                        originalName: result?.originalName,
                        isError: result?.isError,
                        truncated: result?.truncated,
                        error: result?.error,
                    },
                }),
            },
        }
    } catch (e) {
        return {
            next_loop: true,
            save_message: {
                msgId: `tool_${Date.now()}`,
                role: 'tool',
                messageType: 'tool_error',
                name: parsed_call.type,
                content: tool_result_json({
                    ok: false,
                    tool: parsed_call.type,
                    resultType: 'mcp',
                    content: '',
                    error: e instanceof Error ? e.message : String(e),
                }),
            },
        }
    }
}


export async function execute_tool_call (
    chat: ChatModel,
    parsed_call: ParsedToolCall,
    request_seq: number,
    tool_call_msg_id: string
): Promise<ToolExecutionResult | null> {
    if (chat.runtime.is_request_inactive(request_seq))
        return null
    if (chat._ddb_connection_failed) {
        const content = tool_result_json({
            ok: false,
            tool: parsed_call.type,
            content: '',
            error: t('DolphinDB 连接已断开，工具执行已终止。'),
            hint: t('DolphinDB 连接已断开，已停止工具循环。请直接向用户输出回复。'),
        })
        chat.set({
            messages: [...chat.messages, {
                msgId: `tool_conn_failed_${Date.now()}`,
                role: 'tool',
                messageType: 'tool_error',
                name: parsed_call.type,
                content,
            }],
            agent_status: { status: 'idle' },
        })
        return {
            tool_result_content: content,
            next_loop: false,
            stopped: true,
        }
    }
    if (parsed_call.type === INVALID_TOOL_CALL_FORMAT) {
        const content = tool_result_json({
            ok: false,
            tool: parsed_call.type,
            content: '',
            error: t('工具调用 JSON 格式错误'),
            hint: t('检测到以 tool 开头的 JSON 字段，但格式不符合要求。请使用 {"tool_call":"工具名","args":[...]}，例如 {"tool_call":"step_update","args":["0","true"]}。不要使用 tool_update、tool_calls_update 等自定义字段。'),
            preview: parsed_call.payload,
        })
        chat.set({
            messages: [...chat.messages, {
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
    
    const repeated_result = chat.runtime.check_repeated_tool_call(parsed_call)
    if (repeated_result)
        return repeated_result
    
    const handler = get_script_handler(parsed_call.type)
    if (model.verbose)
        console.log('[debug] handler found:', !!handler, 'for type:', parsed_call.type)
    const script = handler && SCRIPT_APPROVAL_TOOLS.has(parsed_call.type)
        ? normalize_script_args(parsed_call.payload)[0] || ''
        : ''
    const script_reviewed = Boolean(script) && chat.runtime.get_session_script_execute_approval_mode(chat._active_session_id) !== 'auto'
    if (script) {
        const decision = await chat.runtime.request_script_execution_approval(parsed_call.type, script, tool_call_msg_id)
        if (chat.runtime.is_request_inactive(request_seq))
            return null
        if (decision === 'deny') {
            const content = tool_result_json({
                ok: false,
                tool: parsed_call.type,
                denied: true,
                content: '',
                error: t('用户未允许执行 DolphinDB 脚本。'),
            })
            chat.set({
                messages: [...chat.messages, {
                    msgId: `tool_denied_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: parsed_call.type,
                    content,
                    tool_call_id: parsed_call.id || undefined,
                }],
            })
            return { tool_result_content: content, next_loop: true }
        }
        chat.set({ agent_status: { status: 'tool_running' } })
    }
    // 构建 ToolContext
    const context: ToolContext = {
        eval: async (script, options) => {
            try {
                return await chat.runtime.eval_ddb(script, { ...options, ai: !script_reviewed })
            } catch (error) {
                if (is_ddb_connection_error(error))
                    chat._ddb_connection_failed = true
                throw error
            }
        },
        api_fetch: (path, options) => chat.agent.api_fetch(path, options),
        agent_id: chat._active_agent_id,
        session_id: chat._active_session_id,
        workspace_id: chat._active_session_id,
        workspace_store: chat_workspace_store,
    }
    
    // 执行工具
    let script_result: ScriptResult
    if (handler) {
        if (model.verbose)
            console.log('[debug] calling handler with payload:', parsed_call.payload)
        
        try {
            script_result = await handler(parsed_call.type, parsed_call.payload, context)
            if (model.verbose)
                console.log('[debug] handler result:', { next_loop: script_result.next_loop, has_message: !!script_result.save_message, messageType: script_result.save_message?.messageType })
        } catch (e) {
            console.error('[debug] handler threw:', e)
            const is_conn = is_ddb_connection_error(e)
            if (is_conn)
                chat._ddb_connection_failed = true
            script_result = {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: parsed_call.type,
                    content: tool_result_json({
                        ok: false,
                        tool: parsed_call.type,
                        error: is_conn
                            ? t('DolphinDB 连接已断开，执行失败。')
                            : `Tool execution error: ${e instanceof Error ? e.message : String(e)}`,
                        hint: is_conn
                            ? t('DolphinDB 连接已断开，无法继续执行脚本。请停止调用任何工具，直接向用户总结已有信息或说明连接断开需要刷新页面。')
                            : undefined,
                    }),
                },
            }
        }
    } else
        script_result = await try_execute_mcp_tool_call(chat, parsed_call, context)
    
    if (chat.runtime.is_request_inactive(request_seq))
        return null
    
    let stop_loop = false
    if (script_result.save_message) {
        const guarded = chat.runtime.apply_loop_guard_to_tool_result(parsed_call.type, script_result.save_message.content)
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
    chat.runtime.update_repeated_tool_call_state(parsed_call, script_result.save_message)
    
    const tool_result_content = script_result.save_message
        ? parse_tool_result_json(script_result.save_message.content)
            ? script_result.save_message.content
            : `[${script_result.save_message.messageType}:${parsed_call.type}] ${script_result.save_message.content}`
        : ''
        
    // 显示工具结果消息
    if (script_result.save_message) {
        const result_msg: IMessage = {
            ...script_result.save_message,
            msgId: script_result.save_message.msgId || `tr_${Date.now()}`,
            content: script_result.save_message.content,
            tool_call_id: parsed_call.id || undefined,
            _has_ddb_result: !!script_result.ddb_result,
        }
        chat.set({ messages: [...chat.messages, result_msg] })
    }
    
    // 路由 DdbObj 到 DataView
    if (script_result.ddb_result)
        chat.set({ latest_ddb_result: script_result.ddb_result })
    if (
        parsed_call.type.startsWith('step_') ||
        parsed_call.type.startsWith('vfs_') ||
        parsed_call.type.startsWith('workspace_state_')
    )
        await chat.workspace.refresh_workspace_context(chat._active_session_id).catch(error => {
            console.warn('Refresh workspace context failed:', error)
        })
    if (chat.runtime.is_request_inactive(request_seq))
        return null
    if (stop_loop)
        chat.set({ agent_status: { status: 'idle' } })
        
    return {
        tool_result_content,
        next_loop: script_result.next_loop,
        stopped: stop_loop,
    }
}


export async function handle_tool_calls (
    chat: ChatModel,
    parsed_calls: ParsedToolCall[],
    reasoning_content: string,
    request_seq: number,
    first_tool_call_msg_id: string,
    response_content: string,
    tool_call_adapter: ToolCallAdapter,
): Promise<ToolCallContinuation | null | undefined> {
    const tool_result_contents: string[] = [ ]
    const tool_results: ToolResultPayload[] = [ ]
    let should_continue_loop = false
    const natural_text = tool_call_adapter.get_natural_text(response_content).trim()
    const has_natural_text = Boolean(natural_text)
    
    if (has_natural_text)
        chat.runtime.update_assistant_content(first_tool_call_msg_id, {
            content: natural_text,
            reasoning_content: reasoning_content || undefined,
            messageType: 'text',
        })
    
    for (let index = 0;  index < parsed_calls.length;  index += 1) {
        if (chat.runtime.is_request_inactive(request_seq))
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
            chat.runtime.update_assistant_content(tool_call_msg_id, {
                content: tool_call_msg.content,
                reasoning_content: tool_call_msg.reasoning_content,
                messageType: 'tool_call',
                name: parsed_call.type,
                tool_calls: tool_call_msg.tool_calls,
            })
        else
            chat.set({ messages: [...chat.messages, tool_call_msg] })
        
        const result = await execute_tool_call(chat, parsed_call, request_seq, tool_call_msg_id)
        if (!result)
            return
        if (result.stopped)
            return null
        if (result.tool_result_content)
            tool_result_contents.push(result.tool_result_content)
        tool_call_adapter.collect_tool_result(parsed_call, result.tool_result_content, tool_results)
        if (result.next_loop)
            should_continue_loop = true
    }
    
    if (chat.runtime.is_request_inactive(request_seq))
        return
    
    const continuation = tool_call_adapter.build_continuation(tool_result_contents, tool_results)
    if (continuation && should_continue_loop)
        return continuation
    chat.set({ agent_status: { status: 'idle' } })
    return null
}
