import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'
import { resolve_dolphindb_doc_url } from './doc_url.ts'
import { network_fetch } from './network_fetch.ts'


const DDB_DOC_SEARCH_URL = 'https://dolphindb.cn/api/search'
const MAX_ITEMS_PER_PAGE = 30
const DEFAULT_PAGE = 1
const REQUEST_TIMEOUT_MS = 30_000

type DocSearchApiItem = {
    content?: unknown
    score?: unknown
    title?: unknown
    url?: unknown
}

type DocSearchApiResponse = {
    items?: unknown
    totalPage?: unknown
    totalSearchItems?: unknown
}


function to_text (value: unknown) {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}

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

function parse_search_response (payload: unknown, query: string, page: number) {
    const response = payload && typeof payload === 'object' ? payload as DocSearchApiResponse : { }
    const raw_items = Array.isArray(response.items) ? response.items as DocSearchApiItem[] : [ ]
    
    const items = raw_items.slice(0, MAX_ITEMS_PER_PAGE).map(item => ({
        title: to_text(item.title),
        content: to_text(item.content),
        url: resolve_dolphindb_doc_url(to_text(item.url)),
        score: typeof item.score === 'number' ? item.score : null,
    }))
    
    return {
        query,
        pageToShow: page,
        maxItemsPerPage: MAX_ITEMS_PER_PAGE,
        totalPage: typeof response.totalPage === 'number' ? response.totalPage : null,
        totalSearchItems: typeof response.totalSearchItems === 'number' ? response.totalSearchItems : null,
        items,
    }
}


export const doc_search_config: ScriptConfig = {
    function: 'doc_search',
    definition: {
        type: 'function',
        function: {
            name: 'doc_search',
            description: '搜索 DolphinDB 官方文档，返回匹配的文档列表',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '搜索关键词' },
                    page: { type: 'string', description: '页码，默认为 1' },
                },
                required: ['query'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const query = (args[0] || '').trim()
            const page = to_positive_int(args[1], DEFAULT_PAGE)
            
            if (!query)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'doc_search requires args[0] as search query.',
                    },
                }
            
            const response = await network_fetch(context, {
                method: 'POST',
                url: DDB_DOC_SEARCH_URL,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    pageToShow: page,
                    maxItemsPerPage: MAX_ITEMS_PER_PAGE,
                    language: 'zh',
                    version: '',
                }),
                timeoutMs: REQUEST_TIMEOUT_MS,
            })
            
            const raw = response.body || ''
            if (response.statusCode < 200 || response.statusCode >= 300)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: `doc_search failed (${response.statusCode}): ${raw || response.statusText}`,
                    },
                }
            
            let payload: unknown = null
            try { payload = raw ? JSON.parse(raw) : { } } catch {
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: `doc_search failed: response is not valid JSON: ${raw.slice(0, 200)}`,
                    },
                }
            }
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify(parse_search_response(payload, query, page)),
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
