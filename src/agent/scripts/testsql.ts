import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
    tool_result_json,
} from './helpers.ts'


export const testsql_config: ScriptConfig = {
    function: 'testsql',
    definition: {
        type: 'function',
        function: {
            name: 'testsql',
            description: '在 DolphinDB 中测试 SQL 查询，返回前 5 行样例数据以验证查询正确性',
            parameters: {
                type: 'object',
                properties: {
                    table: { type: 'string', description: '表名或 SQL 查询表达式' },
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
                            error: 'testsql requires args[0] as table handle expression.',
                            hint: '请传入表名或查询表达式，例如 catalog.schema.table 或 loadTable("dfs://db", "tb")。',
                        }),
                    },
                }
            
            const result = await context.eval(`select * from ${tbhandle} limit 5`)
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
                        error: `testsql failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: '请检查表名或 SQL 是否正确；如果函数或表引用方式不确定，先查询官方文档或运行更小的探测脚本。',
                    }),
                },
            }
        }
    },
}
