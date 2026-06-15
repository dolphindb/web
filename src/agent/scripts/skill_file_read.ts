import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function decode_base64_utf8 (content: string): string {
    const binary = window.atob(content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0;  i < binary.length;  i++)
        bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
}


function parse_payload (content: unknown): unknown {
    if (typeof content !== 'string')
        return content
    const trimmed = content.trim()
    if (!trimmed)
        return content
    try {
        return JSON.parse(trimmed)
    } catch {
        return content
    }
}


function to_string_list (value: unknown): string[] {
    if (Array.isArray(value))
        return value.flatMap(to_string_list)
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed)
            return [ ]
        const parsed = parse_payload(trimmed)
        if (parsed !== trimmed)
            return to_string_list(parsed)
        return [trimmed]
    }
    if (value === null || value === undefined)
        return [ ]
    return [String(value).trim()].filter(Boolean)
}


function to_optional_int (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}


function get_skill_file_args (content: unknown): { skill_id: string, file_paths: string[], line_start?: number, line_limit?: number } {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    
    if (is_record(parsed)) {
        const skill_id = to_string_list(parsed.skill_id ?? parsed.skillId ?? args[0])[0] || ''
        const file_paths = to_string_list(
            parsed.file_paths ??
            parsed.filePaths ??
            parsed.file_path ??
            parsed.filePath ??
            parsed.paths ??
            args.slice(1)
        )
        return {
            skill_id,
            file_paths,
            line_start: to_optional_int(parsed.lineStart ?? parsed.line_start),
            line_limit: to_optional_int(parsed.lineLimit ?? parsed.line_limit),
        }
    }
    
    if (Array.isArray(parsed)) {
        const skill_id = to_string_list(parsed[0])[0] || ''
        return { skill_id, file_paths: to_string_list(parsed.slice(1)) }
    }
    
    return {
        skill_id: (args[0] || '').trim(),
        file_paths: args.slice(1).map(item => item.trim()).filter(Boolean),
    }
}


async function read_skill_file (context: Parameters<ScriptConfig['handler']>[2], skill_id: string, file_path: string, line_start?: number, line_limit?: number) {
    const search = new URLSearchParams({ filePath: file_path })
    if (line_start !== undefined)
        search.set('lineStart', String(line_start))
    if (line_limit !== undefined)
        search.set('lineLimit', String(line_limit))
    const result = await context.api_fetch(
        `/skill/${encodeURIComponent(skill_id)}/files/get?${search}`
    )
    const source_content = is_record(result) && typeof result.content === 'string' ? result.content : ''
    const source_encoding = is_record(result) && typeof result.encoding === 'string' ? result.encoding : ''
    const text = source_encoding.toLowerCase() === 'base64'
        ? decode_base64_utf8(source_content)
        : source_content
    return {
        ...(is_record(result) ? result : { }),
        filePath: is_record(result) && typeof result.filePath === 'string' ? result.filePath : file_path,
        encoding: 'text',
        sourceEncoding: source_encoding || undefined,
        content: text,
    }
}


export const skill_file_read_config: ScriptConfig = {
    function: 'skill_file_read',
    definition: {
        type: 'function',
        function: {
            name: 'skill_file_read',
            description: '读取指定 Skill 包内一个或多个文件的文本内容；Skill 包文件必须用本工具读取，不要用 vfs_read',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                    file_path: { type: 'string', description: '相对 Skill 包根目录的文件路径，不是工作区文件名；也可以用 file_paths 传多个路径' },
                },
                required: ['skill_id', 'file_path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { skill_id, file_paths, line_start, line_limit } = get_skill_file_args(content)
            if (!skill_id || file_paths.length === 0)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'skill_file_read requires skillId and at least one file path.',
                    },
                }
            
            const files = await Promise.all(file_paths.map(file_path => read_skill_file(context, skill_id, file_path, line_start, line_limit)))
            const message_content = stringify_ddb_result(files.length === 1
                ? files[0]
                : { skillId: skill_id, count: files.length, files })
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'skill_result',
                    name: type,
                    content: message_content,
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
                    content: `skill_file_read failed: ${message}`,
                },
            }
        }
    },
}
