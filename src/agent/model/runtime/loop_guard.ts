import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import {
    append_tool_result_hint,
    is_structured_tool_result_helpful,
    parse_tool_result_json,
    tool_result_json,
} from '@/agent/scripts/helpers.ts'
import type { ChatCompletionOptions } from '@/agent/tool_call_adapters.ts'
import type { ParsedToolCall } from '@/agent/tool_call_parser.ts'
import type { IMessage, ToolExecutionResult } from '@/agent/model/types.ts'
import {
    DDB_RESULT_TOOLS,
    MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT,
    MAX_REPEATED_TOOL_CALLS,
    MAX_TOOL_TURNS,
    REPEAT_GUARD_EXEMPT_TOOLS,
    TOOL_CALL_LIMIT_ENABLED_KEY,
} from '@/agent/model/constants.ts'
import { stable_json_stringify } from '@/agent/model/helpers.ts'


export function reset_loop_guard (chat: ChatModel) {
    chat._last_tool_call_signature = ''
    chat._last_tool_call_failed = false
    chat._consecutive_failed_tool_call_count = 0
    chat._consecutive_ddb_failures = 0
    chat._tool_turn_limit = MAX_TOOL_TURNS
}


export function get_tool_call_signature (parsed_call: ParsedToolCall) {
    const tool_name = parsed_call.type.trim()
    return `${tool_name}\u001f${stable_json_stringify(parsed_call.payload)}`
}


export function build_repeated_tool_call_result (chat: ChatModel, parsed_call: ParsedToolCall, count: number, stop_loop: boolean): ToolExecutionResult {
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
    chat.set({
        messages: [...chat.messages, {
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


export function check_repeated_tool_call (chat: ChatModel, parsed_call: ParsedToolCall): ToolExecutionResult | null {
    if (REPEAT_GUARD_EXEMPT_TOOLS.has(parsed_call.type.trim()))
        return null
    
    const signature = get_tool_call_signature(parsed_call)
    if (
        signature !== chat._last_tool_call_signature ||
        !chat._last_tool_call_failed ||
        chat._consecutive_failed_tool_call_count < MAX_REPEATED_TOOL_CALLS
    )
        return null
    
    const count = chat._consecutive_failed_tool_call_count + 1
    chat._consecutive_failed_tool_call_count = count
    return build_repeated_tool_call_result(
        chat,
        parsed_call,
        count,
        count > MAX_REPEATED_TOOL_CALLS + 1
    )
}


export function is_failed_tool_result (tool_name: string, message?: IMessage) {
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


export function update_repeated_tool_call_state (chat: ChatModel, parsed_call: ParsedToolCall, message?: IMessage) {
    const signature = get_tool_call_signature(parsed_call)
    const failed = is_failed_tool_result(parsed_call.type, message)
    chat._consecutive_failed_tool_call_count = signature === chat._last_tool_call_signature && failed
        ? chat._consecutive_failed_tool_call_count + 1
        : failed ? 1 : 0
    chat._last_tool_call_signature = signature
    chat._last_tool_call_failed = failed
}


export function apply_loop_guard_to_tool_result (chat: ChatModel, tool_name: string, content: string): { content: string, stop: boolean } {
    if (!DDB_RESULT_TOOLS.has(tool_name))
        return { content, stop: false }
    
    const helpful = is_structured_tool_result_helpful(content)
    if (helpful) {
        chat._consecutive_ddb_failures = 0
        return { content, stop: false }
    }
    
    chat._consecutive_ddb_failures += 1
    if (chat._consecutive_ddb_failures < MAX_CONSECUTIVE_DDB_FAILURES_BEFORE_HINT)
        return { content, stop: false }
    
    const hint = t('{{count}} 次连续 DolphinDB 工具结果都没有提供有效信息。不要继续猜测 API；请查询官方文档、运行更小的验证脚本，或基于已知结果说明不确定性。', { count: chat._consecutive_ddb_failures })
    return {
        content: append_tool_result_hint(content, hint),
        stop: false,
    }
}


export function request_tool_loop_decision (chat: ChatModel, message: string, options: ChatCompletionOptions, tool_turn: number, request_seq: number) {
    chat.set({
        pending_tool_loop_control: {
            id: `tool_loop_${Date.now()}`,
            sessionId: chat._active_session_id,
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
}


export function set_tool_call_limit_enabled (chat: ChatModel, enabled: boolean) {
    localStorage.setItem(TOOL_CALL_LIMIT_ENABLED_KEY, String(enabled))
    chat.set({ tool_call_limit_enabled: enabled })
}


export function ignore_tool_call_limit (chat: ChatModel) {
    set_tool_call_limit_enabled(chat, false)
    continue_tool_loop(chat)
}


export function continue_tool_loop (chat: ChatModel) {
    const pending = chat.pending_tool_loop_control
    if (!pending)
        return
    if (pending.sessionId !== chat.current_session_id) {
        chat.set({ pending_tool_loop_control: null })
        return
    }
    
    chat._tool_turn_limit += MAX_TOOL_TURNS
    chat.set({
        pending_tool_loop_control: null,
        agent_status: { status: 'thinking' },
    })
    chat.runtime.do_chat_completions(pending.message, pending.options, pending.toolTurn, pending.requestSeq).catch(error => {
        console.error('Continue tool loop failed:', error)
        chat.set({ agent_status: { status: 'error', message: error instanceof Error ? error.message : String(error) } })
    })
}
