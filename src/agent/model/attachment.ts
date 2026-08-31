import type { ChatModel } from '@/agent/model.ts'

import { prepare_file_upload, upload_file_parts } from './multipart-upload.ts'
import type {
    ISessionAttachment,
    ISessionAttachmentDeleteResult,
    ISessionAttachmentListResult,
    ISessionAttachmentUpload,
    ISessionAttachmentUploadInfo,
    ISessionAttachmentUploadInit,
} from './types.ts'


export const SESSION_ATTACHMENT_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.pptx,.xlsx,.txt,.text,.log,.md,.csv,.tsv,.xml,image/*,text/*,application/xml'


export class ChatAttachmentModel {
    constructor (private chat: ChatModel) { }
    async upload_attachment (session_id: string, params: ISessionAttachmentUpload): Promise<ISessionAttachment> {
        const { buffer, sha256 } = await prepare_file_upload(params.file)
        const upload = await this.init_attachment_upload(session_id, {
            filename: params.filename,
            mimeType: params.mimeType || params.file.type || 'application/octet-stream',
            byteSize: params.file.size,
            sha256,
            ...(params.extra === undefined ? { } : { extra: params.extra }),
        })
        await upload_file_parts(buffer, upload.partSize, upload.partCount, async (part_no, part, part_sha256) => {
            await this.put_attachment_part(session_id, upload.attachmentId, part_no, part, part_sha256)
        })
        return this.complete_attachment(session_id, upload.attachmentId)
    }
    async init_attachment_upload (session_id: string, params: ISessionAttachmentUploadInit): Promise<ISessionAttachmentUploadInfo> {
        return this.chat.agent.api_fetch(`/session/${encodeURIComponent(session_id)}/attachments`, {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }
    async put_attachment_part (
        session_id: string,
        attachment_id: string,
        part_no: number,
        part: ArrayBuffer,
        sha256: string
    ): Promise<ISessionAttachmentUploadInfo> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}/parts/${part_no}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Part-SHA256': sha256,
                },
                body: part,
            }
        )
    }
    async complete_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachment> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}/complete`,
            { method: 'POST' }
        )
    }
    async index_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachment> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}/index`,
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
    async get_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachment> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}`
        )
    }
    async download_attachment (session_id: string, attachment_id: string): Promise<Blob> {
        return this.chat.agent.api_fetch_blob(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}/content`
        )
    }
    async delete_attachment (session_id: string, attachment_id: string): Promise<ISessionAttachmentDeleteResult> {
        return this.chat.agent.api_fetch(
            `/session/${encodeURIComponent(session_id)}/attachments/${encodeURIComponent(attachment_id)}`,
            { method: 'DELETE' }
        )
    }
}
