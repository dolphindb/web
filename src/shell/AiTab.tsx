import { useEffect, useRef, useState } from 'react'

import { Button, Input, Spin, Typography, Space, Collapse } from 'antd'
import { SendOutlined, BulbOutlined } from '@ant-design/icons'
import type { DdbObj, DdbValue } from 'dolphindb/browser.js'

import { marked } from 'marked'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/chat/model.ts'
import type { IMessage } from '@/chat/model.ts'
import { ToolMessageRenderer } from '@/chat/ToolMessageRenderer.tsx'
import {
    TOOL_LIKE_MESSAGE_TYPES,
    parse_tool_call,
    get_display_title,
    get_display_color,
    get_structured_payload,
    resolve_tool_name,
    get_agent_status_text,
} from '@/chat/utils/message.ts'
import { parse_ddb_obj_from_content_object } from '@/chat/utils/ddb-object.ts'

import { shell } from './model.ts'


const { Text } = Typography

const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_INTERVAL = 1000


marked.setOptions({ breaks: true, gfm: true })

function render_markdown (content: string): string {
    try {
        return marked.parse(content) as string
    } catch {
        return content
    }
}


/** 将 AI 对话中的 DdbObj 结果输出到 shell 的 DataView */
function route_ddb_obj_to_dataview (obj: DdbObj<DdbValue>) {
    shell.set({
        result: { type: 'object', data: obj },
    })
}


export function AiTab ({ session_id }: { session_id: string }) {
    const {
        messages, buffered_messages, agent_status, current_session_id,
    } = chat_model.use([
        'messages', 'buffered_messages', 'agent_status', 'current_session_id',
    ])
    
    const [input_value, set_input_value] = useState('')
    const [inited, set_inited] = useState(false)
    
    const messages_ref = useRef<HTMLDivElement>(null)
    const should_auto_scroll = useRef(true)
    const last_scroll_top = useRef(0)
    
    // Init: ensure chat model is initialized, then select this session
    useEffect(() => {
        let cancelled = false
        
        ;(async () => {
            try {
                if (!chat_model.agent_id)
                    await chat_model.init()
                else if (chat_model.agents.length === 0)
                    await chat_model.load_agents()
                
                // 确保可选 LLM 已加载
                if (chat_model.agent_id && chat_model.selectable_llms.length === 0)
                    await chat_model.load_selectable_llms()
                
                if (cancelled)
                    return
                
                if (current_session_id !== session_id)
                    await chat_model.select_session(session_id)
                
                set_inited(true)
            } catch (e) {
                console.error('AiTab init failed:', e)
            }
        })()
        
        return () => { cancelled = true }
    }, [session_id])
    
    // When tab switches back, re-select the correct session
    useEffect(() => {
        if (inited && current_session_id !== session_id)
            chat_model.select_session(session_id).catch(console.error)
    }, [inited, session_id])
    
    // Auto-scroll periodic check
    useEffect(() => {
        const timer = setInterval(() => {
            const el = messages_ref.current
            if (!el || !should_auto_scroll.current)
                return
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            last_scroll_top.current = el.scrollTop
        }, AUTO_SCROLL_INTERVAL)
        return () => { clearInterval(timer) }
    }, [ ])
    
    // Scroll on new messages
    useEffect(() => {
        if (!should_auto_scroll.current)
            return
        const el = messages_ref.current
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            last_scroll_top.current = el.scrollTop
        }
    }, [messages, buffered_messages, agent_status.status])
    
    // Route new DdbObj results to DataView
    useEffect(() => {
        if (!messages.length)
            return
        // 找到最后一条包含 content_object 的消息
        for (let i = messages.length - 1;  i >= 0;  i--) {
            const msg = messages[i]
            if (msg.content_object) {
                const obj = parse_ddb_obj_from_content_object(msg.content_object) as DdbObj<DdbValue> | null
                if (obj) {
                    route_ddb_obj_to_dataview(obj)
                    break
                }
            }
        }
    }, [messages])
    
    function handle_message_scroll () {
        const el = messages_ref.current
        if (!el)
            return
        const current = el.scrollTop
        const prev = last_scroll_top.current
        const distance_to_bottom = el.scrollHeight - current - el.clientHeight
        
        if (current < prev && distance_to_bottom > AUTO_SCROLL_THRESHOLD)
            should_auto_scroll.current = false
        else if (current > prev && distance_to_bottom <= AUTO_SCROLL_THRESHOLD)
            should_auto_scroll.current = true
        
        last_scroll_top.current = current
    }
    
    function handle_send () {
        if (!input_value.trim())
            return
        chat_model.send_message(input_value)
        set_input_value('')
        should_auto_scroll.current = true
    }
    
    // Only show messages for our session
    const visible_messages = current_session_id === session_id ? messages : [ ]
    const visible_buffered = current_session_id === session_id ? buffered_messages : [ ]
    const visible_status = current_session_id === session_id ? agent_status : { status: 'idle' as const }
    const status_text = get_agent_status_text(visible_status)
    const has_virtual = visible_status.status !== 'idle' || visible_buffered.length > 0
    
    if (!inited)
        return <div className='ai-tab-loading'>
            <Spin />
            <Text type='secondary' style={{ marginTop: 12 }}>{t('正在连接 AI 助手...')}</Text>
        </div>
    
    return <div className='ai-tab'>
        {/* Messages */}
        <div className='ai-tab-messages' ref={messages_ref} onScroll={handle_message_scroll}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visible_messages.map((msg, idx) => {
                    const prev = idx > 0 ? visible_messages[idx - 1] : null
                    const next = idx < visible_messages.length - 1 ? visible_messages[idx + 1] : null
                    return <AiMessageRow key={msg.msgId} msg={msg} prev={prev} next={next} is_last={idx === visible_messages.length - 1} />
                })}
                
                {has_virtual && <div style={{ padding: '10px 0 6px 12px' }}>
                    {visible_buffered.map((content, idx) =>
                        <div key={`buf-${idx}`} style={{ marginBottom: 4, paddingRight: 12 }}>
                            <Text type='secondary' style={{ fontSize: 12, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {t('发送中')}: {content}
                            </Text>
                        </div>
                    )}
                    {visible_status.status !== 'idle' && <div className='chat-status-indicator'>
                        <div
                            className='status-dot'
                            style={{
                                backgroundColor: visible_status.status === 'error' ? '#ff4d4f' : '#52c41a',
                                animation: visible_status.status !== 'error' ? 'pulse 1.5s infinite' : 'none',
                            }}
                        />
                        <Text type='secondary' style={{ fontSize: 12 }}>{status_text}</Text>
                    </div>}
                </div>}
            </div>
        </div>
        
        {/* Input */}
        <div className='ai-tab-input'>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    value={input_value}
                    onChange={e => { set_input_value(e.target.value) }}
                    onPressEnter={() => {
                        if (input_value.trim())
                            handle_send()
                    }}
                    placeholder={t('输入消息发送给助手...')}
                    size='large'
                />
                <Button
                    type='primary'
                    size='large'
                    icon={<SendOutlined />}
                    disabled={!input_value.trim()}
                    onClick={handle_send}
                >
                    {t('发送')}
                </Button>
            </Space.Compact>
        </div>
    </div>
}


function AiMessageRow ({ msg, prev, next, is_last }: { msg: IMessage, prev: IMessage | null, next: IMessage | null, is_last: boolean }) {
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
    
    const title = get_display_title(msg, current_tool_call)
    const title_color = get_display_color(msg)
    
    const tool_name = resolve_tool_name(msg, current_tool_call, previous_tool_call)
    const is_tool_like = TOOL_LIKE_MESSAGE_TYPES.has(msg.messageType ?? '')
    const structured_payload = get_structured_payload(msg)
    const collapse_key = msg.msgId
    
    // DdbObj 不在这里内联展示，而是路由到 DataView
    // 但保留引用检测，以便在消息中显示一个提示
    const has_ddb_obj = Boolean(parse_ddb_obj_from_content_object(msg.content_object))
    
    return <div
        style={{
            padding: `${row_padding_top}px 0 ${row_padding_bottom}px 0`,
            borderBottom: hide_divider_for_tool_call || is_last ? 'none' : '1px solid #f0f0f0',
        }}
    >
        {!hide_title_for_merged_outcome && <div style={{ marginBottom: 8, marginLeft: 12 }}>
            <Text strong style={{ color: title_color, fontSize: 13 }}>
                {title}
            </Text>
        </div>}
        
        {msg.reasoning_content && <div>
            <Collapse
                ghost
                size='small'
                expandIconPosition='start'
                style={{ marginTop: 0 }}
                items={[{
                    key: `reasoning-${collapse_key}`,
                    label: <span><BulbOutlined /> {t('思考过程')}</span>,
                    children: <div style={{ wordBreak: 'break-word' }}>
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
            />
            : msg.content.trim() && <div style={{ wordBreak: 'break-word', marginLeft: 12 }}>
                <div dangerouslySetInnerHTML={{ __html: render_markdown(msg.content) }} />
            </div>
        }
        
        {has_ddb_obj && <div style={{ marginLeft: 12, marginTop: 4 }}>
            <Text type='secondary' style={{ fontSize: 12 }}>
                📊 {t('输出结果已显示在下方面板')}
            </Text>
        </div>}
    </div>
}
