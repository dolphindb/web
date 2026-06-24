import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Spin, Typography, Space } from 'antd'
import { PlusCircleOutlined, SendOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons'
import { type DdbObj, type DdbValue } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { model, NodeType } from '@model'
import { copy } from '@utils'
import { bind_chat_model_session, chat_model, chat_shared_model, get_chat_model } from '@/agent/model.ts'
import { no_active_agent_message } from '@/agent/model/agent.ts'
import { parse_ddb_obj_from_content_object } from '@/agent/utils/ddb-object.ts'
import { get_agent_status_text } from '@/agent/utils/message.ts'
import { route_ddb_obj_to_dataview } from '@/agent/ai-tab/ddb-result.ts'
import { render_markdown } from '@/agent/ai-tab/markdown.ts'
import { AiMessageRow, expand_tool_call_envelopes, group_messages, ToolMessageGroup } from '@/agent/ai-tab/messages.tsx'
import { TodoList } from '@/agent/ai-tab/TodoList.tsx'
import { WorkspaceSidebar } from '@/agent/ai-tab/WorkspaceSidebar.tsx'

import { is_pending_ai_chat_id, shell } from '@/shell/model.ts'


const { Text } = Typography

const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_INTERVAL = 1000


export function AiTab ({ session_id }: { session_id: string }) {
    const chat = get_chat_model(session_id)
    const { node_type, admin } = model.use(['node_type', 'admin'])
    const {
        messages, buffered_messages, agent_status, current_session_id, latest_ddb_result, pending_tool_loop_control, pending_script_approval, steps,
        tool_call_limit_enabled, can_manage_agents,
    } = chat.use([
        'messages', 'buffered_messages', 'agent_status', 'current_session_id', 'latest_ddb_result', 'pending_tool_loop_control', 'pending_script_approval', 'steps',
        'tool_call_limit_enabled', 'can_manage_agents',
    ])
    const is_agent_admin = admin || can_manage_agents
    
    const [input_value, set_input_value] = useState('')
    const [inited, set_inited] = useState(false)
    const [init_error, set_init_error] = useState('')
    const [creating_session, set_creating_session] = useState(false)
    const pending_session = is_pending_ai_chat_id(session_id)
    const unsupported_node = node_type === NodeType.controller || node_type === NodeType.data
    
    const messages_ref = useRef<HTMLDivElement>(null)
    const should_auto_scroll = useRef(true)
    const last_scroll_top = useRef(0)
    
    // Init: ensure chat model is initialized, then select this session
    useEffect(() => {
        let cancelled = false
        
        ;(async () => {
            try {
                set_init_error('')
                if (unsupported_node) {
                    set_inited(true)
                    return
                }
                if (!chat.agent_id)
                    await chat.agent.init()
                else if (chat.agents.length === 0)
                    await chat.agent.load_agents()
                    
                if (!chat.agent_id) {
                    if (is_agent_admin) {
                        // 管理员无可用 agent 时仍允许进入，由空态引导创建
                        set_inited(true)
                        return
                    }
                    set_init_error(chat.last_agent_load_error || no_active_agent_message())
                    set_inited(true)
                    return
                }
                
                // 确保可选 LLM 已加载
                if (chat.agent_id && !chat_shared_model.selectable_llms_by_agent_id[chat.agent_id]?.length)
                    await chat.llm.load_selectable_llms()
                    
                if (cancelled)
                    return
                    
                if (!pending_session && current_session_id !== session_id)
                    await chat.session.select_session(session_id)
                    
                set_inited(true)
            } catch (e) {
                console.error('AiTab init failed:', e)
                set_init_error(e instanceof Error ? e.message : String(e))
                set_inited(true)
            }
        })()
        
        return () => { cancelled = true }
    }, [chat, session_id, pending_session, unsupported_node, is_agent_admin])
    
    // When tab switches back, re-select the correct session
    useEffect(() => {
        if (inited && !unsupported_node && !pending_session && current_session_id !== session_id)
            chat.session.select_session(session_id)
                .then(() => { set_init_error('') })
                .catch(error => {
                    console.error(error)
                    set_init_error(error instanceof Error ? error.message : String(error))
                })
    }, [chat, inited, pending_session, session_id, unsupported_node])
    
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
    
    async function handle_message_click (event: MouseEvent<HTMLDivElement>) {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.ai-code-copy')
        if (!button)
            return
        event.stopPropagation()
        try {
            await copy(button.closest('.ai-code-block')?.querySelector('code')?.textContent || '')
            clearTimeout(Number(button.dataset.copyTimer))
            button.textContent = t('已复制')
            button.dataset.copyTimer = String(setTimeout(() => { button.textContent = t('复制') }, 1500))
        } catch (error) {
            console.error('[ai] copy code failed:', error)
        }
    }
    
    async function handle_send () {
        if (!input_value.trim())
            return
        if (unsupported_node) {
            model.message?.warning(t('集群模式下 AI 模式需要在计算节点使用。'))
            return
        }
        if (creating_session)
            return
        if (!await chat.agent.ensure_active_agent()) {
            if (is_agent_admin)
                chat_model.set({ settings_visible: true })
            else
                model.message?.warning(chat.last_agent_load_error || no_active_agent_message())
            return
        }
        if (!chat.runtime.is_ddb_connected()) {
            model.message?.warning(t('DolphinDB 连接已断开，无法发送消息'))
            return
        }
        const message = input_value.trim()
        try {
            if (pending_session) {
                set_creating_session(true)
                const tab_name = shell.tabs.find(tab => tab.chat_id === session_id)?.name
                const session = await chat.session.create_session(tab_name || t('新会话'))
                bind_chat_model_session(session_id, session.sessionId)
                shell.bind_ai_tab_session(session_id, session.sessionId, session.title || tab_name || t('新会话'))
            }
            chat.runtime.send_message(message)
            set_input_value('')
            should_auto_scroll.current = true
        } catch (error) {
            model.message?.error(error instanceof Error ? error.message : t('创建 AI 会话失败'))
        } finally {
            set_creating_session(false)
        }
    }
    
    // Only show messages for our session
    const visible_messages = current_session_id === session_id ? expand_tool_call_envelopes(messages) : [ ]
    const visible_buffered = current_session_id === session_id ? buffered_messages : [ ]
    const visible_status = current_session_id === session_id ? agent_status : { status: 'idle' as const }
    const visible_loop_control = current_session_id === session_id ? pending_tool_loop_control : null
    const visible_script_approval = current_session_id === session_id ? pending_script_approval : null
    const visible_steps = current_session_id === session_id ? steps : [ ]
    const visible_groups = group_messages(visible_messages, visible_script_approval?.messageId)
    const status_text = get_agent_status_text(visible_status)
    const has_virtual = visible_status.status !== 'idle' || visible_buffered.length > 0 || Boolean(visible_loop_control)
    const can_interrupt = current_session_id === session_id && !['idle', 'error'].includes(visible_status.status)
    
    if (!inited)
        return <div className='ai-tab-loading'>
            <Spin />
            <Text type='secondary' style={{ marginTop: 12 }}>{t('正在连接 AI 助手...')}</Text>
        </div>
        
    if (unsupported_node)
        return <div className='ai-tab' style={{ position: 'relative' }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(1px)',
                padding: 24,
            }}>
                <div style={{
                    width: 420,
                    padding: 28,
                    borderRadius: 8,
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{t('请在计算节点使用 AI 模式')}</div>
                    <Text type='secondary'>
                        {t('集群模式下，控制节点和数据节点暂不支持 AI 模式，请切换到计算节点后使用。')}
                    </Text>
                </div>
            </div>
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
    
    if (!chat.agent_id && is_agent_admin)
        return <div className='ai-tab' style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }}>
                    <SettingOutlined />
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{t('暂无可用 Agent')}</div>
                <Text type='secondary' style={{ display: 'block', marginBottom: 20 }}>
                    {t('当前账号没有可用的 Agent，请创建或激活一个 Agent 后使用。')}
                </Text>
                <Button type='primary' icon={<PlusCircleOutlined />} onClick={() => { chat_model.set({ settings_visible: true }) }}>
                    {t('前往 Agent 管理')}
                </Button>
            </div>
        </div>
        
    return <div className='ai-tab'>
        {!pending_session && <WorkspaceSidebar chat={chat} session_id={session_id} current_session_id={current_session_id} messages={messages} />}
        <TodoList steps={visible_steps} />
        
        {/* Messages */}
        <div className='ai-tab-messages' ref={messages_ref} onScroll={handle_message_scroll} onClick={handle_message_click}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visible_groups.map((group, idx) => {
                    const is_last = idx === visible_groups.length - 1
                    if (group.type === 'natural_text')
                        return <div
                            key={`natural-${group.index}`}
                            className='ai-message-row ai-message-row-assistant'
                            style={{ borderBottom: is_last ? 'none' : '1px solid #f0f0f0' }}
                        >
                            <div className='ai-message-content' dangerouslySetInnerHTML={{ __html: render_markdown(group.text) }} />
                        </div>
                        
                    if (group.type === 'tools')
                        return <ToolMessageGroup key={`tools-${group.start_index}-${group.end_index}`} chat={chat} group={group} is_last={is_last} />
                        
                    const msg = group.msg
                    const prev = group.index > 0 ? visible_messages[group.index - 1] : null
                    const next = group.index < visible_messages.length - 1 ? visible_messages[group.index + 1] : null
                    return <AiMessageRow
                        key={msg.msgId}
                        msg={msg}
                        prev={prev}
                        next={next}
                        is_last={is_last}
                        agent_status={visible_status.status}
                        chat={chat}
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
                        <Button danger size='small' icon={<StopOutlined />} onClick={() => { chat.runtime.interrupt_chat() }}>
                            {t('停止')}
                        </Button>
                        <Button type='primary' size='small' onClick={() => { chat.runtime.continue_tool_loop() }}>
                            {t('继续')}
                        </Button>
                        {tool_call_limit_enabled && <Button size='small' onClick={() => { chat.runtime.ignore_tool_call_limit() }}>
                            {t('继续且不再询问')}
                        </Button>}
                    </Space>}
                </div>}
            </div>
        </div>
        
        {/* Input */}
        <div className='ai-tab-input'>
            <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                    className='ai-tab-message-input'
                    value={input_value}
                    onChange={e => { set_input_value(e.target.value) }}
                    onPressEnter={e => {
                        if (e.shiftKey)
                            return
                        e.preventDefault()
                        if (input_value.trim())
                            handle_send()
                    }}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    placeholder={t('输入消息发送给助手...')}
                    size='large'
                    disabled={creating_session}
                />
                {can_interrupt && <Button
                    danger
                    size='large'
                    icon={<StopOutlined />}
                    onClick={() => { chat.runtime.interrupt_chat() }}
                >
                    {t('中断')}
                </Button>}
                <Button
                    type='primary'
                    size='large'
                    icon={<SendOutlined />}
                    loading={creating_session}
                    disabled={!input_value.trim() || creating_session}
                    onClick={handle_send}
                >
                    {t('发送')}
                </Button>
            </Space.Compact>
        </div>
    </div>
}
