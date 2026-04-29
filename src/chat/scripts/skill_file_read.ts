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


export const skill_file_read_config: ScriptConfig = {
    function: 'skill_file_read',
    definition: {
        type: 'function',
        function: {
            name: 'skill_file_read',
            description: '读取指定 Skill 包内文件的文本内容',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                    file_path: { type: 'string', description: '相对 Skill 包根目录的文件路径' },
                },
                required: ['skill_id', 'file_path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const skill_id = (args[0] || '').trim()
            const file_path = (args[1] || '').trim()
            if (!skill_id || !file_path)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'skill_file_read requires args[0] as skillId and args[1] as filePath.',
                    },
                }
            
            const result = await context.api_fetch(
                `/skill/${encodeURIComponent(skill_id)}/files/get?filePath=${encodeURIComponent(file_path)}`
            )
            const source_content = is_record(result) && typeof result.content === 'string' ? result.content : ''
            const source_encoding = is_record(result) && typeof result.encoding === 'string' ? result.encoding : ''
            const text = source_encoding.toLowerCase() === 'base64'
                ? decode_base64_utf8(source_content)
                : source_content
            const message_content = stringify_ddb_result({
                ...(is_record(result) ? result : { }),
                encoding: 'text',
                sourceEncoding: source_encoding || undefined,
                content: text,
            })
            
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
