import { useEffect, useRef, useState } from 'react'

import { Alert, Button, Empty, Modal, Spin, Tooltip, Typography } from 'antd'
import { FileTextOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'
import { Editor } from '@components/Editor/index.tsx'
import type { ChatModel, IMessage } from '@/agent/model.ts'
import { chat_workspace_store, normalize_workspace_path } from '@/agent/workspace.ts'
import type { IWorkspaceFile } from '@/agent/workspace.ts'

import { format_file_size, get_workspace_file_change } from './messages.tsx'


const { Text } = Typography


export function WorkspaceSidebar ({
    chat,
    session_id,
    current_session_id,
    messages,
}: {
    chat: ChatModel
    session_id: string
    current_session_id: string
    messages: IMessage[]
}) {
    const [visible, set_visible] = useState(false)
    const [has_workspace, set_has_workspace] = useState(false)
    const [files, set_files] = useState<IWorkspaceFile[]>([ ])
    const [files_loading, set_files_loading] = useState(false)
    const [files_error, set_files_error] = useState('')
    const [opened_file, set_opened_file] = useState<IWorkspaceFile | null>(null)
    const [file_loading, set_file_loading] = useState(false)
    const list_request_ref = useRef(0)
    const file_request_ref = useRef(0)
    const last_message_id_ref = useRef('')
    
    async function refresh_files ({ silent = false }: { silent?: boolean } = { }) {
        const request_id = ++list_request_ref.current
        if (!silent)
            set_files_loading(true)
        set_files_error('')
        try {
            const next_files = await chat_workspace_store.list_files(session_id, (path, options) => chat.api_fetch(path, options))
            if (request_id === list_request_ref.current) {
                const exists = next_files.length > 0
                set_files(next_files)
                set_has_workspace(exists)
                if (!exists) {
                    set_visible(false)
                    set_opened_file(null)
                } else if (opened_file && !next_files.some(file => normalize_workspace_path(file.path) === normalize_workspace_path(opened_file.path)))
                    set_opened_file(null)
            }
        } catch (error) {
            if (request_id === list_request_ref.current) {
                set_has_workspace(false)
                set_visible(false)
                set_opened_file(null)
                if (!silent)
                    set_files_error(error instanceof Error ? error.message : String(error))
            }
        } finally {
            if (request_id === list_request_ref.current)
                set_files_loading(false)
        }
    }
    
    
    async function open_file (path: string) {
        const request_id = ++file_request_ref.current
        set_file_loading(true)
        try {
            const file = await chat_workspace_store.get_file(session_id, (api_path, options) => chat.api_fetch(api_path, options), path)
            if (request_id !== file_request_ref.current)
                return
            if (!file) {
                model.message?.warning(t('文件不存在或已被删除'))
                set_opened_file(null)
                return
            }
            set_opened_file(file)
        } catch (error) {
            if (request_id === file_request_ref.current)
                model.message?.error(error instanceof Error ? error.message : t('加载文件失败'))
        } finally {
            if (request_id === file_request_ref.current)
                set_file_loading(false)
        }
    }
    
    
    useEffect(() => {
        set_files([ ])
        set_files_error('')
        set_has_workspace(false)
        set_visible(false)
        set_opened_file(null)
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
        let should_refresh_opened_file = false
        const opened_path = normalize_workspace_path(opened_file?.path || '')
        for (let index = start_index;  index < messages.length;  index++) {
            const change = get_workspace_file_change(messages, index)
            if (!change)
                continue
            should_refresh_files = true
            if (opened_path && change.path && normalize_workspace_path(change.path) === opened_path)
                should_refresh_opened_file = true
        }
        
        if (should_refresh_files)
            refresh_files({ silent: !visible })
        if (should_refresh_opened_file && opened_file)
            open_file(opened_file.path)
    }, [messages, current_session_id, session_id, visible, opened_file?.path])
    
    if (!has_workspace)
        return null
    
    return <>
        <Tooltip title={visible ? t('关闭工作区') : t('打开工作区')}>
            <button
                type='button'
                className={`ai-workspace-toggle ${visible ? 'open' : ''}`}
                onClick={() => { set_visible(!visible) }}
            >
                <FolderOpenOutlined />
                <span>{t('工作区')}</span>
            </button>
        </Tooltip>
        <div className={`ai-workspace-sidebar ${visible ? 'open' : ''}`}>
            <div className='ai-workspace-header'>
                <Text strong>{t('工作区文件')}</Text>
                <Button type='text' size='small' icon={<ReloadOutlined />} loading={files_loading} onClick={() => { refresh_files() }} />
            </div>
            <div className='ai-workspace-body'>
                {files_error
                    ? <Alert type='error' showIcon message={t('加载工作区失败')} description={files_error} />
                    : files_loading
                        ? <div className='ai-workspace-loading'><Spin /></div>
                        : files.length === 0
                            ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无文件')} />
                            : <div className='ai-workspace-file-list'>
                                {files.map(file =>
                                    <button
                                        type='button'
                                        key={file.key}
                                        className='ai-workspace-file'
                                        onClick={() => { open_file(file.path) }}
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
            </div>
        </div>
        <Modal
            title={opened_file?.path || t('工作区文件')}
            open={Boolean(opened_file)}
            onCancel={() => { set_opened_file(null) }}
            footer={null}
            width={960}
            destroyOnClose
        >
            <Spin spinning={file_loading}>
                <div className='ai-workspace-editor'>
                    <Editor
                        readonly
                        default_value={opened_file?.content || ''}
                        options={{
                            minimap: { enabled: true },
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            dimension: { width: 0, height: 560 },
                        }}
                    />
                </div>
            </Spin>
        </Modal>
    </>
}
