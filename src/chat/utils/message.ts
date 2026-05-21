import type { IMessage, MessageType } from '@/chat/model.ts'


export interface ToolCallViewModel {
    name: string
    args: unknown
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
    vfs_update: '更新文件',
    vfs_delete: '删除文件',
    step_create: '创建待办',
    step_update: '更新待办',
    step_clear: '清除待办',
    skill_read: '技能读取',
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
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
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


export function get_structured_payload (message: IMessage): Record<string, unknown> | unknown[] | null {
    const co = message.content_object ? to_content_object(message.content_object) : null
    if (is_structured_payload(co))
        return co as Record<string, unknown> | unknown[]
    
    const parsed = parse_maybe_json(message.content)
    if (is_structured_payload(parsed))
        return parsed as Record<string, unknown> | unknown[]
    
    return null
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
        return raw.trim() ? [raw] : [ ]
    }
    if (raw && typeof raw === 'object')
        return [raw]
    return [ ]
}


export function get_arg_text (args: unknown, index: number): string {
    const list = normalize_args(args)
    return to_message_text(list[index]).trim()
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
