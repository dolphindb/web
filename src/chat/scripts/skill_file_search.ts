import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function parse_payload (content: unknown): unknown {
    if (typeof content !== 'string')
        return content
    const trimmed = content.trim()
    if (!trimmed)
        return content
    try { return JSON.parse(trimmed) } catch { return content }
}


function to_optional_int (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}


function to_string_array (value: unknown): string[] | undefined {
    if (Array.isArray(value))
        return value.map(item => String(item).trim()).filter(Boolean)
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed)
            return undefined
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed))
                return parsed.map(item => String(item).trim()).filter(Boolean)
        } catch { }
        return trimmed.split(',').map(item => item.trim()).filter(Boolean)
    }
    return undefined
}


function get_search_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    const body: Record<string, unknown> = { }
    const skill_id = is_record(parsed)
        ? String(parsed.skill_id ?? parsed.skillId ?? args[0] ?? '').trim()
        : (args[0] || '').trim()
    
    if (is_record(parsed)) {
        if (parsed.query)
            body.query = String(parsed.query)
        const all = to_string_array(parsed.all)
        if (all?.length)
            body.all = all
        const any = to_string_array(parsed.any)
        if (any?.length)
            body.any = any
        if (parsed.scope)
            body.scope = String(parsed.scope)
        if (parsed.caseSensitive !== undefined)
            body.caseSensitive = parsed.caseSensitive === true || String(parsed.caseSensitive).toLowerCase() === 'true'
        const filePaths = to_string_array(parsed.filePaths ?? parsed.file_paths)
        if (filePaths?.length)
            body.filePaths = filePaths
        const extensions = to_string_array(parsed.extensions)
        if (extensions?.length)
            body.extensions = extensions
        const contextLines = to_optional_int(parsed.contextLines ?? parsed.context_lines)
        if (contextLines !== undefined)
            body.contextLines = contextLines
        const maxResults = to_optional_int(parsed.maxResults ?? parsed.max_results)
        if (maxResults !== undefined)
            body.maxResults = maxResults
        const maxPerFile = to_optional_int(parsed.maxPerFile ?? parsed.max_per_file)
        if (maxPerFile !== undefined)
            body.maxPerFile = maxPerFile
    } else
        body.query = args[1] || ''
    
    return { skill_id, body }
}


export const skill_file_search_config: ScriptConfig = {
    function: 'skill_file_search',
    definition: {
        type: 'function',
        function: {
            name: 'skill_file_search',
            description: '检索指定 Skill 包内的文本文件，按字面量子串匹配，不支持 regex',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                    query: { type: 'string', description: '单个搜索词；query、all、any 必须且只能提供一个' },
                    all: { type: 'array', description: '多个搜索词全部匹配才命中；query、all、any 必须且只能提供一个' },
                    any: { type: 'array', description: '多个搜索词任意匹配即命中；query、all、any 必须且只能提供一个' },
                    scope: { type: 'string', description: '可选，file 或 line，默认 file' },
                    caseSensitive: { type: 'boolean', description: '可选，是否大小写敏感，默认 false' },
                    filePaths: { type: 'array', description: '可选，限定 Skill 包内相对路径列表' },
                    extensions: { type: 'array', description: '可选，限定文件后缀，如 .md、.json、.dos' },
                    contextLines: { type: 'number', description: '可选，命中行前后的上下文行数' },
                    maxResults: { type: 'number', description: '可选，返回命中总数上限' },
                    maxPerFile: { type: 'number', description: '可选，每个文件返回命中数上限' },
                },
                required: ['skill_id'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { skill_id, body } = get_search_args(content)
            const modes = ['query', 'all', 'any'].filter(key => {
                const value = body[key]
                return Array.isArray(value) ? value.length > 0 : Boolean(value)
            })
            if (!skill_id || modes.length !== 1)
                throw new Error('skill_file_search requires skill_id and exactly one of query, all, or any.')
            
            const result = await context.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/search`, {
                method: 'POST',
                body: JSON.stringify(body),
            })
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'skill_result',
                    name: type,
                    content: stringify_ddb_result(result),
                },
            }
        } catch (error) {
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: type,
                    content: `skill_file_search failed: ${error instanceof Error ? error.message : String(error)}`,
                },
            }
        }
    },
}
