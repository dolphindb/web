import type { IMessage } from '@/agent/model/types.ts'
import {
    parse_tool_result_json,
    tool_result_json,
    TOOL_RESULT_SPILL_THRESHOLD_CHARS,
} from '@/agent/scripts/helpers.ts'
import type { ToolContext } from '@/agent/scripts/types.ts'
import type { ParsedToolCall } from '@/agent/tool_call_parser.ts'


const TOOL_RESULT_PREVIEW_CHARS = 2000


function hash_string (value: string) {
    let hash = 0x811c9dc5
    for (let index = 0;  index < value.length;  index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}


function sanitize_id (value: string) {
    const sanitized = value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20)
    return sanitized || 'tool'
}


function tool_result_file_name (message: IMessage, parsed_call: ParsedToolCall, persisted_content: string) {
    const id = parsed_call.id || message.tool_call_id || message.msgId || parsed_call.type
    return `tool_result_${sanitize_id(id)}_${hash_string(`${id}:${persisted_content}`)}.txt`
}


function decode_json_string_layers (value: string) {
    let current = value.trim()
    for (let index = 0;  index < 2 && current.startsWith('"');  index += 1) 
        try {
            const decoded = JSON.parse(current)
            if (typeof decoded !== 'string' || decoded === current)
                break
            current = decoded.trim()
        } catch {
            break
        }
    
    return current
}


function pretty_json_or_original (value: string) {
    const decoded = decode_json_string_layers(value)
    const trimmed = decoded.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
        return decoded
    try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
        return decoded
    }
}


function stringify_payload_value (value: unknown) {
    if (typeof value === 'string')
        return pretty_json_or_original(value)
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}


function generic_json_content_or_null (content: string) {
    const decoded = decode_json_string_layers(content)
    const trimmed = decoded.trim()
    if (!trimmed.startsWith('{'))
        return null
    try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
            const obj = parsed as Record<string, unknown>
            const metadata = ['name', 'path', 'lineCount', 'startLine', 'endLine', 'hash']
                .filter(key => obj[key] !== undefined)
                .map(key => `${key}: ${String(obj[key])}`)
            const body = pretty_json_or_original(parsed.content)
            return metadata.length
                ? `${metadata.join('\n')}\n\ncontent:\n${body}`
                : body
        }
    } catch { }
    return null
}


function persisted_content_from_tool_result (content: string) {
    const payload = parse_tool_result_json(content)
    if (!payload)
        return generic_json_content_or_null(content) ?? pretty_json_or_original(content)
    if (typeof payload.content === 'string')
        return pretty_json_or_original(payload.content)
    if (payload.results !== undefined)
        return stringify_payload_value(payload.results)
    if (payload.preview !== undefined)
        return stringify_payload_value(payload.preview)
    return pretty_json_or_original(content)
}


function preview_of (content: string) {
    return content.slice(0, TOOL_RESULT_PREVIEW_CHARS)
}


function build_persisted_reference (original_chars: number, persisted_chars: number, file: string, preview: string) {
    return [
        '<persisted-output>',
        `Tool result too large: ${original_chars} chars. Full output saved to current workspace file: ${file}`,
        `Persisted content size: ${persisted_chars} chars.`,
        '',
        'Do not read the entire file in one call. Use vfs_search to find relevant text, or use vfs_read with startLine/endLine to read selected line ranges.',
        'When reading sequentially, read at most 200 lines per call. vfs_read returns lineCount/startLine/endLine/hash; use those fields to decide the next range.',
        '',
        'Preview:',
        preview,
        '</persisted-output>',
    ].join('\n')
}


function build_persist_failed_reference (original_chars: number, error: unknown, preview: string) {
    return [
        '<persisted-output>',
        `Tool result too large: ${original_chars} chars, but saving it to the workspace failed: ${error instanceof Error ? error.message : String(error)}`,
        'Only the preview below is available.',
        '',
        'Preview:',
        preview,
        '</persisted-output>',
    ].join('\n')
}


function replace_tool_result_content (
    original_content: string,
    reference: string,
    file: string | undefined,
    original_chars: number,
    persisted_chars: number,
    persisted: boolean,
    error?: unknown,
) {
    const payload = parse_tool_result_json(original_content)
    if (!payload)
        return reference
    return tool_result_json({
        ...payload,
        content: reference,
        toolResultPersisted: persisted,
        ...(file ? { toolResultFile: file } : { }),
        toolResultOriginalLength: original_chars,
        toolResultPersistedLength: persisted_chars,
        ...(error ? { toolResultPersistError: error instanceof Error ? error.message : String(error) } : { }),
    })
}


export async function spill_large_tool_result_if_needed (
    message: IMessage,
    parsed_call: ParsedToolCall,
    context: ToolContext,
): Promise<IMessage> {
    if (
        message.role !== 'tool' ||
        message.messageType !== 'tool_result' ||
        message.content.length <= TOOL_RESULT_SPILL_THRESHOLD_CHARS
    )
        return message
        
    const original_content = message.content
    const persisted_content = persisted_content_from_tool_result(original_content)
    const preview = preview_of(persisted_content)
    const file = tool_result_file_name(message, parsed_call, persisted_content)
    
    try {
        await context.workspace_store.write_file(context.session_id, context.api_fetch, file, persisted_content)
        const reference = build_persisted_reference(original_content.length, persisted_content.length, file, preview)
        return {
            ...message,
            content: replace_tool_result_content(
                original_content,
                reference,
                file,
                original_content.length,
                persisted_content.length,
                true,
            ),
            content_object: undefined,
        }
    } catch (error) {
        const reference = build_persist_failed_reference(original_content.length, error, preview)
        return {
            ...message,
            content: replace_tool_result_content(
                original_content,
                reference,
                undefined,
                original_content.length,
                persisted_content.length,
                false,
                error,
            ),
            content_object: undefined,
        }
    }
}
