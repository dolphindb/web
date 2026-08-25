import { useEffect, useRef, useState } from 'react'

import { t } from '@i18n'
import { SESSION_ATTACHMENT_ACCEPT } from '@/agent/model/attachment.ts'
import type { ISessionAttachment } from '@/agent/model/types.ts'

import { format_file_size } from './messages.tsx'


export function AttachmentPicker ({
    attachments,
    selected_attachment_ids,
    loading,
    disabled,
    max_image_bytes,
    max_input_files,
    on_select,
    on_upload,
}: {
    attachments: ISessionAttachment[]
    selected_attachment_ids: string[]
    loading: boolean
    disabled: boolean
    max_image_bytes: number
    max_input_files: number
    on_select: (attachment: ISessionAttachment) => void
    on_upload: (files: File[]) => Promise<void>
}) {
    const [open, set_open] = useState(false)
    const container_ref = useRef<HTMLDivElement>(null)
    const file_input_ref = useRef<HTMLInputElement>(null)
    const available_attachments = attachments.filter(attachment => attachment.status !== 'deleted')
    useEffect(() => {
        if (!open)
            return
        function close (event: globalThis.MouseEvent) {
            if (!container_ref.current?.contains(event.target as Node))
                set_open(false)
        }
        document.addEventListener('mousedown', close)
        return () => { document.removeEventListener('mousedown', close) }
    }, [open])
    return <div className='ai-attachment-picker' ref={container_ref}>
        <button
            type='button'
            className='ai-attachment-add'
            aria-label={t('添加附件')}
            disabled={disabled}
            onClick={() => { set_open(!open) }}
        >+</button>
        {open && <div className='ai-attachment-popover'>
            <button
                type='button'
                className='ai-attachment-upload-action'
                disabled={loading}
                onClick={() => { file_input_ref.current?.click() }}
            >
                <span className='ai-attachment-upload-icon'>↑</span>
                <span>{loading ? t('上传中...') : t('上传新文件')}</span>
            </button>
            <div className='ai-attachment-upload-hint'>
                <div>{t('支持图片、PDF、DOCX、PPTX、XLS/XLSX 及文本文件（如 TXT、LOG、MD、CSV、TSV、XML）')}</div>
                <div>{t('当前模型图片大小上限：{{image_size}}；单次文件数量上限：{{file_count}}', {
                    image_size: max_image_bytes > 0 ? format_file_size(max_image_bytes) : t('不限制'),
                    file_count: max_input_files > 0 ? max_input_files : t('不限制'),
                })}</div>
            </div>
            <div className='ai-attachment-popover-title'>{t('已上传文件')}</div>
            <div className='ai-attachment-popover-list'>
                {available_attachments.length === 0
                    ? <div className='ai-attachment-empty'>{t('暂无上传文件')}</div>
                    : available_attachments.map(attachment => <button
                        type='button'
                        className='ai-attachment-option'
                        key={attachment.attachmentId}
                        aria-pressed={selected_attachment_ids.includes(attachment.attachmentId)}
                        disabled={selected_attachment_ids.includes(attachment.attachmentId)}
                        onClick={() => {
                            on_select(attachment)
                            set_open(false)
                        }}
                    >
                        <span className='ai-attachment-option-name' title={attachment.filename}>{attachment.filename}</span>
                        <span className='ai-attachment-option-size'>{format_file_size(attachment.sizeBytes)}</span>
                        {selected_attachment_ids.includes(attachment.attachmentId) && <span aria-hidden='true'>✓</span>}
                    </button>)
                }
            </div>
        </div>}
        <input
            ref={file_input_ref}
            className='ai-attachment-file-input'
            type='file'
            accept={SESSION_ATTACHMENT_ACCEPT}
            multiple
            hidden
            onChange={async event => {
                const files = Array.from(event.target.files || [ ])
                event.target.value = ''
                if (files.length) {
                    await on_upload(files)
                    set_open(false)
                }
            }}
        />
    </div>
}
