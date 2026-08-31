import { normalize_json_object } from '@/agent/model/helpers.ts'

import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'


function parse_top_k (value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(1, Math.min(20, Math.trunc(value)))
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed))
            return Math.max(1, Math.min(20, Math.trunc(parsed)))
    }
    return 8
}


function parse_attachment_ids (value: unknown) {
    return (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [ ])
        .map(id => String(id).trim())
        .filter(Boolean)
}


export const attachment_search_config: ScriptConfig = {
    function: 'attachment_search',
    definition: {
        type: 'function',
        function: {
            name: 'attachment_search',
            description: '检索当前会话已就绪附件中的相关内容片段与来源',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '检索查询词或问题' },
                    top_k: { type: 'number', description: '可选，返回候选片段上限（1～20，默认 8）' },
                    attachment_ids: {
                        type: 'array',
                        description: '可选，限定检索的附件 ID；省略或为空时检索当前会话下全部可检索附件',
                        items: { type: 'string' },
                    },
                },
                required: ['query'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const parsed_obj = normalize_json_object(content)
            const args = normalize_script_args(content)
            const query = String(parsed_obj?.query ?? args[0] ?? '').trim()
            const top_k = parse_top_k(parsed_obj?.top_k ?? parsed_obj?.topK ?? args[1])
            const attachment_ids = parse_attachment_ids(
                parsed_obj?.attachment_ids ?? parsed_obj?.attachmentIds ?? args[2]
            )
            
            if (!context.session_id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'attachment_search requires an active session.',
                    },
                }
            
            if (!query)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'attachment_search requires query.',
                    },
                }
            
            const result = await context.api_fetch(
                `/session/${encodeURIComponent(context.session_id)}/attachments/retrieve`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        query,
                        topK: top_k,
                        ...(attachment_ids.length ? { attachmentIds: attachment_ids } : { }),
                    }),
                }
            )
            const raw_items = Array.isArray(result?.items) ? result.items : [ ]
            const items = raw_items.map((item: any) => {
                const chunk_id = String(item.chunkId || '').trim()
                const item_content = String(item.content || '').trim()
                if (!chunk_id || !item_content)
                    return null
                const attachment_id = String(item.source?.attachmentId || item.attachmentId || '').trim()
                const file_name = String(item.source?.fileName || item.fileName || item.file || '').trim()
                const page_no = typeof item.source?.pageNo === 'number'
                    ? item.source.pageNo
                    : (typeof item.pageNo === 'number' ? item.pageNo : undefined)
                return {
                    chunkId: chunk_id,
                    content: item_content,
                    source: {
                        ...(attachment_id ? { attachmentId: attachment_id } : { }),
                        ...(file_name ? { fileName: file_name } : { }),
                        ...(page_no !== undefined ? { pageNo: page_no } : { }),
                    },
                }
            }).filter(Boolean)
            const retrieval_id = String(result?.retrievalId || '').trim()
            const result_status = String(result?.resultStatus || '').trim()
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify({
                        ...(retrieval_id ? { retrievalId: retrieval_id } : { }),
                        ...(result_status ? { resultStatus: result_status } : { }),
                        items,
                        ...(items.length ? { } : { message: '未检索到相关附件片段。' }),
                    }),
                },
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: type,
                    content: `attachment_search failed: ${message}`,
                },
            }
        }
    },
}
