import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    truncate_tool_content,
    format_ddb_script_error,
    format_result_with_print,
    uint8_to_base64,
} from './helpers.ts'


export const execute_config: ScriptConfig = {
    function: 'execute',
    definition: {
        type: 'function',
        function: {
            name: 'execute',
            description: '在 DolphinDB 中执行脚本代码，返回执行结果',
            parameters: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: '要执行的 DolphinDB 脚本代码' },
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
                        content: 'execute requires args[0] as SQL/script content.',
                    },
                }
            
            const result = await context.eval(script)
            const message_content = truncate_tool_content(
                format_result_with_print(result.data({ table: 'full' }), [ ])
            )
            
            let content_object: string | undefined
            try {
                content_object = uint8_to_base64(result.pack())
            } catch { }
            
            return {
                next_loop: true,
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
                    content: format_ddb_script_error('execute failed: ', error),
                },
            }
        }
    },
}
