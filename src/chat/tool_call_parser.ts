/** 从 LLM 文本回复中解析工具调用 (text-based tool calling) */


export type ParsedToolCall = {
    type: string
    payload: unknown
}


// ─── JSON 解析工具 ───

function parse_object_json (text: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
            return parsed as Record<string, unknown>
        return null
    } catch {
        return null
    }
}


function parse_maybe_json (value: unknown): unknown {
    if (typeof value !== 'string')
        return value
    
    const trimmed = value.trim()
    if (!trimmed)
        return trimmed
    
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try { return JSON.parse(trimmed) } catch { return value }
    }
    
    return value
}


// ─── 从文本中提取 JSON 候选 ───

function extract_code_block_json_candidates (text: string): string[] {
    const regex = /```(?:json)?\s*([\s\S]*?)```/gi
    const candidates: string[] = [ ]
    let match: RegExpExecArray | null = null
    
    while ((match = regex.exec(text)) !== null) {
        const candidate = match[1]?.trim()
        if (candidate)
            candidates.push(candidate)
    }
    
    return candidates
}


function extract_first_balanced_json_object (text: string): string | null {
    let start = -1
    let depth = 0
    let in_string = false
    let escape = false
    
    for (let index = 0;  index < text.length;  index += 1) {
        const ch = text[index]
        
        if (escape) {
            escape = false
            continue
        }
        
        if (ch === '\\') {
            escape = true
            continue
        }
        
        if (ch === '"') {
            in_string = !in_string
            continue
        }
        
        if (in_string)
            continue
        
        if (ch === '{') {
            if (start < 0)
                start = index
            depth += 1
            continue
        }
        
        if (ch === '}' && depth > 0) {
            depth -= 1
            if (depth === 0 && start >= 0)
                return text.slice(start, index + 1)
        }
    }
    
    return null
}


// ─── 从对象中解析工具调用 ───

function parse_tool_call_from_object (obj: Record<string, unknown>): ParsedToolCall | null {
    // {"tool_call": "name", "args": [...]}
    const tool_call = obj.tool_call
    if (typeof tool_call === 'string' && tool_call.trim())
        return {
            type: tool_call.trim(),
            payload: obj.args ?? obj.content ?? [ ],
        }
    
    // {"function": "name", "args": [...]}
    const function_name = obj.function
    if (typeof function_name === 'string' && function_name.trim())
        return {
            type: function_name.trim(),
            payload: obj.args ?? obj.arguments ?? [ ],
        }
    
    // {"tool": "name", "args": [...]}
    const tool_name = obj.tool
    if (typeof tool_name === 'string' && tool_name.trim())
        return {
            type: tool_name.trim(),
            payload: obj.args ?? obj.arguments ?? { },
        }
    
    // {"function_call": {"name": "...", "arguments": "..."}}
    const function_call = obj.function_call
    if (function_call && typeof function_call === 'object' && !Array.isArray(function_call)) {
        const name = (function_call as { name?: unknown }).name
        if (typeof name === 'string' && name.trim()) {
            const args = (function_call as { arguments?: unknown }).arguments
            return {
                type: name.trim(),
                payload: parse_maybe_json(args ?? [ ]),
            }
        }
    }
    
    return null
}


// ─── 从文本中解析工具调用 ───

function parse_tool_call_from_text (text: string): ParsedToolCall | null {
    const candidates = [
        ...extract_code_block_json_candidates(text),
        text.trim(),
        extract_first_balanced_json_object(text) ?? '',
    ].filter(Boolean)
    
    for (const candidate of candidates) {
        const parsed = parse_object_json(candidate)
        if (!parsed)
            continue
        
        const parsed_tool_call = parse_tool_call_from_object(parsed)
        if (parsed_tool_call)
            return parsed_tool_call
    }
    
    return null
}


// ─── 主入口：同时支持 function calling 和文本解析 ───

export type CompletionToolCalls = Array<{
    function?: { name?: string, arguments?: string }
}>

export function parse_tool_call (
    tool_calls: CompletionToolCalls | undefined,
    content: string,
): ParsedToolCall | null {
    // 优先从 function calling 格式解析（兼容支持 function calling 的模型）
    if (Array.isArray(tool_calls) && tool_calls.length > 0) {
        const first = tool_calls[0]
        if (first?.function) {
            const name = first.function.name
            if (typeof name === 'string' && name.trim())
                return {
                    type: name.trim(),
                    payload: parse_maybe_json(first.function.arguments ?? [ ]),
                }
        }
    }
    
    // 从文本内容中解析
    return parse_tool_call_from_text(content)
}
