type ScriptPayloadObject = {
    args?: unknown
    content?: unknown
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


/** 将 DdbObj 结果与 print 输出合并格式化 */
export function format_result_with_print (result: unknown, print_messages: string[]): string {
    if (print_messages.length === 0)
        return stringify_ddb_result(result)
    
    return stringify_ddb_result({
        result,
        print: print_messages,
    })
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
