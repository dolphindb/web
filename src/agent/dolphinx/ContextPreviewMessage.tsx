import './ContextPreviewMessage.sass'

import { Space, Tag, Typography } from 'antd'

import { t } from '@i18n'
import { is_object_record, parse_maybe_json, to_message_text, to_preview_text } from '@/agent/utils/message.ts'


const { Text } = Typography

const role_colors: Record<string, string> = {
    system: 'purple',
    user: 'blue',
    assistant: 'green',
    tool: 'orange',
}

type PreviewMessage = Record<string, unknown>

interface PreviewToolCall {
    id: string
    name: string
    args: unknown
}


function normalize_args (value: unknown) {
    return typeof value === 'string' ? parse_maybe_json(value) ?? value : value
}


function format_item (value: unknown, max_chars = 60) {
    if (Array.isArray(value))
        return `[${value.length}]`
    if (is_object_record(value))
        return `{ ${Object.keys(value).slice(0, 4).join(', ')}${Object.keys(value).length > 4 ? ', ...' : ''} }`
    return to_preview_text(value, max_chars)
}


function get_tool_calls (message: PreviewMessage): PreviewToolCall[] {
    const raw_calls = message.toolCalls ?? message.tool_calls
    if (!Array.isArray(raw_calls))
        return [ ]
    
    return raw_calls.filter(is_object_record).map(call => {
        const fn = is_object_record(call.function) ? call.function : { }
        return {
            id: to_message_text(call.id).trim(),
            name: to_message_text(fn.name ?? call.name).trim() || t('工具'),
            args: normalize_args(fn.arguments ?? call.arguments ?? call.args),
        }
    })
}


function format_fields (value: unknown, max_fields = 4) {
    if (!is_object_record(value))
        return to_preview_text(value, 180)
    
    const entries = Object.entries(value)
    const summary = entries.slice(0, max_fields)
        .map(([key, item]) => `${key}: ${format_item(item)}`)
        .join(' · ')
    return entries.length > max_fields ? `${summary} · +${entries.length - max_fields}` : summary || '-'
}


function Fields ({ value }: { value: unknown }) {
    if (!is_object_record(value))
        return <Text className='context-preview-full-content'>{to_message_text(value) || '-'}</Text>
    
    return <div className='context-preview-fields'>
        {Object.entries(value).map(([key, item]) => {
            const text = format_item(item, 180)
            return <div key={key} className='context-preview-field'>
                <Text type='secondary' className='context-preview-field-key'>{key}</Text>
                <Text ellipsis={{ tooltip: to_message_text(item) || '-' }} className='context-preview-field-value'>{text}</Text>
            </div>
        })}
    </div>
}


export function format_preview_value (value: unknown) {
    if (Array.isArray(value))
        return String(value.length)
    if (is_object_record(value))
        return format_fields(value)
    return to_message_text(value) || '-'
}


export function ContextPreviewRole ({ role }: { role: unknown }) {
    const text = to_message_text(role).trim() || '-'
    return <Tag color={role_colors[text]} className='context-preview-role'>{text}</Tag>
}


export function ContextPreviewMessageSummary ({ message }: { message: PreviewMessage }) {
    const content = to_message_text(message.content).trim()
    const tool_calls = get_tool_calls(message)
    const call_id = to_message_text(message.toolCallId ?? message.tool_call_id).trim()
    
    return <div className='context-preview-message-summary'>
        {content && <Text ellipsis={{ tooltip: content }} className='context-preview-message-content'>{content}</Text>}
        {tool_calls.map((call, index) =>
            <div key={call.id || `${call.name}-${index}`} className='context-preview-tool-summary'>
                <Tag color='processing' className='context-preview-tool-tag'>{call.name}</Tag>
                <Text type='secondary' ellipsis={{ tooltip: format_fields(call.args, 20) }} className='context-preview-tool-summary-value'>
                    {format_fields(call.args)}
                </Text>
            </div>
        )}
        {call_id && <Text type='secondary' ellipsis={{ tooltip: call_id }}>ID: {call_id}</Text>}
        {!content && tool_calls.length === 0 && !call_id && <Text type='secondary'>-</Text>}
    </div>
}


export function ContextPreviewMessageDetail ({ message }: { message: PreviewMessage }) {
    const content = to_message_text(message.content).trim()
    const tool_calls = get_tool_calls(message)
    const metadata = Object.fromEntries(Object.entries(message).filter(
        ([key]) => !['role', 'content', 'toolCalls', 'tool_calls'].includes(key)
    ))
    
    return <div className='context-preview-message-detail'>
        {content && <div className='context-preview-content-row'>
            <Text type='secondary' className='context-preview-label'>{t('内容')}</Text>
            <Text className='context-preview-full-content'>{content}</Text>
        </div>}
        {tool_calls.map((call, index) =>
            <div
                key={call.id || `${call.name}-${index}`}
                className='context-preview-tool-detail'
            >
                <Space size={4} className='context-preview-tool-head'>
                    <Tag color='processing' className='context-preview-tool-tag'>{call.name}</Tag>
                    {call.id && <Text type='secondary' ellipsis={{ tooltip: call.id }} className='context-preview-tool-id'>ID: {call.id}</Text>}
                </Space>
                <Fields value={call.args} />
            </div>
        )}
        {Object.keys(metadata).length > 0 && <Fields value={metadata} />}
    </div>
}


export function is_context_preview_message_expandable (message: PreviewMessage) {
    const content = to_message_text(message.content).trim()
    return content.length > 160 ||
        get_tool_calls(message).length > 0 ||
        Object.keys(message).some(key => !['role', 'content'].includes(key))
}
