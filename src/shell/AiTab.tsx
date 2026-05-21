import { useEffect, useRef, useState } from 'react'

import { Alert, Button, Checkbox, Input, Spin, Typography, Space, Collapse } from 'antd'
import { SendOutlined, BulbOutlined, StopOutlined } from '@ant-design/icons'
import { type DdbObj, type DdbValue, DdbForm } from 'dolphindb/browser.js'

import { marked } from 'marked'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/chat/model.ts'
import type { AgentStatus, IMessage } from '@/chat/model.ts'
import type { IWorkspaceStep } from '@/chat/workspace.ts'
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


const DISPLAYABLE_FORMS: Set<number> = new Set([
    DdbForm.chart, DdbForm.dict, DdbForm.matrix,
    DdbForm.set, DdbForm.table, DdbForm.vector, DdbForm.tensor,
])


/** 将 AI 对话中的 DdbObj 结果输出到 shell 的 DataView */
function route_ddb_obj_to_dataview (obj: DdbObj<DdbValue>) {
    if (!DISPLAYABLE_FORMS.has(obj.form))
        return
    shell.set({
        result: { type: 'object', data: obj },
    })
}


export function AiTab ({ session_id }: { session_id: string }) {
    const {
        messages, buffered_messages, agent_status, current_session_id, latest_ddb_result, sessions, pending_tool_loop_control, steps,
    } = chat_model.use([
        'messages', 'buffered_messages', 'agent_status', 'current_session_id', 'latest_ddb_result', 'sessions', 'pending_tool_loop_control', 'steps',
    ])
    
    const [input_value, set_input_value] = useState('')
    const [inited, set_inited] = useState(false)
    const [init_error, set_init_error] = useState('')
    
    const messages_ref = useRef<HTMLDivElement>(null)
    const should_auto_scroll = useRef(true)
    const last_scroll_top = useRef(0)
    
    // Init: ensure chat model is initialized, then select this session
    useEffect(() => {
        let cancelled = false
        
        ;(async () => {
            try {
                set_init_error('')
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
                set_init_error(e instanceof Error ? e.message : String(e))
                set_inited(true)
            }
        })()
        
        return () => { cancelled = true }
    }, [session_id])
    
    // When tab switches back, re-select the correct session
    useEffect(() => {
        if (inited && current_session_id !== session_id)
            chat_model.select_session(session_id)
                .then(() => { set_init_error('') })
                .catch(error => {
                    console.error(error)
                    set_init_error(error instanceof Error ? error.message : String(error))
                })
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
    
    // Route live DdbObj results to DataView (direct reference, no pack/unpack)
    // 使用 ref 标记本次 session 已经路由过 live obj，避免 messages 兜底再把旧数据覆盖回去
    const live_routed_ref = useRef(false)
    const last_seen_msg_id_ref = useRef<string | null>(null)
    
    // session 切换时重置状态
    useEffect(() => {
        live_routed_ref.current = false
        last_seen_msg_id_ref.current = null
    }, [session_id])
    
    useEffect(() => {
        if (!latest_ddb_result)
            return
        const obj = latest_ddb_result as DdbObj<DdbValue>
        if (obj && typeof obj.form === 'number') {
            route_ddb_obj_to_dataview(obj)
            live_routed_ref.current = true
        }
    }, [latest_ddb_result])
    
    // Fallback: route DdbObj from content_object (for history/reload)
    // 如果本次会话已经有 live 结果了，就不要用历史 content_object 覆盖它
    // 对于新来的消息（执行 show/execute 工具产生），若其自身无 content_object 则不回退到更早消息
    useEffect(() => {
        if (!messages.length)
            return
        const last = messages[messages.length - 1]
        const last_id = last?.msgId ?? null
        const prev_seen = last_seen_msg_id_ref.current
        const is_initial_load = prev_seen === null
        const is_new_message = !is_initial_load && last_id !== prev_seen
        last_seen_msg_id_ref.current = last_id
        
        // 已有 live 路由时，绝不从历史 content_object 覆盖
        if (live_routed_ref.current)
            return
        
        if (is_initial_load) {
            // 首次加载：倒序查找最近的有效 content_object
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
            return
        }
        
        // 后续新增消息：仅检查最后一条（避免 pack 失败时回退到旧消息）
        if (!is_new_message || !last?.content_object)
            return
        const obj = parse_ddb_obj_from_content_object(last.content_object) as DdbObj<DdbValue> | null
        if (obj)
            route_ddb_obj_to_dataview(obj)
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
    const visible_loop_control = current_session_id === session_id ? pending_tool_loop_control : null
    const visible_steps = current_session_id === session_id ? steps : [ ]
    const status_text = get_agent_status_text(visible_status)
    const has_virtual = visible_status.status !== 'idle' || visible_buffered.length > 0 || Boolean(visible_loop_control)
    const session = sessions.find(item => item.sessionId === session_id)
    const archived = session?.status === 1 || session?.statusName === 'ARCHIVED'
    const can_interrupt = current_session_id === session_id && !['idle', 'error'].includes(visible_status.status)
    
    if (!inited)
        return <div className='ai-tab-loading'>
            <Spin />
            <Text type='secondary' style={{ marginTop: 12 }}>{t('正在连接 AI 助手...')}</Text>
        </div>
    
    if (init_error)
        return <div className='ai-tab' style={{ padding: 16 }}>
            <Alert
                type='error'
                showIcon
                message={t('AI 会话加载失败')}
                description={init_error === 'Not Found' ? t('会话不存在或已被删除，请新建 AI 会话。') : init_error}
            />
        </div>
    
    return <div className='ai-tab'>
        {/* Messages */}
        <div className='ai-tab-messages' ref={messages_ref} onScroll={handle_message_scroll}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <TodoList steps={visible_steps} />
                
                {visible_messages.map((msg, idx) => {
                    const prev = idx > 0 ? visible_messages[idx - 1] : null
                    const next = idx < visible_messages.length - 1 ? visible_messages[idx + 1] : null
                    return <AiMessageRow
                        key={msg.msgId}
                        msg={msg}
                        prev={prev}
                        next={next}
                        is_last={idx === visible_messages.length - 1}
                        agent_status={visible_status.status}
                    />
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
                    {visible_loop_control && <Space style={{ marginTop: 8 }} wrap>
                        <Button danger size='small' icon={<StopOutlined />} onClick={() => { chat_model.interrupt_chat() }}>
                            {t('停止')}
                        </Button>
                        <Button type='primary' size='small' onClick={() => { chat_model.continue_tool_loop() }}>
                            {t('继续')}
                        </Button>
                    </Space>}
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
                        if (input_value.trim() && !archived)
                            handle_send()
                    }}
                    placeholder={archived ? t('归档会话不可继续发送消息') : t('输入消息发送给助手...')}
                    size='large'
                    disabled={archived}
                />
                {can_interrupt && <Button
                    danger
                    size='large'
                    icon={<StopOutlined />}
                    onClick={() => { chat_model.interrupt_chat() }}
                >
                    {t('中断')}
                </Button>}
                <Button
                    type='primary'
                    size='large'
                    icon={<SendOutlined />}
                    disabled={!input_value.trim() || archived}
                    onClick={handle_send}
                >
                    {t('发送')}
                </Button>
            </Space.Compact>
        </div>
    </div>
}


function TodoList ({ steps }: { steps: IWorkspaceStep[] }) {
    const active_steps = steps.filter(step => step.active)
    if (!active_steps.length)
        return null
    
    return <div className='ai-todo-list'>
        <Text strong style={{ fontSize: 13 }}>{t('待办')}</Text>
        <div className='ai-todo-items'>
            {active_steps.map(step =>
                <div key={step.id} className='ai-todo-item'>
                    <Checkbox checked={step.checked} disabled />
                    <Text delete={step.checked} type={step.checked ? 'secondary' : undefined}>
                        {step.step_index}. {step.content}
                    </Text>
                </div>
            )}
        </div>
    </div>
}


function AiMessageRow ({
    msg,
    prev,
    next,
    is_last,
    agent_status,
}: {
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
    
    const title = get_display_title(msg, current_tool_call)
    const title_color = get_display_color(msg)
    
    const tool_name = resolve_tool_name(msg, current_tool_call, previous_tool_call)
    const is_tool_like = TOOL_LIKE_MESSAGE_TYPES.has(msg.messageType ?? '')
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
