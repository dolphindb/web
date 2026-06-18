import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    format_ddb_eval_result_info,
    TOOL_RESULT_SPILL_THRESHOLD_CHARS,
    tool_result_json,
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
                        content: tool_result_json({
                            ok: false,
                            tool: type,
                            error: 'execute requires args[0] as SQL/script content.',
                            hint: '请传入要执行的 DolphinDB 脚本，并确保最后一行返回可用于回答用户的问题。',
                        }),
                    },
                }
            
            const print_messages: string[] = [ ]
            const result = await context.eval(script, {
                listener: message => {
                    if (message.type === 'print')
                        print_messages.push(String(message.data))
                },
            })
            const result_info = format_ddb_eval_result_info(result, print_messages)
            const message_content = tool_result_json({
                ok: true,
                tool: type,
                returnedVoid: result_info.returnedVoid,
                resultType: result_info.resultType,
                ...(print_messages.length ? { print: print_messages } : { }),
                content: result_info.content,
                hint: result_info.returnedVoid
                    ? '脚本执行成功但没有最终返回值；如果需要继续推理，请让最后一行返回表、字典、字符串或标量。'
                    : undefined,
            })
            
            let content_object: string | undefined
            if (result_info.content.length <= TOOL_RESULT_SPILL_THRESHOLD_CHARS) 
                try {
                    content_object = uint8_to_base64(result.pack())
                } catch (e) {
                    console.warn('[ai] execute: result.pack() failed:', e)
                }
            
            
            return {
                next_loop: true,
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
                    content: tool_result_json({
                        ok: false,
                        tool: type,
                        error: `execute failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: '请修正 DolphinDB 语法或 API 用法后再试；如果函数名或参数不确定，先查询官方文档，不要反复猜测。',
                    }),
                },
            }
        }
    },
}
