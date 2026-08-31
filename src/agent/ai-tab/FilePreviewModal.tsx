import './FilePreviewModal.sass'

import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Modal, Segmented, Spin, Typography } from 'antd'
import { CopyOutlined, DownloadOutlined, FileImageOutlined, FileTextOutlined } from '@ant-design/icons'
import { storage } from 'xshell/storage.js'

import { t } from '@i18n'
import { storage_keys } from '@model'
import { copy } from '@utils'
import { Editor } from '@components/Editor/index.tsx'
import { MonacoEditor } from '@components/Editor/MonacoEditor.tsx'
import type { ChatModel } from '@/agent/model.ts'
import type { IMessage } from '@/agent/model/types.ts'
import { chat_workspace_store, normalize_workspace_path } from '@/agent/workspace.ts'

import { render_markdown } from './markdown.ts'
import { format_file_size, get_workspace_file_change } from './messages.tsx'


const { Text } = Typography

export type FilePreviewType = 'image' | 'markdown' | 'code' | 'other'

export type IFilePreviewTarget =
    | { type: 'workspace', path: string }
    | { type: 'attachment', attachment_id: string, filename?: string }

interface IPreviewState {
    filename: string
    preview_type: FilePreviewType
    content: string
    file?: Blob
    image_src: string
    size?: number
}


export function get_file_preview_type (filename: string, mime_type?: string, kind?: string): FilePreviewType {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    
    if (
        kind === 'image' ||
        mime_type?.startsWith('image/') ||
        ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'].includes(ext)
    )
        return 'image'
    
    if (
        mime_type === 'text/markdown' ||
        ['md', 'markdown', 'mdown', 'mkd'].includes(ext)
    )
        return 'markdown'
    
    if (
        kind === 'text' ||
        mime_type?.startsWith('text/') ||
        mime_type === 'application/json' ||
        mime_type === 'application/javascript' ||
        mime_type === 'application/typescript' ||
        mime_type === 'application/xml' ||
        mime_type === 'application/x-sh' ||
        mime_type === 'application/x-sql' ||
        ['txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'sql', 'dos', 'ddb', 'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1', 'css', 'sass', 'scss', 'less', 'html', 'htm', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'csv', 'tsv', 'log', 'env', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'r', 'lua', 'proto', 'graphql'].includes(ext)
    )
        return 'code'
    
    return 'other'
}


export function get_editor_language (filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    switch (ext) {
        case 'dos':
        case 'ddb':
            return 'dolphindb'
        case 'sql':
            return 'sql'
        case 'py':
            return 'python'
        case 'js':
        case 'jsx':
            return 'javascript'
        case 'ts':
        case 'tsx':
            return 'typescript'
        case 'json':
            return 'json'
        case 'html':
        case 'htm':
            return 'html'
        case 'css':
        case 'sass':
        case 'scss':
        case 'less':
            return 'css'
        case 'xml':
        case 'svg':
            return 'xml'
        case 'yaml':
        case 'yml':
            return 'yaml'
        case 'sh':
        case 'bash':
            return 'shell'
        case 'md':
        case 'markdown':
            return 'markdown'
        case 'c':
        case 'h':
            return 'c'
        case 'cpp':
        case 'hpp':
            return 'cpp'
        case 'rs':
            return 'rust'
        case 'go':
            return 'go'
        case 'java':
            return 'java'
        case 'php':
            return 'php'
        case 'rb':
            return 'ruby'
        case 'r':
            return 'r'
        case 'ini':
        case 'cfg':
        case 'conf':
            return 'ini'
        default:
            return 'plaintext'
    }
}


function is_base64 (str: string): boolean {
    if (!str || str.length % 4 !== 0)
        return false
    return /^[A-Za-z0-9+/]+={0,2}$/.test(str.trim())
}


function resolve_image_src (content: string, mime_type?: string): string {
    const trimmed = content.trim()
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:'))
        return trimmed
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml'))
        return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`
    if (is_base64(trimmed))
        return `data:${mime_type || 'image/png'};base64,${trimmed}`
    return ''
}


function download_url (url: string, filename: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}


function download_blob (blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    download_url(url, filename)
    URL.revokeObjectURL(url)
}


export function FilePreviewModal ({
    chat,
    session_id,
    target,
    messages = [ ],
    current_session_id,
    on_close,
}: {
    chat: ChatModel
    session_id: string
    target: IFilePreviewTarget | null
    messages?: IMessage[]
    current_session_id?: string
    on_close: () => void
}) {
    const [minimap] = useState(() => storage.get_bool(storage_keys.minimap) ?? false)
    const [loading, set_loading] = useState(false)
    const [error, set_error] = useState('')
    const [preview_data, set_preview_data] = useState<IPreviewState | null>(null)
    const [preview_mode, set_preview_mode] = useState<'preview' | 'source'>('preview')
    const [copied, set_copied] = useState(false)
    
    const request_ref = useRef(0)
    const last_message_id_ref = useRef('')
    
    async function load_target (current_target: IFilePreviewTarget) {
        const request_id = ++request_ref.current
        set_loading(true)
        set_error('')
        set_copied(false)
        set_preview_mode('preview')
        
        try {
            if (current_target.type === 'workspace') {
                const file = await chat_workspace_store.get_file(
                    session_id,
                    (path, options) => chat.agent.api_fetch(path, options),
                    current_target.path
                )
                if (request_id !== request_ref.current)
                    return
                if (!file) {
                    set_error(t('文件不存在或已被删除'))
                    set_preview_data(null)
                    return
                }
                const preview_type = get_file_preview_type(file.path)
                const image_src = preview_type === 'image' ? resolve_image_src(file.content) : ''
                set_preview_data({
                    filename: file.path,
                    preview_type,
                    content: file.content || '',
                    size: file.size,
                    image_src,
                })
            } else {
                const [attachment, file] = await Promise.all([
                    chat.attachment.get_attachment(session_id, current_target.attachment_id),
                    chat.attachment.download_attachment(session_id, current_target.attachment_id),
                ])
                if (request_id !== request_ref.current)
                    return
                if (!attachment) {
                    set_error(t('文件不存在或已被删除'))
                    set_preview_data(null)
                    return
                }
                const filename = attachment.filename || current_target.filename || 'attachment'
                const preview_type = get_file_preview_type(filename, attachment.mimeType, attachment.kind)
                const content = preview_type === 'code' || preview_type === 'markdown' ? await file.text() : ''
                if (request_id !== request_ref.current)
                    return
                const image_src = preview_type === 'image' ? URL.createObjectURL(file) : ''
                
                set_preview_data({
                    filename,
                    preview_type,
                    content,
                    file,
                    image_src,
                    size: attachment.byteSize,
                })
            }
        } catch (err) {
            if (request_id === request_ref.current) {
                set_error(err instanceof Error ? err.message : String(err))
                set_preview_data(null)
            }
        } finally {
            if (request_id === request_ref.current)
                set_loading(false)
        }
    }
    
    
    function download_current_file () {
        if (!preview_data)
            return
        
        const { filename, content, file } = preview_data
        
        if (target?.type === 'workspace') {
            const file_blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' })
            download_blob(file_blob, filename)
            return
        }
        
        if (file)
            download_blob(file, filename)
    }
    
    
    useEffect(() => {
        if (!target) {
            set_preview_data(null)
            set_error('')
            set_loading(false)
            return
        }
        load_target(target)
    }, [session_id, target?.type, (target as any)?.path, (target as any)?.attachment_id])
    
    
    useEffect(() => {
        return () => {
            if (preview_data?.image_src?.startsWith('blob:'))
                URL.revokeObjectURL(preview_data.image_src)
        }
    }, [preview_data?.image_src])
    
    
    useEffect(() => {
        if (!target || target.type !== 'workspace' || current_session_id !== session_id)
            return
        
        const last_message_id = messages[messages.length - 1]?.msgId || ''
        if (!last_message_id)
            return
        
        const last_seen_id = last_message_id_ref.current
        if (!last_seen_id) {
            last_message_id_ref.current = last_message_id
            return
        }
        
        const last_seen_index = messages.findIndex(message => message.msgId === last_seen_id)
        const start_index = last_seen_index >= 0 ? last_seen_index + 1 : 0
        last_message_id_ref.current = last_message_id
        
        const opened_path = normalize_workspace_path(target.path)
        for (let index = start_index;  index < messages.length;  index++) {
            const change = get_workspace_file_change(messages, index)
            if (change?.path && normalize_workspace_path(change.path) === opened_path) {
                load_target(target)
                break
            }
        }
    }, [messages, current_session_id, session_id, target])
    
    
    useEffect(() => {
        if (!copied)
            return
        const timer = setTimeout(() => { set_copied(false) }, 1500)
        return () => { clearTimeout(timer) }
    }, [copied])
    
    
    const content_text = preview_data?.content || ''
    const is_text_content = Boolean(content_text) || preview_data?.preview_type === 'code' || preview_data?.preview_type === 'markdown'
    const modal_title = preview_data?.filename || (target?.type === 'workspace' ? target.path : target?.filename) || t('文件预览')
    
    return <Modal
        title={<div className='ai-file-preview-header'>
            <span className='ai-file-preview-title' title={modal_title}>{modal_title}</span>
            {preview_data?.preview_type === 'markdown' && !loading && !error && <Segmented
                size='small'
                value={preview_mode}
                onChange={val => { set_preview_mode(val as 'preview' | 'source') }}
                options={[
                    { label: t('预览'), value: 'preview' },
                    { label: t('源码'), value: 'source' },
                ]}
            />}
        </div>}
        open={Boolean(target)}
        onCancel={on_close}
        footer={<>
            {is_text_content && <Button
                icon={<CopyOutlined />}
                disabled={!content_text || loading}
                onClick={async () => {
                    try {
                        await copy(content_text)
                        set_copied(true)
                    } catch (err) {
                        console.error('[ai] copy file content failed:', err)
                    }
                }}
            >
                {copied ? t('已复制') : t('复制')}
            </Button>}
            <Button
                icon={<DownloadOutlined />}
                disabled={!preview_data || loading}
                onClick={download_current_file}
            >
                {t('下载')}
            </Button>
        </>}
        width={960}
        destroyOnHidden
    >
        <div className='ai-file-preview-body'>
            {loading
                ? <div className='ai-file-preview-loading'><Spin /></div>
                : error
                    ? <Alert type='error' showIcon message={t('加载文件失败')} description={error} />
                    : !preview_data
                        ? null
                        : preview_data.preview_type === 'image'
                            ? preview_data.image_src
                                ? <div className='ai-file-preview-image'>
                                    <img src={preview_data.image_src} alt={preview_data.filename} />
                                </div>
                                : <div className='ai-file-preview-empty'>
                                    <FileImageOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                                    <Text type='secondary'>{t('无法加载图片预览')}</Text>
                                </div>
                            : preview_data.preview_type === 'markdown'
                                ? preview_mode === 'preview'
                                    ? <div className='ai-file-preview-markdown ai-message-content'>
                                        <div dangerouslySetInnerHTML={{ __html: render_markdown(content_text) }} />
                                    </div>
                                    : <div className='ai-file-preview-editor'>
                                        <MonacoEditor
                                            readonly
                                            default_value={content_text}
                                            language='markdown'
                                            options={{
                                                minimap: { enabled: minimap },
                                                wordWrap: 'on',
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                dimension: { width: 0, height: 560 },
                                            }}
                                        />
                                    </div>
                                : (preview_data.preview_type === 'code' || content_text)
                                    ? <div className='ai-file-preview-editor'>
                                            {get_editor_language(preview_data.filename) === 'dolphindb'
                                                ? <Editor
                                                    readonly
                                                    default_value={content_text}
                                                    options={{
                                                        minimap: { enabled: minimap },
                                                        wordWrap: 'on',
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        dimension: { width: 0, height: 560 },
                                                    }}
                                                />
                                                : <MonacoEditor
                                                    readonly
                                                    default_value={content_text}
                                                    language={get_editor_language(preview_data.filename)}
                                                    options={{
                                                        minimap: { enabled: minimap },
                                                        wordWrap: 'on',
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        dimension: { width: 0, height: 560 },
                                                    }}
                                                />
                                            }
                                        </div>
                                    : <div className='ai-file-preview-empty'>
                                        <FileTextOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                                        <Text strong>{preview_data.filename}</Text>
                                        {preview_data.size !== undefined && <Text type='secondary'>{format_file_size(preview_data.size)}</Text>}
                                        <Text type='secondary'>{t('该文件格式暂不支持直接预览，可下载后在本地查看')}</Text>
                                    </div>
            }
        </div>
    </Modal>
}
