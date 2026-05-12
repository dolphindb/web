import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
    tool_result_json,
} from './helpers.ts'


export const coldefs_config: ScriptConfig = {
    function: 'coldefs',
    definition: {
        type: 'function',
        function: {
            name: 'coldefs',
            description: '获取 DolphinDB 表的列定义（schema），返回字段名、类型等结构信息',
            parameters: {
                type: 'object',
                properties: {
                    table: { type: 'string', description: '表名或表句柄表达式' },
                },
                required: ['table'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const tbhandle = args[0] || ''
            if (!tbhandle)
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
                            error: 'coldefs requires args[0] as table handle expression.',
                            hint: '请传入表名或表句柄表达式，例如 catalog.schema.table 或 loadTable("dfs://db", "tb")。',
                        }),
                    },
                }
            
            const result = await context.eval(`schema(${tbhandle})['colDefs']`)
            const message_content = tool_result_json({
                ok: true,
                tool: type,
                resultType: 'table',
                content: stringify_ddb_result(result.data({ table: 'full' })),
            })
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: message_content,
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
                        error: `coldefs failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: '请检查表名/表句柄是否正确；如果不确定 DolphinDB 表引用方式，先查询文档或使用更小的探测脚本。',
                    }),
                },
            }
        }
    },
}
