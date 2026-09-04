import { type MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Select, Space, Spin, Tooltip, Typography } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { PlusCircleOutlined, SendOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons'
import { type DdbObj, type DdbValue } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { model, NodeType } from '@model'
import { copy } from '@utils'
import { chat_model, chat_shared_model, get_chat_model } from '@/agent/model.ts'
import type { IChatContentPart, ScriptExecuteApprovalMode } from '@/agent/model/types.ts'
import { no_active_agent_message, no_available_llm_config_message } from '@/agent/model/agent.ts'
import { format_model_label } from '@/agent/model/helpers.ts'
import { ENABLE_ATTACHMENTS } from '@/agent/model/constants.ts'
import { required_plugins_model } from '@/agent/model/required-plugins.ts'
import { parse_ddb_obj_from_content_object } from '@/agent/utils/ddb-object.ts'
import { get_agent_status_text } from '@/agent/utils/message.ts'
import { route_ddb_obj_to_dataview } from '@/agent/ai-tab/ddb-result.ts'
import { render_markdown } from '@/agent/ai-tab/markdown.ts'
import { AiMessageRow, expand_tool_call_envelopes, group_messages, ToolMessageGroup } from '@/agent/ai-tab/messages.tsx'
import { TodoList } from '@/agent/ai-tab/TodoList.tsx'
import { WorkspaceSidebar } from '@/agent/ai-tab/WorkspaceSidebar.tsx'
import { AttachmentPicker } from '@/agent/ai-tab/AttachmentPicker.tsx'
import { FilePreviewModal, type IFilePreviewTarget } from '@/agent/ai-tab/FilePreviewModal.tsx'
import { pending_input_drafts, use_session_attachments } from '@/agent/ai-tab/useSessionAttachments.ts'

import { is_pending_ai_chat_id } from '@/shell/model.ts'


const { Text } = Typography

const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_INTERVAL = 1000
const LOAD_MORE_THRESHOLD = 50


export function AiTab ({ session_id }: { session_id: string }) {
    const chat = get_chat_model(session_id)
    const { node_type, admin, logined } = model.use(['node_type', 'admin', 'logined'])
    const {
        messages, has_more_messages, loading_older_messages, buffered_messages, agent_status, current_session_id, latest_ddb_result, pending_tool_loop_control, pending_script_approval, steps,
        tool_call_limit_enabled, can_manage_agents, agent_id, selected_llm_config_id, script_execute_approval_mode,
    } = chat.use([
        'messages', 'has_more_messages', 'loading_older_messages', 'buffered_messages', 'agent_status', 'current_session_id', 'latest_ddb_result', 'pending_tool_loop_control', 'pending_script_approval', 'steps',
        'tool_call_limit_enabled', 'can_manage_agents', 'agent_id', 'selected_llm_config_id', 'script_execute_approval_mode',
    ])
    chat_shared_model.use(['selectable_llms_by_agent_id'])
    const is_agent_admin = admin || can_manage_agents
    
    const [input_value, set_input_value] = useState(() => {
        const draft = pending_input_drafts.get(session_id)
        if (draft !== undefined) {
            pending_input_drafts.delete(session_id)
            return draft
        }
        return ''
    })
    const [inited, set_inited] = useState(false)
    const [init_error, set_init_error] = useState('')
    const [creating_session, set_creating_session] = useState(false)
    const pending_session = is_pending_ai_chat_id(session_id)
    const unsupported_node = node_type === NodeType.controller || node_type === NodeType.data
    const [preview_target, set_preview_target] = useState<IFilePreviewTarget | null>(null)
    const [dragging_files, set_dragging_files] = useState(false)
    const {
        attachments, selected_attachments, attachments_loading, attachments_error, set_selected_attachments,
        ensure_session, refresh_attachments, upload_attachments, delete_attachment,
    } = use_session_attachments({ chat, session_id, current_session_id, pending_session, creating_session, input_value })
    const has_attachments = ENABLE_ATTACHMENTS && selected_attachments.length > 0
    
    useEffect(() => {
        set_preview_target(null)
    }, [session_id])
    
    const messages_ref = useRef<HTMLDivElement>(null)
    const input_ref = useRef<TextAreaRef>(null)
    const drag_depth_ref = useRef(0)
    const should_auto_scroll = useRef(true)
    const last_scroll_top = useRef(0)
    const pending_history_scroll = useRef<{ first_message_id?: string, scroll_height: number, scroll_top: number } | null>(null)
    
    // Init: ensure chat model is initialized, then select this session
    useEffect(() => {
        let cancelled = false
        
        ;(async () => {
            try {
                set_init_error('')
                if (!logined) {
                    set_inited(true)
                    return
                }
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
    }, [chat, session_id, pending_session, unsupported_node, is_agent_admin, logined])
    
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
    useLayoutEffect(() => {
        const pending = pending_history_scroll.current
        const el = messages_ref.current
        if (!pending || !el || messages[0]?.msgId === pending.first_message_id)
            return
        el.scrollTop = pending.scroll_top + el.scrollHeight - pending.scroll_height
        last_scroll_top.current = el.scrollTop
        pending_history_scroll.current = null
    }, [messages])
    useEffect(() => {
        const el = messages_ref.current
        if (el && el.scrollHeight <= el.clientHeight)
            load_older_messages()
    }, [messages, has_more_messages])
    
    // Route live DdbObj results to DataView (direct reference, no pack/unpack)
    // 使用 ref 标记本次 session 已经路由过 live obj，避免 messages 兜底再把旧数据覆盖回去
    const live_routed_ref = useRef(false)
    const last_seen_msg_id_ref = useRef<string | null>(null)
    
    // session 切换时重置状态
    useEffect(() => {
        live_routed_ref.current = false
        last_seen_msg_id_ref.current = null
        pending_history_scroll.current = null
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
    
    function load_older_messages () {
        const el = messages_ref.current
        if (
            !el ||
            current_session_id !== session_id ||
            !has_more_messages ||
            loading_older_messages ||
            pending_history_scroll.current
        )
            return
        pending_history_scroll.current = {
            first_message_id: messages[0]?.msgId,
            scroll_height: el.scrollHeight,
            scroll_top: el.scrollTop,
        }
        chat.session.load_older_messages(session_id)
            .then(loaded => {
                if (!loaded)
                    pending_history_scroll.current = null
            })
            .catch(error => {
                pending_history_scroll.current = null
                model.message?.error(error instanceof Error ? error.message : t('加载历史消息失败'))
            })
    }
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
        if (current <= LOAD_MORE_THRESHOLD)
            load_older_messages()
            
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
        if (!input_value.trim() && !has_attachments)
            return
        if (!logined) {
            model.message?.warning(t('请先登录'))
            await model.goto_login()
            return
        }
        if (unsupported_node) {
            model.message?.warning(t('集群模式下 AI 模式需要在计算节点使用。'))
            return
        }
        if (creating_session)
            return
        if (can_interrupt)
            return
        if (has_attachments && !await required_plugins_model.ensure_loaded())
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
            if (!await chat.agent.ensure_available_llm_config()) {
                model.message?.warning(no_available_llm_config_message())
                return
            }
            if (pending_session) {
                set_creating_session(true)
                await ensure_session()
            }
            if (has_attachments) {
                const content: IChatContentPart[] = [
                    ...(message ? [{ type: 'text' as const, text: message }] : [ ]),
                    ...selected_attachments.map(attachment => ({
                        type: 'attachment' as const,
                        attachmentId: attachment.attachmentId,
                    })),
                ]
                chat.runtime.send_message(message, {
                    content,
                    message_attachments: selected_attachments.map(attachment => ({
                        attachmentId: attachment.attachmentId,
                        filename: attachment.filename,
                        mimeType: attachment.mimeType,
                    })),
                })
            } else
                chat.runtime.send_message(message)
            set_input_value('')
            set_selected_attachments([ ])
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
    const selectable_llms = agent_id ? chat.agent.get_selectable_llms(agent_id) : [ ]
    const effective_llm_config_id = chat.agent.get_effective_llm_config_id(selected_llm_config_id)
    const current_llm = chat.agent.get_llm_for_tool_call_mode(effective_llm_config_id, selectable_llms)
    const llm_options = selectable_llms.map(llm => {
        const display_name = format_model_label(llm)
        return {
            value: llm.llmConfigId,
            label: llm.isAgentDefault ? `${display_name} (${t('默认')})` : display_name,
        }
    })
    const llm_config_unavailable = Boolean(agent_id && !selectable_llms.some(llm =>
        llm.capability !== 'embedding' && llm.enabled !== false && llm.statusName !== 'DELETED'
    ))
    const disable_input = creating_session || (ENABLE_ATTACHMENTS && attachments_loading) || llm_config_unavailable
    
    if (!inited)
        return <div className='ai-tab-loading'>
            <Spin />
            <Text type='secondary' style={{ marginTop: 12 }}>{t('正在连接 AI 助手...')}</Text>
        </div>
        
    if (!logined)
        return <div className='ai-tab' style={{ padding: 16 }}>
            <Alert
                type='warning'
                showIcon
                message={t('请先登录')}
                action={<Button size='small' type='primary' onClick={async () => { await model.goto_login() }}>{t('去登录')}</Button>}
            />
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
        {!pending_session && <WorkspaceSidebar
            chat={chat}
            session_id={session_id}
            current_session_id={current_session_id}
            messages={messages}
            attachments={attachments}
            attachments_loading={attachments_loading}
            attachments_error={attachments_error}
            on_refresh_attachments={() => refresh_attachments(session_id)}
            on_upload_attachments={files => upload_attachments(files, false)}
            on_delete_attachment={async attachment_id => {
                if (preview_target?.type === 'attachment' && preview_target.attachment_id === attachment_id)
                    set_preview_target(null)
                await delete_attachment(attachment_id)
            }}
            on_preview_file={set_preview_target}
        />}
        <TodoList steps={visible_steps} running={can_interrupt} />
        
        {/* Messages */}
        <div className='ai-tab-messages' ref={messages_ref} onScroll={handle_message_scroll} onClick={handle_message_click}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {loading_older_messages && <div style={{ height: 0, textAlign: 'center', zIndex: 1 }}><Spin size='small' /></div>}
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
                        return <ToolMessageGroup
                            key={`tools-${group.start_index}-${group.end_index}`}
                            chat={chat}
                            group={group}
                            is_last={is_last}
                            on_preview_attachment={(attachment_id, filename) => {
                                set_preview_target({ type: 'attachment', attachment_id, filename })
                            }}
                        />
                        
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
                        on_preview_attachment={(attachment_id, filename) => {
                            set_preview_target({ type: 'attachment', attachment_id, filename })
                        }}
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
            {llm_config_unavailable && <Alert
                className='ai-tab-config-alert'
                type='warning'
                showIcon
                message={no_available_llm_config_message()}
                action={<Button size='small' type='link' onClick={() => { chat_model.set({ settings_visible: true }) }}>
                    {t('前往配置')}
                </Button>}
            />}
            <div
                className={`ai-tab-composer ${dragging_files ? 'dragging-files' : ''}`}
                onClick={event => {
                    if (!(event.target as HTMLElement).closest('button, .ant-select'))
                        input_ref.current?.focus()
                }}
                onDragEnter={event => {
                    if (!ENABLE_ATTACHMENTS || !Array.from(event.dataTransfer.types).includes('Files'))
                        return
                    event.preventDefault()
                    drag_depth_ref.current++
                    if (!disable_input && !can_interrupt)
                        set_dragging_files(true)
                }}
                onDragOver={event => {
                    if (ENABLE_ATTACHMENTS && Array.from(event.dataTransfer.types).includes('Files'))
                        event.preventDefault()
                }}
                onDragLeave={event => {
                    if (!ENABLE_ATTACHMENTS || !Array.from(event.dataTransfer.types).includes('Files'))
                        return
                    drag_depth_ref.current--
                    if (drag_depth_ref.current <= 0)
                        set_dragging_files(false)
                }}
                onDrop={async event => {
                    if (!ENABLE_ATTACHMENTS || !Array.from(event.dataTransfer.types).includes('Files'))
                        return
                    event.preventDefault()
                    drag_depth_ref.current = 0
                    set_dragging_files(false)
                    if (disable_input || can_interrupt)
                        return
                    const files = Array.from(event.dataTransfer.files)
                    if (files.length && await required_plugins_model.ensure_loaded())
                        await upload_attachments(files)
                }}
            >
                {dragging_files && <div className='ai-attachment-drop-hint'>{t('拖拽文件到此处上传')}</div>}
                {has_attachments && <div className='ai-pending-attachments'>
                    {selected_attachments.map(attachment => <div className='ai-pending-attachment' key={attachment.attachmentId}>
                        <span className='ai-pending-attachment-name' title={attachment.filename}>{attachment.filename}</span>
                        <button
                            type='button'
                            aria-label={t('取消发送附件')}
                            onClick={() => {
                                set_selected_attachments(current => current.filter(item => item.attachmentId !== attachment.attachmentId))
                            }}
                        >×</button>
                    </div>)}
                </div>}
                <Input.TextArea
                    ref={input_ref}
                    className='ai-tab-message-input'
                    variant='borderless'
                    value={input_value}
                    onChange={e => { set_input_value(e.target.value) }}
                    onPressEnter={e => {
                        if (e.shiftKey)
                            return
                        e.preventDefault()
                        if (input_value.trim() || has_attachments)
                            handle_send()
                    }}
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    placeholder={llm_config_unavailable ? '' : t('输入消息发送给助手...')}
                    size='large'
                    disabled={disable_input}
                />
                <div className='ai-tab-composer-toolbar'>
                    <div className='ai-tab-composer-selectors'>
                        {ENABLE_ATTACHMENTS && <AttachmentPicker
                            attachments={attachments}
                            selected_attachment_ids={selected_attachments.map(attachment => attachment.attachmentId)}
                            loading={attachments_loading}
                            disabled={disable_input || can_interrupt}
                            on_select={attachment => { set_selected_attachments(current => [...current, attachment]) }}
                            on_upload={files => upload_attachments(files)}
                        />}
                        {llm_options.length > 0 && <Select
                            className='ai-tab-model-select'
                            size='small'
                            variant='borderless'
                            value={effective_llm_config_id || undefined}
                            placeholder={t('自动选择模型')}
                            popupMatchSelectWidth={280}
                            allowClear
                            disabled={!['idle', 'error'].includes(agent_status.status)}
                            onChange={async (value: string | undefined) => {
                                try {
                                    await chat.agent.select_llm_config(value || '')
                                } catch (error) {
                                    model.message?.error(error instanceof Error ? error.message : t('设置失败'))
                                }
                            }}
                            options={llm_options}
                        />}
                        <Tooltip title={t('DolphinDB 脚本执行审批')}>
                            <Select
                                className='ai-tab-approval-select'
                                size='small'
                                variant='borderless'
                                value={script_execute_approval_mode}
                                onChange={(value: ScriptExecuteApprovalMode) => { chat.runtime.set_script_execute_approval_mode(value) }}
                                options={[
                                    { value: 'approval', label: t('需要审批') },
                                    {
                                        value: 'auto',
                                        label: <Tooltip title={t('默认允许 Agent 在此会话执行脚本。AI 模型可能会出错。')}>
                                            {t('自动执行')}
                                        </Tooltip>,
                                    },
                                ]}
                            />
                        </Tooltip>
                    </div>
                    <div className='ai-tab-composer-actions'>
                        {can_interrupt && <Button
                            danger
                            icon={<StopOutlined />}
                            onClick={() => { chat.runtime.interrupt_chat() }}
                        >
                            {t('中断')}
                        </Button>}
                        <Button
                            type='primary'
                            icon={<SendOutlined />}
                            loading={creating_session}
                            disabled={(!input_value.trim() && !has_attachments) || disable_input || can_interrupt}
                            onClick={handle_send}
                        >
                            {t('发送')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        <FilePreviewModal
            chat={chat}
            session_id={session_id}
            target={preview_target}
            messages={messages}
            current_session_id={current_session_id}
            on_close={() => { set_preview_target(null) }}
        />
    </div>
}
