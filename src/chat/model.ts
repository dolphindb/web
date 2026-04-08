import { Model } from 'react-object-model'

import { model, storage_keys } from '@model'
import { t } from '@i18n'

import { normalize_message } from './utils/message.ts'


export type MessageRole = 'system' | 'user' | 'assistant'

export type MessageType = 'system' | 'text' | 'tool_call' | 'tool_result' | 'skill_result' | 'tool_error' | 'agent_error'

export type AgentStatus = 'idle' | 'thinking' | 'tool_running' | 'error'


export interface IMessage {
    msgId: string
    role: string
    messageType?: string
    content: string
    reasoning_content?: string
    content_object?: unknown
    name?: string
}


export interface IChat {
    chatId: string
    workspaceId: string
    username: string
    title: string
    providerId: string
    modelId: string
    createTime?: string
    updateTime?: string
}


export interface IAgentStatusEvent {
    status: AgentStatus
    message?: string
    timestamp?: number
}


export interface IStep {
    id: string
    chatId: string
    stepIndex: number
    content: string
    checked: boolean
    active: boolean
}


export interface IWorkspace {
    id: string
    name: string
    current_state: string
}


export interface IVfsFile {
    id: string
    workspaceId: string
    path: string
}


class ChatModel extends Model<ChatModel> {
    server_url = localStorage.getItem('chat.server_url') || 'http://localhost:3012'
    
    workspace_id = ''
    
    chats: IChat[] = [ ]
    
    current_chat_id = ''
    
    messages: IMessage[] = [ ]
    
    buffered_messages: string[] = [ ]
    
    agent_status: IAgentStatusEvent = { status: 'idle' }
    
    ws: WebSocket | null = null
    
    steps: IStep[] = [ ]
    
    settings_visible = false
    
    loading = false
    
    
    get_authorization (): string {
        const ticket = localStorage.getItem(storage_keys.ticket) || ''
        const hostname = model.hostname || 'localhost'
        const port = model.port || '8848'
        return `${ticket}@ws://${hostname}:${port}`
    }
    
    
    async api_fetch (path: string, options: RequestInit = { }) {
        const url = `${this.server_url}${path}`
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': this.get_authorization(),
            ...(options.headers as Record<string, string> || { })
        }
        const response = await fetch(url, { ...options, headers })
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }))
            throw new Error(err.error || response.statusText)
        }
        return response.json()
    }
    
    
    async init () {
        try {
            this.set({ loading: true })
            
            await this.api_fetch('/api/healthz')
            
            let workspaces: any
            try {
                workspaces = await this.api_fetch('/api/workspaces')
            } catch {
                workspaces = { workspaces: [ ] }
            }
            
            if (workspaces.workspaces?.length > 0)
                this.set({ workspace_id: workspaces.workspaces[0].id })
            else {
                const result = await this.api_fetch('/api/workspaces', {
                    method: 'POST',
                    body: JSON.stringify({ name: 'default' })
                })
                this.set({ workspace_id: result.workspace?.id || result.id })
            }
            
            await this.load_chats()
        } catch (error) {
            console.error('Chat init failed:', error)
            model.message?.error(t('智能助手初始化失败，请检查后端服务地址'))
        } finally {
            this.set({ loading: false })
        }
    }
    
    
    async load_chats () {
        const result = await this.api_fetch('/api/chats')
        const chats: IChat[] = result.chats || [ ]
        chats.sort((a, b) => {
            const ta = a.updateTime ? Date.parse(a.updateTime) : 0
            const tb = b.updateTime ? Date.parse(b.updateTime) : 0
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
        })
        this.set({ chats })
    }
    
    
    async create_chat () {
        if (!this.workspace_id)
            return
        
        const result = await this.api_fetch('/api/chats', {
            method: 'POST',
            body: JSON.stringify({ workspaceId: this.workspace_id })
        })
        const chat = result.chat
        this.set({
            chats: [chat, ...this.chats],
            current_chat_id: chat.chatId,
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            steps: [ ],
        })
        this.connect_ws(chat.chatId)
    }
    
    
    async select_chat (chat_id: string) {
        if (chat_id === this.current_chat_id)
            return
        
        this.disconnect_ws()
        
        this.set({
            current_chat_id: chat_id,
            messages: [ ],
            buffered_messages: [ ],
            agent_status: { status: 'idle' },
            steps: [ ],
        })
        
        const [msgs_result] = await Promise.all([
            this.api_fetch(`/api/chats/${chat_id}/messages`),
            this.load_steps(chat_id),
        ])
        
        const raw_messages: unknown[] = msgs_result.messages || [ ]
        const messages = raw_messages
            .map(item => normalize_message(item))
            .filter((item): item is IMessage => item !== null)
        this.set({ messages })
        
        this.connect_ws(chat_id)
    }
    
    
    async delete_chat (chat_id: string) {
        await this.api_fetch(`/api/chats/${chat_id}`, { method: 'DELETE' })
        const new_chats = this.chats.filter(c => c.chatId !== chat_id)
        
        if (this.current_chat_id === chat_id) {
            this.disconnect_ws()
            this.set({
                current_chat_id: '',
                messages: [ ],
                buffered_messages: [ ],
            })
        }
        
        this.set({ chats: new_chats })
    }
    
    
    async update_chat_title (chat_id: string, title: string) {
        await this.api_fetch(`/api/chats/${chat_id}/title`, {
            method: 'PUT',
            body: JSON.stringify({ title }),
        })
        this.patch_chat(chat_id, { title, updateTime: new Date().toISOString() })
    }
    
    
    async update_chat_model (chat_id: string, provider_id: string, model_id: string) {
        await this.api_fetch(`/api/chats/${chat_id}`, {
            method: 'PUT',
            body: JSON.stringify({ providerId: provider_id, modelId: model_id }),
        })
        this.patch_chat(chat_id, { providerId: provider_id, modelId: model_id, updateTime: new Date().toISOString() })
    }
    
    
    patch_chat (chat_id: string, patch: Partial<IChat>) {
        this.set({
            chats: this.chats.map(c =>
                c.chatId === chat_id ? { ...c, ...patch } : c
            )
        })
    }
    
    
    async load_steps (chat_id: string) {
        try {
            const items: IStep[] = await this.api_fetch(`/api/steps/chat/${chat_id}`)
            this.set({ steps: Array.isArray(items) ? items.filter(s => s.active) : [ ] })
        } catch {
            this.set({ steps: [ ] })
        }
    }
    
    
    async load_workspace (workspace_id: string): Promise<IWorkspace | null> {
        try {
            return await this.api_fetch(`/api/workspaces/${workspace_id}`)
        } catch {
            return null
        }
    }
    
    
    async load_files (workspace_id: string): Promise<IVfsFile[]> {
        try {
            const items = await this.api_fetch(`/api/vfs/workspace/${workspace_id}`)
            return Array.isArray(items) ? items : [ ]
        } catch {
            return [ ]
        }
    }
    
    
    async load_file_content (workspace_id: string, path: string): Promise<string> {
        try {
            const item = await this.api_fetch(`/api/vfs/workspace/${workspace_id}/file?path=${encodeURIComponent(path)}`)
            return item?.content || ''
        } catch {
            return t('文件加载失败')
        }
    }
    
    
    async load_provider_options (): Promise<Array<{ value: string, label: string, children: Array<{ value: string, label: string }> }>> {
        try {
            const res = await this.api_fetch('/api/providers')
            const providers = res.providers || [ ]
            const options = await Promise.all(
                providers.map(async (p: any) => {
                    try {
                        const detail = await this.api_fetch(`/api/providers/${p.providerId}`)
                        return {
                            value: p.providerId,
                            label: p.providerName,
                            children: (detail.models || [ ]).map((m: any) => ({
                                value: m.modelId,
                                label: m.modelName,
                            })),
                        }
                    } catch {
                        return { value: p.providerId, label: p.providerName, children: [ ] }
                    }
                })
            )
            return options
        } catch {
            return [ ]
        }
    }
    
    
    /** Upsert a message into the messages array (update existing or append) */
    upsert_message (msg: IMessage) {
        const idx = this.messages.findIndex(m => m.msgId === msg.msgId)
        if (idx < 0)
            this.set({ messages: [...this.messages, msg] })
        else {
            const current = this.messages[idx]
            const merged: IMessage = {
                ...current,
                ...msg,
                messageType: msg.messageType ?? current.messageType,
                content_object: msg.content_object ?? current.content_object,
                reasoning_content: msg.reasoning_content ?? current.reasoning_content,
            }
            const next = [...this.messages]
            next[idx] = merged
            this.set({ messages: next })
        }
    }
    
    
    connect_ws (chat_id: string) {
        this.disconnect_ws()
        
        const ws_url = this.server_url.replace(/^http/, 'ws')
        const ws = new WebSocket(ws_url)
        
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'subscribe',
                chatId: chat_id,
                authorization: this.get_authorization()
            }))
        }
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.handle_ws_event(data)
            } catch (e) {
                console.error('WS message parse error:', e)
            }
        }
        
        ws.onclose = () => {
            if (this.ws === ws)
                this.set({ agent_status: { status: 'idle' } })
        }
        
        ws.onerror = (error) => {
            console.error('WS error:', error)
        }
        
        this.set({ ws })
    }
    
    
    disconnect_ws () {
        if (this.ws) {
            this.ws.close()
            this.set({ ws: null })
        }
    }
    
    
    handle_ws_event (data: any) {
        switch (data.type) {
            case 'state_snapshot':
                if (data.snapshot) {
                    const snapshot = data.snapshot
                    if (snapshot.status?.status)
                        this.set({ agent_status: snapshot.status })
                    this.set({ buffered_messages: Array.isArray(snapshot.buffer) ? snapshot.buffer : [ ] })
                }
                break
                
            case 'message':
                if (data.chatId === this.current_chat_id && data.message) {
                    const msg = normalize_message(data.message)
                    if (msg)
                        this.upsert_message(msg)
                }
                if (data.message?.role === 'user')
                    this.load_chats().catch(() => { })
                break
                
            case 'message_stream':
                if (data.chatId === this.current_chat_id && data.message) {
                    const msg = normalize_message(data.message)
                    if (msg)
                        this.upsert_message(msg)
                }
                break
                
            case 'message_stream_end':
                if (data.chatId === this.current_chat_id) {
                    if (data.discard && typeof data.msgId === 'string' && data.msgId.trim())
                        this.set({ messages: this.messages.filter(m => m.msgId !== data.msgId) })
                }
                break
                
            case 'buffer_updated':
                if (data.chatId === this.current_chat_id)
                    this.set({ buffered_messages: data.buffer || [ ] })
                break
                
            case 'status':
                if (data.chatId === this.current_chat_id && data.status)
                    this.set({ agent_status: data.status })
                break
                
            case 'chat_updated':
                if (data.chat || data.chatId) {
                    const updated_id = data.chat?.chatId || data.chatId
                    const title = data.chat?.title || data.title
                    if (title)
                        this.patch_chat(updated_id, { title })
                }
                break
            
            case 'steps_updated':
                if (data.chatId === this.current_chat_id)
                    this.load_steps(this.current_chat_id).catch(() => { })
                break
        }
    }
    
    
    send_message (content: string) {
        if (!content.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN)
            return
        
        this.ws.send(JSON.stringify({
            type: 'submit',
            chatId: this.current_chat_id,
            content: content.trim(),
            authorization: this.get_authorization()
        }))
        
        this.set({ buffered_messages: [...this.buffered_messages, content.trim()] })
    }
    
    
    set_server_url (url: string) {
        localStorage.setItem('chat.server_url', url)
        this.set({ server_url: url })
    }
}


export let chat_model = new ChatModel()
