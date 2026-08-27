import { t } from '@i18n'
import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    is_ddb_connection_error,
    normalize_script_args,
    tool_result_json,
} from './helpers.ts'
import type { ColdefColumn } from './helpers.ts'


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
            const columns: ColdefColumn[] = result.data().map((column: Record<string, unknown>) => ({
                name: String(column.name ?? ''),
                type: String(column.typeString ?? ''),
                ...(column.comment ? { comment: String(column.comment) } : { }),
                ...(column.sensitive ? { sensitive: true } : { }),
            }))
            const message_content = tool_result_json({
                ok: true,
                tool: type,
                columns,
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
            const is_conn = is_ddb_connection_error(error)
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
                        error: is_conn
                            ? t('DolphinDB 连接已断开，执行失败。')
                            : `coldefs failed: ${error instanceof Error ? error.message : String(error)}`,
                        hint: is_conn
                            ? t('DolphinDB 连接已断开，无法继续执行脚本。请停止调用任何工具，直接向用户总结已有信息或说明连接断开需要刷新页面。')
                            : '请检查表名/表句柄是否正确；如果不确定 DolphinDB 表引用方式，先查询文档或使用更小的探测脚本。',
                    }),
                },
            }
        }
    },
}
