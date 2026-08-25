import type { ChatModel } from '@/agent/model.ts'

import type { ISessionAttachment, ISessionAttachmentDeleteResult, ISessionAttachmentListResult, ISessionAttachmentUpload } from './types.ts'


export class ChatAttachmentModel {
    constructor (private chat: ChatModel) { }
    async upload_attachment (session_id: string, params: ISessionAttachmentUpload): Promise<ISessionAttachment> {
        const form = new FormData()
        form.append('filename', params.filename)
        form.append('file', params.file, params.filename)
        const mime_type = params.mimeType || params.file.type
        if (mime_type)
            form.append('mimeType', mime_type)
        if (params.referencedMessageId)
            form.append('referencedMessageId', params.referencedMessageId)
        if (params.metadata)
            form.append('metadata', new Blob([JSON.stringify(params.metadata)], { type: 'application/json' }))
        if (params.extra)
            form.append('extra', params.extra)
        return this.chat.agent.api_fetch(`/session/${encodeURIComponent(session_id)}/attachments`, {
            method: 'POST',
            body: form,
        })
    }
    async process_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachment> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}/process`,
            { method: 'POST' }
        )
    }
    async list_attachments (session_id: string, params: { offset?: number, limit?: number } = { }): Promise<ISessionAttachmentListResult> {
        const search = new URLSearchParams({
            offset: String(params.offset ?? 0),
            limit: String(params.limit ?? 100),
        })
        const result = await this.chat.agent.api_fetch(`/session/${encodeURIComponent(session_id)}/attachments?${search}`)
        return { ...result, items: result.items || [ ] }
    }
    async get_attachment (session_id: string, attachment_id: string, include_data = false): Promise<ISessionAttachment> {
        const search = include_data ? '?includeData=true' : ''
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}${search}`
        )
    }

    async delete_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachmentDeleteResult> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}`,
            { method: 'DELETE' }
        )
    }
}
