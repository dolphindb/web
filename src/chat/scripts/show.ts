import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    truncate_tool_content,
    format_ddb_script_error,
    format_result_with_print,
    uint8_to_base64,
} from './helpers.ts'


export const show_config: ScriptConfig = {
    function: 'show',
    definition: {
        type: 'function',
        function: {
            name: 'show',
            description: '在 DolphinDB 中执行查询并展示完整结果给用户，不再继续推理',
            parameters: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: '要执行的 DolphinDB 查询脚本' },
                },
                required: ['script'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const script = args[0] || ''
            if (!script)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'show requires args[0] as SQL/script content.',
                    },
                }
            
            const result = await context.eval(script)
            const message_content = truncate_tool_content(
                format_result_with_print(result.data({ table: 'full' }), [ ])
            )
            
            let content_object: string | undefined
            try {
                content_object = uint8_to_base64(result.pack())
            } catch (e) {
                console.warn('[ai] show: result.pack() failed:', e)
            }
            
            return {
                // show 不继续循环，直接展示结果给用户
                next_loop: false,
                ddb_result: result,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: message_content,
                    content_object,
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
                    content: format_ddb_script_error('show failed: ', error),
                },
            }
        }
    },
}
