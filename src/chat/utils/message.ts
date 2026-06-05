import type { IMessage, MessageType } from '@/chat/model.ts'
import { parse_tool_calls as parse_text_tool_calls } from '@/chat/tool_call_parser.ts'


export interface ToolCallViewModel {
    name: string
    args: unknown
}

export interface ToolResultPayloadView {
    tool?: string
    payload: unknown
    envelope?: Record<string, unknown>
}


export const TOOL_LIKE_MESSAGE_TYPES = new Set<string>(['tool_call', 'tool_result', 'skill_result', 'tool_error', 'agent_error'])

const STRUCTURED_PREFERRED_TYPES = new Set<string>(['tool_result', 'skill_result', 'tool_error', 'agent_error'])


const MESSAGE_TYPE_LABELS: Record<string, string> = {
    system: '系统消息',
    text: '文本消息',
    tool_call: '工具调用',
    tool_result: '工具结果',
    skill_result: '技能结果',
    tool_error: '工具错误',
    agent_error: '代理错误',
}


const TOOL_NAME_LABELS: Record<string, string> = {
    coldefs: '列定义',
    testsql: '试查表',
    show: '展示数据',
    execute: '执行脚本',
    execute_file: '执行文件',
    vfs_list: '列出文件',
    vfs_create: '创建文件',
    vfs_read: '读取文件',
    vfs_search: '搜索文件',
    vfs_update: '更新文件',
    vfs_delete: '删除文件',
    step_create: '创建待办',
    step_update: '更新待办',
    step_clear: '清除待办',
    skill_read: '技能读取',
    skill_file_search: '技能文件搜索',
    skill_file_read: '技能文件读取',
    skill_file_copy: '复制技能文件',
    doc_search: '文档搜索',
    doc_read: '文档读取',
    workspace_state_read: '读取工作区状态',
    workspace_state_update: '更新工作区状态',
}


function decode_bytes (bytes: number[]): string {
    try {
        return new TextDecoder().decode(new Uint8Array(bytes))
    } catch {
        return String(bytes)
    }
}


export function parse_maybe_json (value: string): unknown | null {
    const text = value.trim()
    if (!text)
        return null
    const code_match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text)
    const json_text = code_match ? code_match[1].trim() : text
    try {
        return JSON.parse(json_text)
    } catch {
        return null
    }
}


export function parse_json_or_text (value: string): unknown {
    return parse_maybe_json(value) ?? value
}


export function format_pretty_json (value: unknown): string {
    const normalized = typeof value === 'string' ? parse_maybe_json(value) ?? value : value
    try {
        return JSON.stringify(normalized, null, 2)
    } catch {
        return String(normalized)
    }
}


export function to_message_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    
    if (value === null || value === undefined)
        return ''
    
    if (value instanceof Uint8Array)
        return decode_bytes(Array.from(value))
    
    if (value instanceof ArrayBuffer)
        return decode_bytes(Array.from(new Uint8Array(value)))
    
    if (Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255))
        return decode_bytes(value as number[])
    
    if (typeof value === 'object') {
        const maybe_buffer = value as { type?: unknown, data?: unknown }
        if (
            maybe_buffer.type === 'Buffer' &&
            Array.isArray(maybe_buffer.data) &&
            maybe_buffer.data.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)
        )
            return decode_bytes(maybe_buffer.data as number[])
        
        try {
            return JSON.stringify(value)
        } catch {
            return String(value)
        }
    }
    
    return String(value)
}


function to_content_object (value: unknown): unknown {
    if (value === null || value === undefined)
        return undefined
    
    if (typeof value === 'string')
        return parse_maybe_json(value) ?? value
    
    const text = to_message_text(value)
    const parsed = parse_maybe_json(text)
    if (parsed !== null && parsed !== undefined)
        return parsed
    
    return value
}


function parse_tool_call_from_object (value: unknown): ToolCallViewModel | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null
    
    const obj = value as Record<string, unknown>
    
    const native_function = obj.function
    if (native_function && typeof native_function === 'object' && !Array.isArray(native_function)) {
        const name = (native_function as { name?: unknown }).name
        if (typeof name === 'string' && name.trim())
            return { name: name.trim(), args: parse_json_or_text(to_message_text((native_function as { arguments?: unknown }).arguments ?? [ ])) }
    }
    
    const tool_call = obj.tool_call
    if (typeof tool_call === 'string' && tool_call.trim())
        return { name: tool_call.trim(), args: obj.args ?? obj.arguments ?? obj.content ?? [ ] }
    
    const function_name = obj.function
    if (typeof function_name === 'string' && function_name.trim())
        return { name: function_name.trim(), args: obj.args ?? obj.arguments ?? obj.content ?? [ ] }
    
    const tool_name = obj.tool
    if (typeof tool_name === 'string' && tool_name.trim())
        return { name: tool_name.trim(), args: obj.args ?? obj.arguments ?? obj.content ?? [ ] }
    
    const function_call = obj.function_call
    if (function_call && typeof function_call === 'object' && !Array.isArray(function_call)) {
        const name = (function_call as { name?: unknown }).name
        if (typeof name === 'string' && name.trim())
            return { name: name.trim(), args: (function_call as { arguments?: unknown }).arguments ?? [ ] }
    }
    
    return null
}


export function parse_tool_call (message: IMessage): ToolCallViewModel | null {
    const candidates: unknown[] = [message.content_object ? to_content_object(message.content_object) : null]
    
    const parsed_content = parse_maybe_json(message.content)
    if (parsed_content !== null && parsed_content !== undefined)
        candidates.push(parsed_content)
    
    for (const candidate of candidates) {
        const parsed = parse_tool_call_from_object(candidate)
        if (parsed)
            return parsed
    }
    
    const parsed_text_call = parse_text_tool_calls(undefined, message.content)[0]
    if (parsed_text_call)
        return { name: parsed_text_call.type, args: parsed_text_call.payload }
    
    if (message.content.trim())
        return { name: message.name || '未知工具', args: parse_maybe_json(message.content) ?? message.content }
    
    return null
}


export function get_tool_display_name (tool_name: string): string {
    const normalized = tool_name.trim()
    if (!normalized)
        return '未知工具'
    return TOOL_NAME_LABELS[normalized] ?? normalized
}


function is_structured_payload (value: unknown): value is Record<string, unknown> | unknown[] {
    return Boolean(value) && (Array.isArray(value) || typeof value === 'object')
}


export function strip_tool_result_prefix (content: string): { tool?: string, content: string } {
    const match = /^\s*\[tool_result:([a-zA-Z0-9_:-]+)\]\s*([\s\S]*)$/.exec(content)
    if (!match)
        return { content }
    return { tool: match[1], content: match[2] || '' }
}


export function parse_tool_result_payload (content: string): ToolResultPayloadView {
    const prefixed = strip_tool_result_prefix(content)
    const parsed = parse_json_or_text(prefixed.content)
    if (!is_object_record(parsed))
        return { tool: prefixed.tool, payload: parsed }
    
    const tool = to_message_text(parsed.tool || prefixed.tool).trim() || undefined
    const nested = parsed.content
    if (typeof nested === 'string') {
        const nested_parsed = parse_json_or_text(nested)
        if (is_structured_payload(nested_parsed))
            return { tool, payload: nested_parsed, envelope: parsed }
    }
    
    return { tool, payload: parsed }
}


export function get_tool_result_print (content: string): string[] {
    const result = parse_tool_result_payload(content)
    const candidates = [
        result.envelope?.print,
        is_object_record(result.payload) ? result.payload.print : undefined,
    ]
    
    for (const candidate of candidates)
        if (Array.isArray(candidate))
            return candidate.map(item => to_message_text(item)).filter(Boolean)
    
    return [ ]
}


export function get_structured_payload (message: IMessage): Record<string, unknown> | unknown[] | null {
    if (message.messageType === 'tool_result' || message.messageType === 'skill_result' || message.messageType === 'tool_error') {
        const parsed_tool_result = parse_tool_result_payload(message.content).payload
        if (is_structured_payload(parsed_tool_result))
            return parsed_tool_result as Record<string, unknown> | unknown[]
    }
    
    const co = message.content_object ? to_content_object(message.content_object) : null
    if (is_structured_payload(co))
        return co as Record<string, unknown> | unknown[]
    
    const parsed = parse_maybe_json(message.content)
    if (is_structured_payload(parsed))
        return parsed as Record<string, unknown> | unknown[]
    
    return null
}


function has_tool_call_payload (text: string): boolean {
    return parse_text_tool_calls(undefined, text).length > 0
}


function merge_ranges (ranges: Array<[number, number]>): Array<[number, number]> {
    const sorted = ranges.sort((left, right) => left[0] - right[0])
    const merged: Array<[number, number]> = [ ]
    for (const range of sorted) {
        const last = merged[merged.length - 1]
        if (last && range[0] <= last[1])
            last[1] = Math.max(last[1], range[1])
        else
            merged.push([...range])
    }
    return merged
}


function strip_tool_call_segments (text: string): string {
    const ranges: Array<[number, number]> = [ ]
    const code_regex = /```(?:json)?\s*([\s\S]*?)```/gi
    let match: RegExpExecArray | null = null
    while ((match = code_regex.exec(text)) !== null)
        if (has_tool_call_payload(match[1] || ''))
            ranges.push([match.index, code_regex.lastIndex])
            
    let start = -1
    let depth = 0
    let in_string = false
    let escape = false
    for (let index = 0;  index < text.length;  index += 1) {
        const ch = text[index]
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
            if (start < 0)
                start = index
            depth += 1
        } else if (ch === '}' && depth > 0) {
            depth -= 1
            if (depth === 0 && start >= 0) {
                const candidate = text.slice(start, index + 1)
                if (has_tool_call_payload(candidate))
                    ranges.push([start, index + 1])
                start = -1
            }
        }
    }
    
    let result = text
    for (const [from, to] of merge_ranges(ranges).reverse())
        result = `${result.slice(0, from)}\n${result.slice(to)}`
        
    return result
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}


export function get_tool_natural_text (message: IMessage, payload = get_structured_payload(message)): string {
    if (is_object_record(payload)) {
        const text = to_message_text(payload.naturalText ?? payload.text ?? '').trim()
        if (text)
            return text
    }
    return message.messageType === 'tool_call' ? strip_tool_call_segments(message.content) : ''
}


export function should_use_structured_render (
    message: IMessage,
    payload: Record<string, unknown> | unknown[] | null,
): boolean {
    const type = message.messageType ?? 'text'
    if (STRUCTURED_PREFERRED_TYPES.has(type))
        return true
    if (!payload)
        return false
    return type !== 'text'
}


export function get_structured_label (message: IMessage): string {
    const type = message.messageType ?? 'text'
    if (type === 'tool_result' || type === 'skill_result')
        return '结果'
    if (type === 'tool_error' || type === 'agent_error')
        return '详情'
    return '内容'
}


export function get_display_title (message: IMessage, tool_call: ToolCallViewModel | null): string {
    const type = message.messageType ?? 'text'
    if (type === 'tool_call')
        return tool_call ? get_tool_display_name(tool_call.name) : '工具调用'
    if (type === 'text') {
        if (message.role === 'user')
            return '用户'
        if (message.role === 'assistant')
            return '助手'
        return '文本消息'
    }
    return MESSAGE_TYPE_LABELS[type] ?? type
}


export function get_display_color (message: IMessage): string {
    const type = message.messageType ?? 'text'
    if (type === 'text') {
        if (message.role === 'user')
            return '#1677ff'
        if (message.role === 'assistant')
            return '#389e0d'
        return '#595959'
    }
    if (type === 'tool_call')
        return '#d48806'
    if (type === 'tool_result' || type === 'skill_result')
        return '#08979c'
    if (type === 'tool_error' || type === 'agent_error')
        return '#cf1322'
    return '#595959'
}


function infer_tool_name_from_content (content: string): string | undefined {
    const prefixed = strip_tool_result_prefix(content)
    if (prefixed.tool)
        return prefixed.tool
    
    const payload = parse_tool_result_payload(content)
    if (payload.tool)
        return payload.tool
    
    const trimmed = content.trim()
    if (!trimmed)
        return undefined
    
    const failed_match = /^([a-z_]+)\s+failed:/i.exec(trimmed)
    if (failed_match?.[1])
        return failed_match[1]
    
    return undefined
}


export function resolve_tool_name (
    message: IMessage,
    current_tool_call: ToolCallViewModel | null,
    previous_tool_call: ToolCallViewModel | null,
): string {
    if (current_tool_call?.name?.trim())
        return current_tool_call.name.trim()
    if (message.name?.trim())
        return message.name.trim()
    if (previous_tool_call?.name?.trim())
        return previous_tool_call.name.trim()
    return infer_tool_name_from_content(message.content) ?? ''
}


export function normalize_args (raw: unknown): unknown[] {
    if (Array.isArray(raw))
        return raw
    if (typeof raw === 'string') {
        const parsed = parse_maybe_json(raw)
        if (Array.isArray(parsed))
            return parsed
        if (parsed && typeof parsed === 'object') {
            const parsed_obj = parsed as Record<string, unknown>
            if (parsed_obj.args !== undefined)
                return normalize_args(parsed_obj.args)
            return [parsed]
        }
        return raw.trim() ? [raw] : [ ]
    }
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>
        if (Array.isArray(obj.args))
            return obj.args
        if (obj.args !== undefined)
            return normalize_args(obj.args)
        return [raw]
    }
    return [ ]
}


export function get_arg_value (args: unknown, index: number, keys: string[] = [ ]): unknown {
    const list = normalize_args(args)
    const first = list[0]
    if (is_object_record(first))
        for (const key of keys)
            if (first[key] !== undefined)
                return first[key]
    return list[index]
}


export function get_arg_text (args: unknown, index: number, keys: string[] = [ ]): string {
    return to_message_text(get_arg_value(args, index, keys)).trim()
}


export function is_object_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


export function to_preview_text (value: unknown, max_chars = 260): string {
    const text = to_message_text(value).trim()
    if (!text)
        return '-'
    if (text.length <= max_chars)
        return text
    return `${text.slice(0, max_chars).trimEnd()}...`
}


function extract_reasoning_content (item: object): string {
    const keys = ['reasoning_content', 'reasoning', 'reasoningContent']
    for (const key of keys) {
        const text = to_message_text(Reflect.get(item, key)).trim()
        if (text)
            return text
    }
    return ''
}


/** Normalize raw message data from API/WebSocket into IMessage. Returns null for system/empty messages. */
export function normalize_message (item: unknown): IMessage | null {
    if (!item || typeof item !== 'object')
        return null
    
    const role = to_message_text(Reflect.get(item, 'role')).trim()
    const raw_msg_id = to_message_text(Reflect.get(item, 'msgId')).trim()
    const raw_message_type = Reflect.get(item, 'messageType')
    const message_type = typeof raw_message_type === 'string' && raw_message_type.trim() ? raw_message_type.trim() : undefined
    const content = to_message_text(Reflect.get(item, 'content'))
    const raw_content_object = Reflect.get(item, 'content_object') ?? Reflect.get(item, 'contentObject')
    const content_object = to_content_object(raw_content_object)
    const reasoning_content = extract_reasoning_content(item)
    const name = to_message_text(Reflect.get(item, 'name')).trim()
    const has_content_object = content_object !== null && content_object !== undefined && (typeof content_object !== 'string' || content_object.trim().length > 0)
    
    if (message_type === 'system' || role === 'system')
        return null
    
    if (!content.trim() && !reasoning_content && message_type !== 'tool_call' && !has_content_object)
        return null
    
    if (!raw_msg_id)
        return null
    
    return {
        msgId: raw_msg_id,
        role: role || 'assistant',
        messageType: message_type,
        content,
        content_object,
        reasoning_content: reasoning_content || undefined,
        name: name || undefined,
    }
}


export function get_agent_status_text (status: { status: string, message?: string }): string {
    if (status.message)
        return status.message
    if (status.status === 'tool_running')
        return '助手正在调用工具...'
    if (status.status === 'error')
        return '助手执行出现错误'
    return '助手正在思考...'
}
