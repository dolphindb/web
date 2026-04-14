import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    format_ddb_script_error,
    stringify_ddb_result,
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
                        content: 'testsql requires args[0] as table handle expression.',
                    },
                }
            
            const result = await context.eval(`select * from ${tbhandle} limit 5`)
            const message_content = stringify_ddb_result(result.data({ table: 'full' }))
            
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
                    content: format_ddb_script_error('testsql failed: ', error),
                },
            }
        }
    },
}
