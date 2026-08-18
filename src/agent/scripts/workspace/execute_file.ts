import type { ScriptConfig, ScriptResult } from '@/agent/scripts/types.ts'
import {
    WORKSPACE_FILE_NAME_RULE,
    format_ddb_eval_result_info,
    get_named_arg,
    require_workspace,
    result_message,
    spill_large_tool_result_content_if_needed,
    spill_large_tool_result_print_if_needed,
    tool_result_json,
    uint8_to_base64,
} from './helpers.ts'


export const execute_file_config: ScriptConfig = {
    function: 'execute_file',
    definition: {
        type: 'function',
        function: {
            name: 'execute_file',
            description: '执行当前会话工作区 /home/workspace 中的 DolphinDB 脚本文件，将最后一行的结果返回给助手继续推理；中间表达式结果不会自动返回，如需多个结果请组合后在最后一行返回',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: `脚本${WORKSPACE_FILE_NAME_RULE}` },
                },
                required: ['name'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        const print_messages: string[] = [ ]
        try {
            const path = get_named_arg(content)
            const file = await context.workspace_store.get_file(require_workspace(context), context.api_fetch, path)
            if (!file)
                throw new Error(`File not found: ${path.replace(/^\/+/, '')}`)
            if (!file.content.trim())
                return {
                    next_loop: true,
                    save_message: result_message(type, 'File is empty, nothing to execute.'),
                }
            
            const result = await context.eval(file.content, {
                listener: message => {
                    if (message.type === 'print')
                        print_messages.push(String(message.data))
                },
            })
            const result_info = format_ddb_eval_result_info(result)
            let content_object: string | undefined
            try { content_object = uint8_to_base64(result.pack()) } catch { }
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
            })
            return {
                next_loop: true,
                ddb_result: result,
                save_message: result_message(type, message_content, content_object),
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
                        error: `execute_file failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: `${result_print.length ? 'print 为脚本报错前已产生的部分诊断输出。' : ''}请修正 DolphinDB 语法或 API 用法后再试；如果函数名或参数不确定，先查询官方文档，不要反复猜测。`,
                    }),
                },
            }
        }
    },
}
