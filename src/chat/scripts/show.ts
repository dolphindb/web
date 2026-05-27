import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    format_ddb_eval_result_info,
    tool_result_json,
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
                        content: tool_result_json({
                            ok: false,
                            tool: type,
                            error: 'show requires args[0] as SQL/script content.',
                            hint: '请传入要展示的 DolphinDB 查询脚本。',
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
                content: result_info.returnedVoid ? '展示成功，但脚本没有最终返回值。' : '展示成功，数据已进入结果视图。',
                hint: result_info.returnedVoid
                    ? '脚本执行成功但没有最终返回值；如果需要展示结构化结果，请让最后一行返回需要展示的值。'
                    : undefined,
            })
            
            let content_object: string | undefined
            try {
                content_object = uint8_to_base64(result.pack())
            } catch (e) {
                console.warn('[ai] show: result.pack() failed:', e)
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
                        error: `show failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: '请修正 DolphinDB 查询脚本后再试；如果函数或参数不确定，先查询官方文档，不要反复猜测。',
                    }),
                },
            }
        }
    },
}
