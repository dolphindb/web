import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'
import {
    candidate_for_rerank,
    doc_search_tool_result,
    normalize_doc_search_response,
    order_by_rerank_response,
    store_doc_references,
} from './doc_context.ts'


const DEFAULT_MAX_RESULTS = 20
const MAX_RESULTS = 30


function to_positive_int (value: unknown, fallback: number) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const integer = Math.trunc(value)
        return integer > 0 ? integer : fallback
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            const integer = Math.trunc(parsed)
            return integer > 0 ? integer : fallback
        }
    }
    return fallback
}

function clamp_max_results (value: unknown) {
    return Math.min(to_positive_int(value, DEFAULT_MAX_RESULTS), MAX_RESULTS)
}


export const doc_search_config: ScriptConfig = {
    function: 'doc_search',
    definition: {
        type: 'function',
        function: {
            name: 'doc_search',
            description: '搜索 DolphinDB 官方文档、函数说明、示例和错误说明，返回可读取的文档候选 id',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '搜索关键词' },
                    max_results: { type: 'number', description: '最大返回结果数，默认 20，上限 30' },
                },
                required: ['query'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const query = (args[0] || '').trim()
            const max_results = clamp_max_results(args[1])
            
            if (!query)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'doc_search requires query.',
                    },
                }
            
            const result = await context.api_fetch('/doc/search', {
                method: 'POST',
                body: JSON.stringify({
                    agentId: context.agent_id,
                    sessionId: context.session_id,
                    query,
                    maxResults: max_results,
                }),
            })
            const candidates = normalize_doc_search_response(result)
            store_doc_references(context.session_id, candidates)
            
            let ordered = candidates
            try {
                const reranked = await context.api_fetch('/doc/rerank', {
                    method: 'POST',
                    body: JSON.stringify({
                        agentId: context.agent_id,
                        sessionId: context.session_id,
                        query,
                        maxResults: max_results,
                        candidates: candidates.map(candidate_for_rerank),
                    }),
                })
                ordered = order_by_rerank_response(reranked, candidates)
            } catch { }
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify(doc_search_tool_result(query, ordered, max_results)),
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
                    content: `doc_search failed: ${message}`,
                },
            }
        }
    },
}
