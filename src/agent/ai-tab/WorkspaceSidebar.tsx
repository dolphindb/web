import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, Popconfirm, Spin, Tooltip, Typography } from 'antd'
import { DeleteOutlined, FileTextOutlined, FolderOpenOutlined, PaperClipOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import type { IMessage, ISessionAttachment } from '@/agent/model/types.ts'
import { SESSION_ATTACHMENT_ACCEPT } from '@/agent/model/attachment.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import type { IWorkspaceFile } from '@/agent/workspace.ts'
import { ENABLE_ATTACHMENTS } from '@/agent/model/constants.ts'

import type { IFilePreviewTarget } from './FilePreviewModal.tsx'
import { format_file_size, get_workspace_file_change } from './messages.tsx'


const { Text } = Typography


export function WorkspaceSidebar ({
    chat,
    session_id,
    current_session_id,
    messages,
    attachments,
    attachments_loading,
    attachments_error,
    on_refresh_attachments,
    on_upload_attachments,
    on_delete_attachment,
    on_preview_file,
}: {
    chat: ChatModel
    session_id: string
    current_session_id: string
    messages: IMessage[]
    attachments: ISessionAttachment[]
    attachments_loading: boolean
    attachments_error: string
    on_refresh_attachments: () => Promise<void>
    on_upload_attachments: (files: File[]) => Promise<void>
    on_delete_attachment: (attachment_id: string) => Promise<void>
    on_preview_file: (target: IFilePreviewTarget) => void
}) {
    const [visible, set_visible] = useState(false)
    const [files, set_files] = useState<IWorkspaceFile[]>([ ])
    const [files_loading, set_files_loading] = useState(false)
    const [files_error, set_files_error] = useState('')
    const list_request_ref = useRef(0)
    const last_message_id_ref = useRef('')
    const attachment_input_ref = useRef<HTMLInputElement>(null)
    const sidebar_title = ENABLE_ATTACHMENTS ? t('工作区和文件') : t('工作区')
    const toggle_title = ENABLE_ATTACHMENTS
        ? (visible ? t('关闭工作区和文件') : t('打开工作区和文件'))
        : (visible ? t('关闭工作区') : t('打开工作区'))
    
    async function refresh_files ({ silent = false }: { silent?: boolean } = { }) {
        const request_id = ++list_request_ref.current
        if (!silent)
            set_files_loading(true)
        set_files_error('')
        try {
            const next_files = await chat_workspace_store.list_files(session_id, (path, options) => chat.agent.api_fetch(path, options))
            if (request_id === list_request_ref.current)
                set_files(next_files)
        } catch (error) {
            if (request_id === list_request_ref.current) 
                if (!silent)
                    set_files_error(error instanceof Error ? error.message : String(error))
            
        } finally {
            if (request_id === list_request_ref.current)
                set_files_loading(false)
        }
    }
    
    
    useEffect(() => {
        set_files([ ])
        set_files_error('')
        set_visible(false)
        last_message_id_ref.current = ''
        refresh_files({ silent: true })
    }, [session_id])
    
    
    useEffect(() => {
        if (visible)
            refresh_files()
    }, [visible, session_id])
    
    
    useEffect(() => {
        if (current_session_id !== session_id)
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
        
        let should_refresh_files = false
        for (let index = start_index;  index < messages.length;  index++) {
            const change = get_workspace_file_change(messages, index)
            if (change) {
                should_refresh_files = true
                break
            }
        }
        
        if (should_refresh_files)
            refresh_files({ silent: !visible })
    }, [messages, current_session_id, session_id, visible])
    
    return <>
        <Tooltip title={toggle_title}>
            <button
                type='button'
                className={`ai-workspace-toggle ${visible ? 'open' : ''}`}
                onClick={() => { set_visible(!visible) }}
            >
                <FolderOpenOutlined />
                <span>{sidebar_title}</span>
            </button>
        </Tooltip>
        <div className={`ai-workspace-sidebar ${visible ? 'open' : ''}`}>
            <div className='ai-workspace-header'>
                <div className='ai-workspace-title'>{sidebar_title}</div>
                <Tooltip title={t('刷新')}>
                    <Button
                        aria-label={t('刷新')}
                        type='text'
                        size='small'
                        icon={<ReloadOutlined />}
                        loading={files_loading || (ENABLE_ATTACHMENTS && attachments_loading)}
                        onClick={() => {
                            Promise.all([
                                refresh_files(),
                                ...(ENABLE_ATTACHMENTS ? [on_refresh_attachments()] : [ ]),
                            ])
                        }}
                    />
                </Tooltip>
            </div>
            <div className='ai-workspace-body'>
                <section className='ai-workspace-section'>
                    <div className='ai-workspace-section-title'>{t('工作区')}</div>
                    {files_error
                        ? <Alert type='error' showIcon message={t('加载工作区失败')} description={files_error} />
                        : files_loading
                            ? <div className='ai-workspace-loading'><Spin /></div>
                            : files.length === 0
                                ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无工作区文件')} />
                                : <div className='ai-workspace-file-list'>
                                    {files.map(file =>
                                        <button
                                            type='button'
                                            key={file.key}
                                            className='ai-workspace-file'
                                            onClick={() => { on_preview_file({ type: 'workspace', path: file.path }) }}
                                        >
                                            <FileTextOutlined />
                                            <span className='ai-workspace-file-name' title={file.path}>{file.path}</span>
                                            {file.size !== undefined && <Text type='secondary' className='ai-workspace-file-size'>
                                                {format_file_size(file.size)}
                                            </Text>}
                                        </button>
                                    )}
                                </div>
                    }
                </section>
                {ENABLE_ATTACHMENTS && <section className='ai-workspace-section ai-attachment-section'>
                    <div className='ai-workspace-section-header'>
                        <div className='ai-workspace-section-title'>{t('文件')}</div>
                        <Tooltip title={t('上传文件')}>
                            <Button
                                aria-label={t('上传文件')}
                                type='text'
                                size='small'
                                icon={<UploadOutlined />}
                                disabled={attachments_loading}
                                onClick={() => { attachment_input_ref.current?.click() }}
                            />
                        </Tooltip>
                    </div>
                    {attachments_error
                        ? <Alert type='error' showIcon message={t('加载文件失败')} description={attachments_error} />
                        : attachments_loading
                            ? <div className='ai-workspace-loading'><Spin /></div>
                            : attachments.length === 0
                                ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无上传文件')} />
                                : <div className='ai-workspace-file-list'>
                                    {attachments.map(attachment => <div
                                        key={attachment.attachmentId}
                                        className='ai-workspace-file ai-session-attachment-file'
                                    >
                                        <button
                                            type='button'
                                            className='ai-workspace-file-main'
                                            onClick={() => {
                                                on_preview_file({
                                                    type: 'attachment',
                                                    attachment_id: attachment.attachmentId,
                                                    filename: attachment.filename,
                                                })
                                            }}
                                        >
                                            <PaperClipOutlined />
                                            <span className='ai-workspace-file-name' title={attachment.filename}>{attachment.filename}</span>
                                            <Text type='secondary' className='ai-workspace-file-size'>{format_file_size(attachment.sizeBytes)}</Text>
                                        </button>
                                        <Popconfirm
                                            title={t('确定删除该文件？')}
                                            okText={t('删除')}
                                            cancelText={t('取消')}
                                            okButtonProps={{ danger: true }}
                                            onConfirm={async () => {
                                                await on_delete_attachment(attachment.attachmentId)
                                            }}
                                        >
                                            <Button
                                                type='text'
                                                size='small'
                                                className='ai-workspace-file-action'
                                                icon={<DeleteOutlined />}
                                                aria-label={t('删除文件')}
                                                onClick={event => { event.stopPropagation() }}
                                            />
                                        </Popconfirm>
                                    </div>)}
                                </div>
                    }
                    <input
                        ref={attachment_input_ref}
                        className='ai-attachment-file-input'
                        type='file'
                        accept={SESSION_ATTACHMENT_ACCEPT}
                        multiple
                        hidden
                        onChange={async event => {
                            const selected_files = Array.from(event.target.files || [ ])
                            event.target.value = ''
                            if (selected_files.length)
                                await on_upload_attachments(selected_files)
                        }}
                    />
                </section>}
            </div>
        </div>
    </>
}
