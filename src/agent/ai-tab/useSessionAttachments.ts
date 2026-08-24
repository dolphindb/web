import { useEffect, useState } from 'react'

import { t } from '@i18n'
import { model } from '@model'
import { bind_chat_model_session } from '@/agent/model.ts'
import type { ChatModel } from '@/agent/model.ts'
import type { ISessionAttachment } from '@/agent/model/types.ts'
import { ENABLE_ATTACHMENTS } from '@/agent/model/constants.ts'
import { is_pending_ai_chat_id, shell } from '@/shell/model.ts'


const pending_attachment_selections = new Map<string, ISessionAttachment[]>()


export function use_session_attachments ({
    chat,
    session_id,
    current_session_id,
    pending_session,
    creating_session,
}: {
    chat: ChatModel
    session_id: string
    current_session_id: string
    pending_session: boolean
    creating_session: boolean
}) {
    const [attachments, set_attachments] = useState<ISessionAttachment[]>([ ])
    const [selected_attachments, set_selected_attachments] = useState<ISessionAttachment[]>([ ])
    const [attachments_loading, set_attachments_loading] = useState(false)
    const [attachments_error, set_attachments_error] = useState('')
    async function create_session () {
        const tab_name = shell.tabs.find(tab => tab.chat_id === session_id)?.name
        const session = await chat.session.create_session(tab_name || t('新会话'))
        return { session, tab_name }
    }
    function bind_session (session: Awaited<ReturnType<typeof create_session>>['session'], tab_name?: string) {
        bind_chat_model_session(session_id, session.sessionId)
        shell.bind_ai_tab_session(session_id, session.sessionId, session.title || tab_name || t('新会话'))
    }
    async function ensure_session () {
        if (!pending_session)
            return current_session_id || session_id
        const { session, tab_name } = await create_session()
        bind_session(session, tab_name)
        return session.sessionId
    }
    async function refresh_attachments (target_session_id = current_session_id || session_id, silent = false) {
        if (!ENABLE_ATTACHMENTS || !target_session_id || is_pending_ai_chat_id(target_session_id))
            return
        if (!silent)
            set_attachments_loading(true)
        set_attachments_error('')
        try {
            const result = await chat.attachment.list_attachments(target_session_id)
            set_attachments(result.items.filter(attachment => attachment.status !== 'deleted'))
        } catch (error) {
            set_attachments_error(error instanceof Error ? error.message : String(error))
        } finally {
            if (!silent)
                set_attachments_loading(false)
        }
    }
    async function upload_attachments (files: File[], select_after_upload = true) {
        if (!ENABLE_ATTACHMENTS || !files.length || creating_session || attachments_loading)
            return
        set_attachments_loading(true)
        set_attachments_error('')
        let created: Awaited<ReturnType<typeof create_session>> | null = null
        try {
            created = pending_session ? await create_session() : null
            const target_session_id = created?.session.sessionId || current_session_id || session_id
            const uploaded: ISessionAttachment[] = [ ]
            for (const file of files)
                uploaded.push(await chat.attachment.upload_attachment(target_session_id, {
                    filename: file.name,
                    file,
                    mimeType: file.type || undefined,
                    metadata: { source: 'web-chat' },
                }))
            set_attachments(current => [
                ...uploaded,
                ...current.filter(item => !uploaded.some(next => next.attachmentId === item.attachmentId)),
            ])
            if (select_after_upload)
                set_selected_attachments(current => [
                    ...current,
                    ...uploaded.filter(item => !current.some(selected => selected.attachmentId === item.attachmentId)),
                ])
            if (created) {
                if (select_after_upload)
                    pending_attachment_selections.set(target_session_id, uploaded)
                bind_session(created.session, created.tab_name)
                created = null
            }
        } catch (error) {
            if (created)
                bind_session(created.session, created.tab_name)
            const message = error instanceof Error ? error.message : t('上传附件失败')
            set_attachments_error(message)
            model.message?.error(message)
        } finally {
            set_attachments_loading(false)
        }
    }
    async function delete_attachment (attachment_id: string) {
        if (!ENABLE_ATTACHMENTS || !attachment_id)
            return
        const target_session_id = current_session_id || session_id
        if (!target_session_id || is_pending_ai_chat_id(target_session_id))
            return
        try {
            await chat.attachment.delete_attachment(target_session_id, attachment_id)
            set_attachments(current => current.filter(item => item.attachmentId !== attachment_id))
            set_selected_attachments(current => current.filter(item => item.attachmentId !== attachment_id))
            model.message?.success(t('附件已删除'))
        } catch (error) {
            const message = error instanceof Error ? error.message : t('删除附件失败')
            model.message?.error(message)
        }
    }
    useEffect(() => {
        if (!ENABLE_ATTACHMENTS)
            return
        const transferred_attachments = pending_attachment_selections.get(session_id) || [ ]
        pending_attachment_selections.delete(session_id)
        set_attachments(transferred_attachments)
        set_selected_attachments(transferred_attachments)
        set_attachments_error('')
        if (!pending_session)
            refresh_attachments(session_id, true)
    }, [session_id, pending_session])
    return {
        attachments,
        selected_attachments,
        attachments_loading,
        attachments_error,
        set_selected_attachments,
        ensure_session,
        refresh_attachments,
        upload_attachments,
        delete_attachment,
    }
}
