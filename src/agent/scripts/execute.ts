import {
    spill_large_tool_result_content_if_needed,
    spill_large_tool_result_print_if_needed,
} from '@/agent/tool_result_spill.ts'

import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    format_ddb_eval_result_info,
    tool_result_json,
    uint8_to_base64,
} from './helpers.ts'
import { virtual_copy_hint } from './vfs_paths.ts'


export const execute_config: ScriptConfig = {
    function: 'execute',
    definition: {
        type: 'function',
        function: {
            name: 'execute',
            description: '在 DolphinDB 中执行脚本代码，将最后一行的结果返回给助手继续推理；中间表达式结果不会自动返回，如需多个结果请组合后在最后一行返回',
            parameters: {
                type: 'object',
                properties: {
                    script: { type: 'string', description: '要执行的 DolphinDB 脚本代码；最后一行必须是可求值内容，不能是赋值或控制语句' },
                },
                required: ['script'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        const print_messages: string[] = [ ]
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
            const copy_hint = virtual_copy_hint(script)
            if (copy_hint)
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
                            error: 'virtual file copy is not a DolphinDB script operation.',
                            hint: copy_hint,
                        }),
                    },
                }
            
            const result = await context.eval(script, {
                listener: message => {
                    if (message.type === 'print')
                        print_messages.push(String(message.data))
                },
            })
            const result_info = format_ddb_eval_result_info(result)
            const [result_content, result_print] = await Promise.all([
                spill_large_tool_result_content_if_needed(result_info.content, type, context),
                spill_large_tool_result_print_if_needed(print_messages, type, context),
            ])
            const message_content = tool_result_json({
                ok: true,
                tool: type,
                returnedVoid: result_info.returnedVoid,
                resultType: result_info.resultType,
                ...(result_print.length ? { print: result_print } : { }),
                content: result_content,
                hint: result_info.returnedVoid
                    ? '脚本执行成功但没有最终返回值；如果需要继续推理，请让最后一行返回表、字典、字符串或标量。'
                    : undefined,
            })
            
            let content_object: string | undefined
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
            const result_print = await spill_large_tool_result_print_if_needed(print_messages, type, context)
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
                        ...(result_print.length ? { print: result_print } : { }),
                        error: `execute failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: `${result_print.length ? 'print 为脚本报错前已产生的部分诊断输出。' : ''}请修正 DolphinDB 语法或 API 用法后再试；如果函数名或参数不确定，先查询官方文档，不要反复猜测。`,
                    }),
                },
            }
        }
    },
}
