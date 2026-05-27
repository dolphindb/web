type ScriptPayloadObject = {
    args?: unknown
    content?: unknown
    script?: unknown
    table?: unknown
    query?: unknown
    page?: unknown
    url?: unknown
    max_chars?: unknown
    maxChars?: unknown
    tasks?: unknown
    index?: unknown
    checked?: unknown
}

function to_string_arg (value: unknown) {
    if (typeof value === 'string')
        return value
    if (value === null || value === undefined)
        return ''
    return String(value)
}


/** 将工具调用的 payload 规范化为字符串数组 (兼容多种格式) */
export function normalize_script_args (payload: unknown): string[] {
    if (Array.isArray(payload))
        return payload.map(to_string_arg)
    
    if (typeof payload === 'string') {
        const trimmed = payload.trim()
        if (!trimmed)
            return [ ]
        
        // 尝试解析 JSON 字符串（如 '["arg1","arg2"]' 或 '{"args":["arg1"]}'）
        if (
            (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
            (trimmed.startsWith('{') && trimmed.endsWith('}'))
        ) 
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed))
                    return parsed.map(to_string_arg)
                if (parsed && typeof parsed === 'object')
                    return normalize_script_args(parsed)
            } catch { }
        
        
        return [payload]
    }
    
    if (payload && typeof payload === 'object') {
        const obj = payload as ScriptPayloadObject
        
        if (Array.isArray(obj.args))
            return obj.args.map(to_string_arg)
        if (typeof obj.args === 'string')
            return obj.args.trim() ? [obj.args] : [ ]
        
        if (Array.isArray(obj.content))
            return obj.content.map(to_string_arg)
        if (typeof obj.content === 'string')
            return obj.content.trim() ? [obj.content] : [ ]
        
        if (typeof obj.script === 'string')
            return obj.script.trim() ? [obj.script] : [ ]
        
        if (typeof obj.table === 'string')
            return obj.table.trim() ? [obj.table] : [ ]
        
        if (typeof obj.query === 'string')
            return [
                obj.query,
                ...(obj.page !== undefined ? [to_string_arg(obj.page)] : [ ]),
            ].filter(item => item.trim())
        
        if (typeof obj.url === 'string')
            return [
                obj.url,
                ...(obj.max_chars !== undefined ? [to_string_arg(obj.max_chars)] : obj.maxChars !== undefined ? [to_string_arg(obj.maxChars)] : [ ]),
            ].filter(item => item.trim())
        
        if (Array.isArray(obj.tasks))
            return obj.tasks.map(to_string_arg)
        if (typeof obj.tasks === 'string')
            return obj.tasks.trim() ? [obj.tasks] : [ ]
        
        if (obj.index !== undefined)
            return [
                to_string_arg(obj.index),
                ...(obj.checked !== undefined ? [to_string_arg(obj.checked)] : [ ]),
            ].filter(item => item.trim())
    }
    
    return [ ]
}


const DEFAULT_TOOL_CONTENT_MAX_CHARS = 5000
const CONTENT_TRUNCATION_MARKER = '\n\n[内容过长，已截断]'

/** 截断工具输出内容，防止过长 */
export function truncate_tool_content (text: string, max_chars = DEFAULT_TOOL_CONTENT_MAX_CHARS): string {
    const safe_max = Number.isFinite(max_chars) && max_chars > 0 ? Math.trunc(max_chars) : DEFAULT_TOOL_CONTENT_MAX_CHARS
    if (text.length <= safe_max)
        return text
    
    if (safe_max <= CONTENT_TRUNCATION_MARKER.length)
        return text.slice(0, safe_max)
    
    const cutoff = safe_max - CONTENT_TRUNCATION_MARKER.length
    return `${text.slice(0, cutoff).trimEnd()}${CONTENT_TRUNCATION_MARKER}`
}


const DDB_ERROR_GUIDANCE = '建议查询文档获取准确的函数参考'

/** 格式化 DDB 脚本执行错误信息 */
export function format_ddb_script_error (prefix: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    return `${prefix}${message}。${DDB_ERROR_GUIDANCE}`
}


/** 将 DdbObj 结果序列化为 JSON 字符串 */
export function stringify_ddb_result (result: unknown): string {
    try {
        return JSON.stringify(result)
    } catch {
        return String(result)
    }
}


export type ToolResultEnvelope = {
    ok: boolean
    tool: string
    content?: string
    error?: string
    hint?: string
    harnessHint?: string
    returnedVoid?: boolean
    repeatedCall?: boolean
    resultType?: string
    resultCount?: number
    rowCount?: number | null
    preview?: unknown
    results?: unknown
}


export function tool_result_json (payload: ToolResultEnvelope): string {
    return JSON.stringify(payload)
}


export function append_tool_result_hint (content: string, hint: string): string {
    try {
        const payload = JSON.parse(content) as ToolResultEnvelope
        const existing = payload.harnessHint
        return tool_result_json({
            ...payload,
            harnessHint: existing ? `${existing}\n${hint}` : hint,
        })
    } catch {
        return content
    }
}


export function parse_tool_result_json (content: string): ToolResultEnvelope | null {
    try {
        const payload = JSON.parse(content)
        if (payload && typeof payload === 'object' && 'ok' in payload)
            return payload as ToolResultEnvelope
    } catch { }
    return null
}


export function is_structured_tool_result_helpful (content: string): boolean {
    const payload = parse_tool_result_json(content)
    if (!payload)
        return Boolean(content.trim())
    if (payload.repeatedCall || payload.returnedVoid || payload.ok === false)
        return false
    if (payload.tool === 'webSearch' && Number(payload.resultCount || 0) === 0)
        return false
    return Boolean(
        payload.content ||
        payload.results ||
        payload.preview ||
        payload.rowCount !== undefined
    )
}


export function infer_tool_result_type (value: unknown): string {
    if (value === null || value === undefined)
        return 'void'
    if (Array.isArray(value))
        return 'vector'
    if (typeof value === 'object')
        return 'object'
    return typeof value
}


/** 将 DdbObj 结果与 print 输出合并格式化 */
export function format_result_with_print (result: unknown, print_messages: string[]): string {
    if (print_messages.length === 0)
        return stringify_ddb_result(result)
    
    return stringify_ddb_result({
        result,
        print: print_messages,
    })
}


const EMPTY_DDB_RESULT = {
    success: true,
    message: '脚本执行成功，无返回值。',
}


function is_empty_ddb_result_error (error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes("Cannot read properties of undefined (reading 'length')")
}


export function format_ddb_eval_result (result: unknown, print_messages: string[] = [ ]): string {
    return format_ddb_eval_result_info(result, print_messages).content
}


export function format_ddb_eval_result_info (result: unknown, print_messages: string[] = [ ]): { content: string, returnedVoid: boolean, resultType: string } {
    if (result === null || result === undefined)
        return {
            content: format_result_with_print(EMPTY_DDB_RESULT, print_messages),
            returnedVoid: true,
            resultType: 'void',
        }
    
    const maybe_ddb_obj = result as { data?: unknown }
    if (typeof maybe_ddb_obj.data !== 'function')
        return {
            content: format_result_with_print(result, print_messages),
            returnedVoid: false,
            resultType: infer_tool_result_type(result),
        }
    
    try {
        const data = maybe_ddb_obj.data({ table: 'full' })
        const returned_void = data === null || data === undefined
        return {
            content: format_result_with_print(data ?? EMPTY_DDB_RESULT, print_messages),
            returnedVoid: returned_void,
            resultType: infer_tool_result_type(data),
        }
    } catch (error) {
        if (is_empty_ddb_result_error(error))
            return {
                content: format_result_with_print(EMPTY_DDB_RESULT, print_messages),
                returnedVoid: true,
                resultType: 'void',
            }
        throw error
    }
}


/** Uint8Array 转 base64（浏览器环境） */
export function uint8_to_base64 (bytes: Uint8Array): string {
    if (!bytes.length)
        return ''
    let binary = ''
    for (let i = 0;  i < bytes.length;  i++)
        binary += String.fromCharCode(bytes[i])
    return window.btoa(binary)
}
