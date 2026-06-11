import { useEffect, useRef, useState } from 'react'

import { Collapse, Typography } from 'antd'
import { BulbOutlined, CodeOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { AgentStatus, ChatModel, IMessage, IToolCall } from '@/chat/model.ts'
import { ToolMessageRenderer } from '@/chat/ToolMessageRenderer.tsx'
import {
    TOOL_LIKE_MESSAGE_TYPES,
    parse_tool_call,
    get_display_title,
    get_display_color,
    get_structured_payload,
    resolve_tool_name,
    get_tool_display_name,
    get_tool_natural_text as get_tool_message_natural_text,
    to_preview_text,
    to_message_text,
    normalize_args,
    get_arg_text,
    get_tool_result_print,
    parse_tool_result_payload,
} from '@/chat/utils/message.ts'
import { parse_ddb_obj_from_content_object } from '@/chat/utils/ddb-object.ts'

import { render_markdown } from './markdown.ts'


const { Text } = Typography

const WORKSPACE_FILE_MUTATION_TOOLS = new Set(['vfs_create', 'vfs_update', 'vfs_delete', 'skill_file_copy'])

export type MessageGroup =
    | { type: 'message', msg: IMessage, index: number }
    | { type: 'natural_text', text: string, index: number }
    | { type: 'tools', messages: IMessage[], start_index: number, end_index: number }


function is_tool_message (msg: IMessage) {
    return TOOL_LIKE_MESSAGE_TYPES.has(msg.messageType ?? '') && msg.messageType !== 'agent_error'
}


function is_tool_outcome_message (msg: IMessage) {
    return msg.messageType === 'tool_result' || msg.messageType === 'skill_result' || msg.messageType === 'tool_error'
}


function has_tool_result_print (msg: IMessage) {
    return is_tool_outcome_message(msg) && get_tool_result_print(msg.content).length > 0
}


function has_matching_tool_result_after (messages: IMessage[], index: number) {
    const msg = messages[index]
    if (msg.messageType !== 'tool_call')
        return false
    
    const call_ids = new Set((msg.tool_calls || [ ]).map(tool_call => tool_call.id).filter(Boolean))
    for (let i = index + 1;  i < messages.length;  i += 1) {
        const candidate = messages[i]
        if (!is_tool_message(candidate))
            break
        if (!is_tool_outcome_message(candidate))
            continue
        if (!candidate.tool_call_id || !call_ids.size || call_ids.has(candidate.tool_call_id))
            return true
    }
    return false
}


function has_matching_print_result_after (messages: IMessage[], index: number) {
    const msg = messages[index]
    if (msg.messageType !== 'tool_call')
        return false
    
    const call_ids = new Set((msg.tool_calls || [ ]).map(tool_call => tool_call.id).filter(Boolean))
    for (let i = index + 1;  i < messages.length;  i += 1) {
        const candidate = messages[i]
        if (!is_tool_message(candidate))
            break
        if (!has_tool_result_print(candidate))
            continue
        if (!candidate.tool_call_id || !call_ids.size || call_ids.has(candidate.tool_call_id))
            return true
    }
    return false
}


function parse_json_value (value: string): unknown {
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}


function to_envelope_content_text (value: unknown): string {
    if (typeof value === 'string')
        return value
    if (Array.isArray(value))
        return value.map(to_envelope_content_text).filter(Boolean).join('\n')
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        const text = obj.text ?? obj.content ?? obj.output_text ?? obj.outputText
        if (typeof text === 'string')
            return text
    }
    if (value === null || value === undefined)
        return ''
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}


function parse_tool_call_envelope (msg: IMessage): { content: string, tool_calls: IToolCall[] } | null {
    if ((msg.messageType !== 'text' && msg.messageType !== 'tool_call') || msg.role !== 'assistant')
        return null
    
    const trimmed = msg.content.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}'))
        return null
    
    try {
        const parsed = JSON.parse(trimmed)
        const raw_calls = parsed?.toolCalls ?? parsed?.tool_calls
        if (!Array.isArray(raw_calls) || raw_calls.length === 0)
            return null
        return {
            content: to_envelope_content_text(parsed.content),
            tool_calls: raw_calls.filter((tool_call: IToolCall) => tool_call?.function?.name),
        }
    } catch {
        return null
    }
}


function to_tool_call_message (msg: IMessage, tool_call: IToolCall, index: number): IMessage {
    const name = tool_call.function?.name || ''
    const args = parse_json_value(tool_call.function?.arguments || '')
    return {
        ...msg,
        msgId: `${msg.msgId}_tool_${index}`,
        role: 'assistant',
        messageType: 'tool_call',
        name,
        content: JSON.stringify({
            tool_call: name,
            args,
            ...(tool_call.id ? { id: tool_call.id } : { }),
        }),
        tool_calls: [tool_call],
    }
}


export function expand_tool_call_envelopes (messages: IMessage[]): IMessage[] {
    return messages.flatMap(msg => {
        const envelope = parse_tool_call_envelope(msg)
        if (!envelope)
            return [msg]
        
        return [
            ...envelope.content.trim()
                ? [{
                    ...msg,
                    msgId: `${msg.msgId}_content`,
                    messageType: 'text',
                    content: envelope.content,
                    tool_calls: undefined,
                }]
                : [ ],
            ...envelope.tool_calls.map((tool_call, index) => to_tool_call_message(msg, tool_call, index)),
        ]
    })
}


export function group_messages (messages: IMessage[], pending_script_approval_msg_id?: string) {
    const groups: MessageGroup[] = [ ]
    let index = 0
    
    while (index < messages.length) {
        const msg = messages[index]
        if (!is_tool_message(msg) || index === messages.length - 1) {
            groups.push({ type: 'message', msg, index })
            index += 1
            continue
        }
        
        const start_index = index
        const tool_messages: IMessage[] = [ ]
        while (index < messages.length && is_tool_message(messages[index])) {
            if (
                messages[index].messageType === 'tool_call' &&
                messages[index].msgId === pending_script_approval_msg_id
            )
                break
            
            if (
                messages[index].messageType === 'tool_call' &&
                (!has_matching_tool_result_after(messages, index) || has_matching_print_result_after(messages, index))
            )
                break
            
            if (has_tool_result_print(messages[index]))
                break
            
            const natural_text = get_tool_message_natural_text(messages[index])
            if (natural_text) {
                if (tool_messages.length)
                    break
                groups.push({ type: 'natural_text', text: natural_text, index })
            }
            
            tool_messages.push(messages[index])
            index += 1
        }
        if (!tool_messages.length) {
            groups.push({ type: 'message', msg, index })
            index += 1
            continue
        }
        groups.push({ type: 'tools', messages: tool_messages, start_index, end_index: index - 1 })
    }
    
    return groups
}


function get_tool_pairs (messages: IMessage[]) {
    const pairs: Array<{ call: IMessage | null, result: IMessage | null, messages: IMessage[] }> = [ ]
    
    for (const msg of messages) {
        if (msg.messageType === 'tool_call') {
            pairs.push({ call: msg, result: null, messages: [msg] })
            continue
        }
        
        const matched = msg.tool_call_id
            ? pairs.find(pair => !pair.result && pair.call?.tool_calls?.some(tool_call => tool_call.id === msg.tool_call_id))
            : null
        const fallback = pairs.find(pair => !pair.result)
        const pair = matched || fallback
        if (pair) {
            pair.result = msg
            pair.messages.push(msg)
        } else
            pairs.push({ call: null, result: msg, messages: [msg] })
    }
    
    return pairs
}


function file_basename (path: string) {
    return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || ''
}


export function format_file_size (size: number) {
    if (size < 1024)
        return `${size} B`
    if (size < 1024 * 1024)
        return `${Math.round(size / 1024)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}


function get_workspace_file_name_from_args (tool_name: string, args: unknown) {
    const list = normalize_args(args)
    const first = list[0]
    const normalized = tool_name.trim()
    if (first && typeof first === 'object' && !Array.isArray(first)) {
        const obj = first as Record<string, unknown>
        const keys = normalized === 'skill_file_copy'
            ? ['target_path', 'targetPath', 'name', 'path']
            : ['name', 'path', 'target_path', 'targetPath']
        for (const key of keys) {
            const value = to_message_text(obj[key]).trim()
            if (value)
                return value
        }
    }
    
    if (normalized === 'skill_file_copy')
        return to_message_text(list[2]).trim() || file_basename(to_message_text(list[1]).trim())
    return get_tool_file_name(args)
}


function get_workspace_file_name_from_result (tool_name: string, content: string) {
    const result = parse_tool_result_payload(content)
    const payload = result.payload
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const obj = payload as Record<string, unknown>
        const keys = tool_name === 'skill_file_copy'
            ? ['targetPath', 'target_path', 'name', 'path']
            : ['name', 'path', 'targetPath', 'target_path']
        for (const key of keys) {
            const value = to_message_text(obj[key]).trim()
            if (value)
                return value
        }
    }
    
    if (tool_name === 'vfs_delete') {
        const match = /File deleted successfully:\s*(.+)$/i.exec(content.trim())
        if (match?.[1])
            return match[1].trim()
    }
    return ''
}


function find_related_tool_call (messages: IMessage[], result_index: number) {
    const result = messages[result_index]
    const call_id = result.tool_call_id
    for (let index = result_index - 1;  index >= 0 && index >= result_index - 12;  index--) {
        const candidate = messages[index]
        if (candidate.messageType !== 'tool_call')
            continue
        if (!call_id || candidate.tool_calls?.some(tool_call => tool_call.id === call_id))
            return candidate
    }
    return null
}


export function get_workspace_file_change (messages: IMessage[], index: number) {
    const message = messages[index]
    if (message.messageType !== 'tool_result')
        return null
    
    const tool_name = (message.name || parse_tool_result_payload(message.content).tool || '').trim()
    if (!WORKSPACE_FILE_MUTATION_TOOLS.has(tool_name))
        return null
    
    const call = find_related_tool_call(messages, index)
    const parsed_call = call ? parse_tool_call(call) : null
    const path = parsed_call
        ? get_workspace_file_name_from_args(parsed_call.name, parsed_call.args)
        : get_workspace_file_name_from_result(tool_name, message.content)
    
    return { tool_name, path }
}


function get_tool_file_name (args: unknown) {
    const list = normalize_args(args)
    const first = list[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
        const obj = first as Record<string, unknown>
        return to_message_text(obj.name ?? obj.path ?? obj.target_path ?? obj.targetPath).trim()
    }
    return to_message_text(first).trim()
}


function get_tool_preview_arg (tool_name: string, args: unknown) {
    const normalized = tool_name.trim().toLowerCase()
    if (normalized === 'execute' || normalized === 'show')
        return get_arg_text(args, 0, ['script'])
    if (normalized === 'coldefs' || normalized === 'testsql')
        return get_arg_text(args, 0, ['table'])
    if (normalized === 'doc_search')
        return get_arg_text(args, 0, ['query'])
    if (normalized === 'doc_read')
        return get_arg_text(args, 0, ['url'])
    if (normalized.startsWith('skill_'))
        return get_arg_text(args, 0, ['skill_id', 'skillId'])
    return get_tool_file_name(args) || get_arg_text(args, 0, ['name', 'path'])
}


function is_edit_tool (name: string) {
    return ['vfs_create', 'vfs_update', 'vfs_delete', 'skill_file_copy'].includes(name)
}


function summarize_tool_group (pairs: ReturnType<typeof get_tool_pairs>) {
    const calls = pairs.map(pair => pair.call).filter((msg): msg is IMessage => Boolean(msg))
    const edited_files = new Set<string>()
    
    for (const call of calls) {
        const parsed = parse_tool_call(call)
        if (!parsed || !is_edit_tool(parsed.name))
            continue
        const file_name = get_tool_file_name(parsed.args)
        if (file_name)
            edited_files.add(file_name)
    }
    
    const command_text = t('已运行 {{count}} 条命令', { count: calls.length })
    if (edited_files.size > 0)
        return `${t('已编辑 {{count}} 个文件', { count: edited_files.size })}，${command_text}`
    return command_text
}


function get_tool_command_preview (pair: ReturnType<typeof get_tool_pairs>[number]) {
    const parsed = pair.call ? parse_tool_call(pair.call) : null
    const name = parsed?.name || pair.result?.name || t('未知工具')
    const label = get_tool_display_name(name)
    const arg_text = parsed ? get_tool_preview_arg(parsed.name, parsed.args) : ''
    return `${label}${arg_text ? ` ${to_preview_text(arg_text, 80)}` : ''}`
}


export function ToolMessageGroup ({ chat, group, is_last }: { chat: ChatModel, group: Extract<MessageGroup, { type: 'tools' }>, is_last: boolean }) {
    const pairs = get_tool_pairs(group.messages)
 
    return <div
        className='ai-tool-group-row'
        style={{
            padding: '10px 0 10px 0',
            borderBottom: is_last ? 'none' : '1px solid #f0f0f0',
        }}
    >
        <Collapse
            ghost
            size='small'
            className='ai-tool-group'
            items={[{
                key: `tool-group-${group.start_index}`,
                label: <span className='ai-tool-group-label'>
                    <CodeOutlined />
                    <Text type='secondary' className='ai-tool-group-label-text' style={{ fontSize: 13 }}>{summarize_tool_group(pairs)}</Text>
                </span>,
                children: <div className='ai-tool-group-overview'>
                    {pairs.map((pair, index) =>
                        <Collapse
                            key={`${pair.call?.msgId || pair.result?.msgId || index}-detail`}
                            ghost
                            size='small'
                            className='ai-tool-detail-collapse'
                            items={[{
                                key: 'detail',
                                label: <Text type='secondary' className='ai-tool-detail-label' style={{ fontSize: 13 }}>
                                    {pair.result?.messageType === 'tool_error' ? t('执行失败') : t('已运行')} {get_tool_command_preview(pair)}
                                </Text>,
                                children: <div className='ai-tool-detail'>
                                    {pair.messages.map((msg, msg_index) => {
                                        const prev = msg_index > 0 ? pair.messages[msg_index - 1] : pair.call
                                        return <AiMessageRow
                                            key={msg.msgId}
                                            msg={msg}
                                            prev={prev === msg ? null : prev}
                                            next={msg_index < pair.messages.length - 1 ? pair.messages[msg_index + 1] : null}
                                            is_last={msg_index === pair.messages.length - 1}
                                            agent_status='idle'
                                            chat={chat}
                                        />
                                    })}
                                </div>,
                            }]}
                        />
                    )}
                </div>,
            }]}
        />
    </div>
}


export function AiMessageRow ({
    chat,
    msg,
    prev,
    next,
    is_last,
    agent_status,
}: {
    chat: ChatModel
    msg: IMessage
    prev: IMessage | null
    next: IMessage | null
    is_last: boolean
    agent_status: AgentStatus
}) {
    const current_tool_call = msg.messageType === 'tool_call' ? parse_tool_call(msg) : null
    const previous_tool_call = prev?.messageType === 'tool_call' ? parse_tool_call(prev) : null
    
    const hide_title_for_merged_outcome =
        (msg.messageType === 'tool_result' || msg.messageType === 'skill_result' || msg.messageType === 'tool_error') &&
        prev?.messageType === 'tool_call'
        
    const hide_divider_for_tool_call =
        msg.messageType === 'tool_call' &&
        (next?.messageType === 'tool_result' || next?.messageType === 'skill_result' || next?.messageType === 'tool_error')
        
    const row_padding_top = hide_title_for_merged_outcome ? 4 : 12
    const row_padding_bottom = hide_divider_for_tool_call ? 4 : 12
    
    const tool_name = resolve_tool_name(msg, current_tool_call, previous_tool_call)
    const is_tool_like = TOOL_LIKE_MESSAGE_TYPES.has(msg.messageType ?? '')
    const show_title = is_tool_like && !hide_title_for_merged_outcome
    const title = show_title ? get_display_title(msg, current_tool_call) : ''
    const title_color = show_title ? get_display_color(msg) : ''
    const structured_payload = get_structured_payload(msg)
    const collapse_key = msg.msgId
    const reasoning_key = `reasoning-${collapse_key}`
    const has_reasoning = Boolean(msg.reasoning_content)
    const has_content = Boolean(msg.content.trim())
    const is_reasoning_streaming = has_reasoning && is_last && agent_status === 'thinking' && !has_content
    const [reasoning_active_keys, set_reasoning_active_keys] = useState<string[]>([ ])
    const last_reasoning_msg_id = useRef(msg.msgId)
    const closed_after_content = useRef(false)
    
    useEffect(() => {
        if (last_reasoning_msg_id.current !== msg.msgId) {
            last_reasoning_msg_id.current = msg.msgId
            closed_after_content.current = false
            set_reasoning_active_keys([ ])
        }
        
        if (!has_reasoning) {
            closed_after_content.current = false
            set_reasoning_active_keys([ ])
            return
        }
        
        if (is_reasoning_streaming) {
            set_reasoning_active_keys([reasoning_key])
            return
        }
        
        if (!has_content) {
            set_reasoning_active_keys([ ])
            return
        }
        
        if (!closed_after_content.current) {
            closed_after_content.current = true
            set_reasoning_active_keys([ ])
        }
    }, [msg.msgId, has_reasoning, has_content, is_reasoning_streaming, reasoning_key])
    
    // DdbObj 不在这里内联展示，而是路由到 DataView
    // 但保留引用检测，以便在消息中显示一个提示
    const has_ddb_obj = msg._has_ddb_result || Boolean(parse_ddb_obj_from_content_object(msg.content_object))
    
    return <div
        className={`ai-message-row ${!is_tool_like && msg.role === 'user' ? 'ai-message-row-user' : 'ai-message-row-assistant'}`}
        style={{
            padding: `${row_padding_top}px 0 ${row_padding_bottom}px 0`,
            borderBottom: hide_divider_for_tool_call || is_last ? 'none' : '1px solid #f0f0f0',
        }}
    >
        {show_title && <div style={{ marginBottom: 8, marginLeft: 12 }}>
            <Text strong style={{ color: title_color, fontSize: 13 }}>
                {title}
            </Text>
        </div>}
        
        {msg.reasoning_content && <div className='ai-reasoning'>
            <Collapse
                ghost
                size='small'
                expandIconPosition='start'
                activeKey={reasoning_active_keys}
                onChange={keys => {
                    set_reasoning_active_keys(
                        Array.isArray(keys)
                            ? keys.map(String)
                            : [String(keys)]
                    )
                }}
                style={{ marginTop: 0 }}
                items={[{
                    key: reasoning_key,
                    label: <span><BulbOutlined /> {is_reasoning_streaming ? t('思考中') : t('思考过程')}</span>,
                    children: <div className='ai-reasoning-content'>
                        <div dangerouslySetInnerHTML={{ __html: render_markdown(msg.reasoning_content) }} />
                    </div>,
                }]}
            />
        </div>}
        
        {is_tool_like
            ? <ToolMessageRenderer
                message={msg}
                tool_name={tool_name}
                current_tool_call={current_tool_call}
                previous_tool_call={previous_tool_call}
                structured_payload={structured_payload}
                collapse_key_suffix={collapse_key}
                chat={chat}
            />
            : msg.content.trim() && (
                msg.role === 'user'
                    ? <div className='ai-message-bubble'>
                        <div className='ai-message-content' dangerouslySetInnerHTML={{ __html: render_markdown(msg.content) }} />
                    </div>
                    : <div className='ai-message-content' dangerouslySetInnerHTML={{ __html: render_markdown(msg.content) }} />
            )
        }
        
        {has_ddb_obj && <div style={{ marginLeft: 12, marginTop: 4 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                📊 {t('输出结果已显示在下方面板')}
            </Text>
        </div>}
    </div>
}
