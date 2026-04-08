import './index.sass'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Key, ReactNode } from 'react'

import {
    Button, Input, Collapse, Empty, Tooltip, Popconfirm, Checkbox, Spin,
    Typography, Space, Cascader, Tree,
} from 'antd'
import {
    PlusOutlined, SendOutlined, SettingOutlined, DeleteOutlined,
    MessageOutlined, RobotOutlined, BulbOutlined, EditOutlined,
    AppstoreOutlined, FolderOutlined, FileTextOutlined,
} from '@ant-design/icons'
import type { DdbObj, DdbValue } from 'dolphindb/browser.js'

import { marked } from 'marked'

import { t } from '@i18n'
import { model } from '@model'
import { Obj } from '@/obj.tsx'

import { chat_model } from './model.ts'
import type { IMessage, IWorkspace, IVfsFile } from './model.ts'
import { SettingsModal } from './SettingsModal.tsx'
import { ToolMessageRenderer } from './ToolMessageRenderer.tsx'
import {
    TOOL_LIKE_MESSAGE_TYPES,
    parse_tool_call,
    get_display_title,
    get_display_color,
    get_structured_payload,
    resolve_tool_name,
    get_agent_status_text,
} from './utils/message.ts'
import { parse_ddb_obj_from_content_object } from './utils/ddb-object.ts'


const { Text, Title } = Typography

const AUTO_SCROLL_THRESHOLD = 50
const AUTO_SCROLL_INTERVAL = 1000

type ActiveTab = 'chat' | 'state' | 'files'

type CascaderOption = {
    value: string
    label: string
    children?: CascaderOption[]
}

type TreeNode = {
    title: string
    key: string
    isLeaf?: boolean
    children?: TreeNode[]
    icon?: ReactNode
}


marked.setOptions({
    breaks: true,
    gfm: true,
})


function render_markdown (content: string): string {
    try {
        return marked.parse(content) as string
    } catch {
        return content
    }
}


function build_file_tree (files: IVfsFile[]): TreeNode[] {
    const root: TreeNode[] = [ ]
    const map = new Map<string, TreeNode>()
    
    for (const file of files) {
        const parts = file.path.split('/')
        let current_path = ''
        let current_level = root
        
        for (let i = 0;  i < parts.length;  i++) {
            const part = parts[i]
            const is_last = i === parts.length - 1
            current_path = current_path ? `${current_path}/${part}` : part
            
            if (!map.has(current_path)) {
                const node: TreeNode = {
                    title: part,
                    key: current_path,
                    isLeaf: is_last,
                    icon: is_last ? <FileTextOutlined /> : <FolderOutlined />,
                    children: is_last ? undefined : [ ],
                }
                map.set(current_path, node)
                current_level.push(node)
            }
            
            if (!is_last)
                current_level = map.get(current_path)?.children ?? [ ]
        }
    }
    
    return root
}


export function Chat () {
    const { logined } = model.use(['logined'])
    const {
        chats, current_chat_id, messages, buffered_messages,
        loading, steps, agent_status,
    } = chat_model.use([
        'chats', 'current_chat_id', 'messages', 'buffered_messages',
        'loading', 'steps', 'agent_status',
    ])
    
    const [input_value, set_input_value] = useState('')
    const [active_tab, set_active_tab] = useState<ActiveTab>('chat')
    
    // Header state
    const [provider_options, set_provider_options] = useState<CascaderOption[]>([ ])
    const [is_editing_title, set_is_editing_title] = useState(false)
    const [editing_title, set_editing_title] = useState('')
    const [is_saving_title, set_is_saving_title] = useState(false)
    
    // Workspace state
    const [workspace, set_workspace] = useState<IWorkspace | null>(null)
    
    // Files state
    const [files, set_files] = useState<IVfsFile[]>([ ])
    const [selected_file_path, set_selected_file_path] = useState<string | null>(null)
    const [file_content, set_file_content] = useState('')
    const [is_file_loading, set_is_file_loading] = useState(false)
    
    // Auto-scroll refs
    const messages_ref = useRef<HTMLDivElement>(null)
    const should_auto_scroll = useRef(true)
    const last_scroll_top = useRef(0)
    
    const current_chat = useMemo(() =>
        chats.find(c => c.chatId === current_chat_id) ?? null
    , [chats, current_chat_id])
    
    const conversation_title = current_chat?.title?.trim() || t('新会话')
    
    const selected_model = useMemo(() => {
        if (!current_chat?.providerId || !current_chat?.modelId)
            return [ ]
        return [current_chat.providerId, current_chat.modelId]
    }, [current_chat?.providerId, current_chat?.modelId])
    
    // Init
    useEffect(() => {
        if (logined)
            chat_model.init()
        
        return () => {
            chat_model.disconnect_ws()
        }
    }, [logined])
    
    // Load provider options
    useEffect(() => {
        chat_model.load_provider_options().then(set_provider_options).catch(console.error)
    }, [ ])
    
    // Reset title editing on chat change
    useEffect(() => {
        set_is_editing_title(false)
        set_is_saving_title(false)
        set_active_tab('chat')
        set_files([ ])
        set_selected_file_path(null)
        set_file_content('')
        set_workspace(null)
    }, [current_chat_id])
    
    // Sync editing title
    useEffect(() => {
        if (!is_editing_title)
            set_editing_title(conversation_title)
    }, [conversation_title, is_editing_title])
    
    // Load workspace
    useEffect(() => {
        if (!current_chat?.workspaceId)
            return
        chat_model.load_workspace(current_chat.workspaceId).then(set_workspace).catch(console.error)
    }, [current_chat?.workspaceId])
    
    // Refresh workspace when switching to state tab
    useEffect(() => {
        if (active_tab !== 'state' || !current_chat?.workspaceId)
            return
        chat_model.load_workspace(current_chat.workspaceId).then(set_workspace).catch(console.error)
    }, [active_tab, current_chat?.workspaceId])
    
    // Periodic file refresh
    useEffect(() => {
        if (!current_chat?.workspaceId)
            return
        
        const fetch_files = () => {
            chat_model.load_files(current_chat.workspaceId).then(set_files).catch(console.error)
        }
        fetch_files()
        const timer = setInterval(fetch_files, 3000)
        return () => clearInterval(timer)
    }, [current_chat?.workspaceId])
    
    // Auto-scroll: periodic check
    useEffect(() => {
        if (!current_chat_id || active_tab !== 'chat')
            return
        
        const timer = setInterval(() => {
            const el = messages_ref.current
            if (!el || !should_auto_scroll.current)
                return
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            last_scroll_top.current = el.scrollTop
        }, AUTO_SCROLL_INTERVAL)
        
        return () => clearInterval(timer)
    }, [current_chat_id, active_tab])
    
    // Scroll to bottom on new messages
    useEffect(() => {
        if (!should_auto_scroll.current)
            return
        const el = messages_ref.current
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            last_scroll_top.current = el.scrollTop
        }
    }, [messages, buffered_messages, agent_status.status, agent_status.message])
    
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
        if (!input_value.trim() || !current_chat_id)
            return
        chat_model.send_message(input_value)
        set_input_value('')
        should_auto_scroll.current = true
    }
    
    async function handle_model_change (value: (string | number)[]) {
        if (value?.length === 2 && current_chat_id)
            try {
                await chat_model.update_chat_model(current_chat_id, String(value[0]), String(value[1]))
            } catch (e) {
                console.error('Failed to update model:', e)
            }
    }
    
    async function handle_commit_title () {
        if (is_saving_title || !current_chat_id)
            return
        
        const next = editing_title.trim()
        if (!next || next === conversation_title.trim()) {
            set_is_editing_title(false)
            set_editing_title(conversation_title)
            return
        }
        
        set_is_saving_title(true)
        try {
            await chat_model.update_chat_title(current_chat_id, next)
            set_is_editing_title(false)
        } catch (e) {
            console.error('Failed to update title:', e)
        } finally {
            set_is_saving_title(false)
        }
    }
    
    async function handle_select_file (selected_keys: Key[]) {
        const key = selected_keys[0] as string
        if (!key || !current_chat?.workspaceId)
            return
        const file = files.find(f => f.path === key)
        if (!file)
            return
        
        set_selected_file_path(key)
        set_is_file_loading(true)
        try {
            const content = await chat_model.load_file_content(current_chat.workspaceId, key)
            set_file_content(content)
        } finally {
            set_is_file_loading(false)
        }
    }
    
    const status_text = get_agent_status_text(agent_status)
    const has_virtual_conversation = agent_status.status !== 'idle' || buffered_messages.length > 0
    
    return <div className='chat-page'>
        {/* Left panel: chat list */}
        <div className='chat-list-panel'>
            <div className='chat-list-header'>
                <span className='title'>{t('智能助手')}</span>
                <div className='header-actions'>
                    <Tooltip title={t('新建对话')}>
                        <Button
                            type='text'
                            icon={<PlusOutlined />}
                            onClick={async () => {
                                await chat_model.create_chat()
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={t('设置')}>
                        <Button
                            type='text'
                            icon={<SettingOutlined />}
                            onClick={() => {
                                chat_model.set({ settings_visible: true })
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            
            <div className='chat-list-body'>
                {loading
                    ? <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin />
                    </div>
                    : chats.length === 0
                        ? <div className='empty-chats'>
                            <Empty description={t('暂无对话')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                        : chats.map(chat =>
                            <div
                                key={chat.chatId}
                                className={`chat-item ${chat.chatId === current_chat_id ? 'active' : ''}`}
                                onClick={() => {
                                    chat_model.select_chat(chat.chatId)
                                }}
                            >
                                <MessageOutlined style={{ marginRight: 8, fontSize: 14, flexShrink: 0 }} />
                                <span className='chat-item-title'>
                                    {chat.title || t('新建对话')}
                                </span>
                                <span className='chat-item-actions'>
                                    <Popconfirm
                                        title={t('确定删除此对话？')}
                                        onConfirm={async (e) => {
                                            e?.stopPropagation()
                                            await chat_model.delete_chat(chat.chatId)
                                        }}
                                        onCancel={(e) => {
                                            e?.stopPropagation()
                                        }}
                                    >
                                        <Button
                                            type='text'
                                            size='small'
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                        />
                                    </Popconfirm>
                                </span>
                            </div>
                        )
                }
            </div>
        </div>
        
        {/* Right panel */}
        <div className='chat-main-panel'>
            {!current_chat_id
                ? <div className='chat-no-selection'>
                    <RobotOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
                    <span>{t('请先新建对话')}</span>
                </div>
                : <>
                    {/* Header */}
                    <header className='chat-header'>
                        <div className='chat-header-left'>
                            {is_editing_title
                                ? <Input
                                    value={editing_title}
                                    maxLength={40}
                                    autoFocus
                                    disabled={is_saving_title}
                                    onChange={e => { set_editing_title(e.target.value) }}
                                    onPressEnter={() => { handle_commit_title() }}
                                    onBlur={() => { handle_commit_title() }}
                                    onKeyDown={e => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault()
                                            set_is_editing_title(false)
                                            set_editing_title(conversation_title)
                                        }
                                    }}
                                    style={{ width: 'min(480px, 100%)' }}
                                />
                                : <>
                                    <Title
                                        level={4}
                                        style={{
                                            margin: 0, maxWidth: '100%', overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}
                                        title={conversation_title}
                                    >
                                        {conversation_title}
                                    </Title>
                                    <Button
                                        type='text'
                                        size='small'
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            set_editing_title(conversation_title)
                                            set_is_editing_title(true)
                                        }}
                                        style={{ flexShrink: 0 }}
                                    />
                                </>
                            }
                        </div>
                        <div className='chat-header-right'>
                            {workspace?.name && <Text type='secondary' style={{ fontSize: 13 }}>
                                {t('工作区')}: <Text strong>{workspace.name}</Text>
                            </Text>}
                            <Cascader
                                options={provider_options}
                                value={selected_model}
                                onChange={val => { handle_model_change(val) }}
                                placeholder={t('选择模型')}
                                style={{ width: 260, flexShrink: 0 }}
                            />
                        </div>
                    </header>
                    
                    {/* Body: NavRail + Content */}
                    <div className='chat-body'>
                        {/* Nav Rail */}
                        <div className='chat-nav-rail'>
                            <Tooltip title={t('对话界面')} placement='right'>
                                <Button
                                    type={active_tab === 'chat' ? 'primary' : 'text'}
                                    icon={<MessageOutlined />}
                                    onClick={() => { set_active_tab('chat') }}
                                />
                            </Tooltip>
                            <Tooltip title={t('工作区状态')} placement='right'>
                                <Button
                                    type={active_tab === 'state' ? 'primary' : 'text'}
                                    icon={<AppstoreOutlined />}
                                    onClick={() => { set_active_tab('state') }}
                                />
                            </Tooltip>
                            <Tooltip title={t('文件列表')} placement='right'>
                                <Button
                                    type={active_tab === 'files' ? 'primary' : 'text'}
                                    icon={<FolderOutlined />}
                                    onClick={() => { set_active_tab('files') }}
                                />
                            </Tooltip>
                        </div>
                        
                        {/* Tab content */}
                        <div className='chat-tab-content'>
                            {active_tab === 'chat' && <div className='chat-tab-chat'>
                                {/* Steps */}
                                {steps.length > 0 && <div className='chat-steps-panel'>
                                    <Text strong style={{ fontSize: 13 }}>{t('步骤')}</Text>
                                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8, gap: 4 }}>
                                        {steps.map(step =>
                                            <Checkbox key={step.id} checked={step.checked}>
                                                {step.content}
                                            </Checkbox>
                                        )}
                                    </div>
                                </div>}
                                
                                {/* Messages */}
                                <div className='chat-messages-container' ref={messages_ref} onScroll={handle_message_scroll}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {messages.map((msg, idx) => {
                                            const prev = idx > 0 ? messages[idx - 1] : null
                                            const next = idx < messages.length - 1 ? messages[idx + 1] : null
                                            return <MessageRow key={msg.msgId} msg={msg} prev={prev} next={next} is_last={idx === messages.length - 1} />
                                        })}
                                        
                                        {has_virtual_conversation && <div style={{ padding: '10px 0 6px 12px' }}>
                                            {buffered_messages.map((content, idx) =>
                                                <div key={`buf-${idx}`} style={{ marginBottom: 4, paddingRight: 12 }}>
                                                    <Text type='secondary' style={{ fontSize: 12, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                        {t('发送中')}: {content}
                                                    </Text>
                                                </div>
                                            )}
                                            {agent_status.status !== 'idle' && <div className='chat-status-indicator'>
                                                <div
                                                    className='status-dot'
                                                    style={{
                                                        backgroundColor: agent_status.status === 'error' ? '#ff4d4f' : '#52c41a',
                                                        animation: agent_status.status !== 'error' ? 'pulse 1.5s infinite' : 'none',
                                                    }}
                                                />
                                                <Text type='secondary' style={{ fontSize: 12 }}>
                                                    {status_text}
                                                </Text>
                                            </div>}
                                        </div>}
                                    </div>
                                </div>
                                
                                {/* Input */}
                                <div className='chat-input-area'>
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Input
                                            value={input_value}
                                            onChange={e => { set_input_value(e.target.value) }}
                                            onPressEnter={() => {
                                                if (input_value.trim())
                                                    handle_send()
                                            }}
                                            placeholder={current_chat_id ? t('输入消息发送给助手...') : t('请先创建会话')}
                                            disabled={!current_chat_id}
                                            size='large'
                                        />
                                        <Button
                                            type='primary'
                                            size='large'
                                            icon={<SendOutlined />}
                                            disabled={!current_chat_id || !input_value.trim()}
                                            onClick={handle_send}
                                        >
                                            {t('发送')}
                                        </Button>
                                    </Space.Compact>
                                </div>
                            </div>}
                            
                            {active_tab === 'state' && <div className='chat-tab-state'>
                                <Title level={4}>{t('工作区状态')}</Title>
                                {workspace?.current_state
                                    ? <div className='state-content'>
                                        <div dangerouslySetInnerHTML={{ __html: render_markdown(workspace.current_state) }} />
                                    </div>
                                    : <Empty description={t('暂无状态')} style={{ marginTop: 60 }} />
                                }
                            </div>}
                            
                            {active_tab === 'files' && <div className='chat-tab-files'>
                                <div className='files-tree-panel'>
                                    {files.length > 0
                                        ? <Tree
                                            treeData={build_file_tree(files)}
                                            onSelect={handle_select_file}
                                            defaultExpandAll
                                            style={{ background: 'transparent' }}
                                        />
                                        : <Empty description={t('空工作区')} style={{ marginTop: 40 }} />
                                    }
                                </div>
                                <div className='files-content-panel'>
                                    {is_file_loading
                                        ? <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin /></div>
                                        : selected_file_path
                                            ? <div className='file-viewer'>
                                                <Title level={5} style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
                                                    {selected_file_path}
                                                </Title>
                                                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: 13, fontFamily: 'Consolas, monospace' }}>
                                                    {file_content || <Text type='secondary'>{'<空文件>'}</Text>}
                                                </pre>
                                            </div>
                                            : <Empty description={t('在左侧树状图中选择文件以查看')} style={{ marginTop: 100 }} />
                                    }
                                </div>
                            </div>}
                        </div>
                    </div>
                </>
            }
        </div>
        
        <SettingsModal />
    </div>
}


function MessageRow ({ msg, prev, next, is_last }: { msg: IMessage, prev: IMessage | null, next: IMessage | null, is_last: boolean }) {
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
    
    const ddb_obj = parse_ddb_obj_from_content_object(msg.content_object) as DdbObj<DdbValue> | null
    
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
        
        {ddb_obj && <div style={{ marginLeft: 12, marginTop: 2, height: 400 }} className='obj-result'>
            <Obj
                obj={ddb_obj}
                ddb={model.ddb}
                ddb_language={model.ddb?.language}
                ctx='embed'
                options={model.options}
                product_name={model.product_name}
                assets_root={model.assets_root}
                dark={false}
            />
        </div>}
    </div>
}
