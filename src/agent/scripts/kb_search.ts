import { normalize_json_object } from '@/agent/model/helpers.ts'

import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'


function parse_positive_number (value: unknown, fallback: number, min = 1, max = 20): number {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(min, Math.min(max, Math.trunc(value)))
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed))
            return Math.max(min, Math.min(max, Math.trunc(parsed)))
    }
    return fallback
}


export const kb_search_config: ScriptConfig = {
    function: 'kb_search',
    definition: {
        type: 'function',
        function: {
            name: 'kb_search',
            description: '在指定的知识库中检索相关知识片段（chunks）与来源',
            parameters: {
                type: 'object',
                properties: {
                    knowledge_base_id: { type: 'string', description: '知识库 ID（可从 kb_list 获取）' },
                    query: { type: 'string', description: '检索查询词或问题' },
                    top_k: { type: 'number', description: '可选，返回候选片段上限（1～20，默认 8）' },
                },
                required: ['knowledge_base_id', 'query'],
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
            const query = String(
                parsed_obj?.query ?? (parsed_obj ? '' : args[1]) ?? ''
            ).trim()
            const top_k = parse_positive_number(
                parsed_obj?.top_k ?? parsed_obj?.topK ?? args[2],
                8,
                1,
                20
            )
            
            if (!knowledge_base_id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'kb_search requires knowledge_base_id. Use kb_list to find available knowledge bases.',
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
                        content: 'kb_search requires query.',
                    },
                }
            
            const result = await context.api_fetch('/knowledge/retrieve', {
                method: 'POST',
                body: JSON.stringify({
                    ...(context.session_id ? { sessionId: context.session_id } : { }),
                    ...(context.agent_id ? { agentId: context.agent_id } : { }),
                    knowledgeBaseId: knowledge_base_id,
                    query,
                    topK: top_k,
                }),
            })
            
            const raw_items = Array.isArray(result?.items) ? result.items : [ ]
            const cleaned_items = raw_items.map((item: any) => {
                const chunk_id = String(item.chunkId || '').trim()
                const content = String(item.content || '').trim()
                if (!chunk_id || !content)
                    return null
                const file_name = String(item.source?.fileName || item.fileName || item.file || '').trim()
                const page_no = typeof item.source?.pageNo === 'number'
                    ? item.source.pageNo
                    : (typeof item.pageNo === 'number' ? item.pageNo : undefined)
                return {
                    chunkId: chunk_id,
                    ...(file_name ? { file: file_name } : { }),
                    ...(page_no !== undefined ? { pageNo: page_no } : { }),
                    content,
                }
            }).filter(Boolean)
            
            const cleaned_payload: Record<string, unknown> = {
                items: cleaned_items,
                ...(cleaned_items.length === 0 ? { message: '未检索到相关知识片段。' } : { }),
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
                    content: `kb_search failed: ${message}`,
                },
            }
        }
    },
}
