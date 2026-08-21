import { normalize_json_object } from '@/agent/model/helpers.ts'

import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'


function parse_clamp_int (value: unknown, fallback: number, min = 0, max = 5): number {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(min, Math.min(max, Math.trunc(value)))
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed))
            return Math.max(min, Math.min(max, Math.trunc(parsed)))
    }
    return fallback
}


function clean_chunk (raw: any) {
    if (!raw || typeof raw !== 'object')
        return null
    const chunk_id = String(raw.chunkId || '').trim()
    const content = String(raw.content || '').trim()
    if (!chunk_id && !content)
        return null
    return {
        chunkId: chunk_id,
        content,
        source: {
            documentId: String(raw.source?.documentId || ''),
            fileName: String(raw.source?.fileName || ''),
            ...(typeof raw.source?.pageNo === 'number' ? { pageNo: raw.source.pageNo } : { }),
        },
    }
}


export const kb_read_config: ScriptConfig = {
    function: 'kb_read',
    definition: {
        type: 'function',
        function: {
            name: 'kb_read',
            description: '读取指定 chunk 片段的正文内容及前后相邻 chunk，用于扩展上下文',
            parameters: {
                type: 'object',
                properties: {
                    knowledge_base_id: { type: 'string', description: '知识库 ID' },
                    chunk_id: { type: 'string', description: '目标 chunk ID（来自 kb_search 结果）' },
                    before: { type: 'number', description: '可选，向前读取相邻 chunk 数量（0～5，默认 0）' },
                    after: { type: 'number', description: '可选，向后读取相邻 chunk 数量（0～5，默认 0）' },
                },
                required: ['knowledge_base_id', 'chunk_id'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const parsed_obj = normalize_json_object(content)
            const args = normalize_script_args(content)
            
            const knowledge_base_id = String(
                parsed_obj?.knowledge_base_id ?? parsed_obj?.knowledgeBaseId ?? args[0] ?? ''
            ).trim()
            const chunk_id = String(
                parsed_obj?.chunk_id ?? parsed_obj?.chunkId ?? (parsed_obj ? '' : args[1]) ?? ''
            ).trim()
            const before = parse_clamp_int(
                parsed_obj?.before ?? args[2],
                0,
                0,
                5
            )
            const after = parse_clamp_int(
                parsed_obj?.after ?? args[3],
                0,
                0,
                5
            )
            
            if (!knowledge_base_id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'kb_read requires knowledge_base_id.',
                    },
                }
            
            if (!chunk_id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'kb_read requires chunk_id from kb_search results.',
                    },
                }
            
            const result = await context.api_fetch('/knowledge/read', {
                method: 'POST',
                body: JSON.stringify({
                    ...(context.session_id ? { sessionId: context.session_id } : { }),
                    ...(context.agent_id ? { agentId: context.agent_id } : { }),
                    knowledgeBaseId: knowledge_base_id,
                    chunkId: chunk_id,
                    before,
                    after,
                }),
            })
            
            const item = clean_chunk(result?.item)
            const raw_before = Array.isArray(result?.before) ? result.before : [ ]
            const raw_after = Array.isArray(result?.after) ? result.after : [ ]
            
            const cleaned_before = raw_before.map(clean_chunk).filter(Boolean)
            const cleaned_after = raw_after.map(clean_chunk).filter(Boolean)
            
            const cleaned_payload = {
                item,
                before: cleaned_before,
                after: cleaned_after,
            }
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify(cleaned_payload),
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
                    content: `kb_read failed: ${message}`,
                },
            }
        }
    },
}
