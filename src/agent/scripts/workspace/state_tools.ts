import type { ScriptConfig, ScriptResult } from '@/agent/scripts/types.ts'
import {
    error_result,
    get_state_update_args,
    require_workspace,
    result_message,
} from './helpers.ts'


export const workspace_state_read_config: ScriptConfig = {
    function: 'workspace_state_read',
    definition: {
        type: 'function',
        function: {
            name: 'workspace_state_read',
            description: '读取当前会话工作区状态文本',
            parameters: {
                type: 'object',
                properties: { },
                required: [ ],
            },
        },
    },
    handler: async (type, _content, context): Promise<ScriptResult> => {
        try {
            const workspace = await context.workspace_store.get_workspace(require_workspace(context), context.api_fetch)
            return {
                next_loop: true,
                save_message: result_message(type, workspace?.current_state || '暂无状态记录'),
            }
        } catch (error) {
            return error_result(type, `workspace_state_read 执行失败：${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const workspace_state_update_config: ScriptConfig = {
    function: 'workspace_state_update',
    definition: {
        type: 'function',
        function: {
            name: 'workspace_state_update',
            description: '通过精确字符串替换更新当前会话工作区状态文本',
            parameters: {
                type: 'object',
                properties: {
                    old_string: { type: 'string', description: '要替换的原状态片段；为空时追加' },
                    new_string: { type: 'string', description: '新状态片段' },
                },
                required: ['old_string', 'new_string'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { old_string, new_string } = get_state_update_args(content)
            const workspace = await context.workspace_store.get_workspace(require_workspace(context), context.api_fetch)
            
            const current_state = workspace.current_state || ''
            let update_mode = 'replace'
            let updated_state = ''
            if (!current_state) {
                updated_state = new_string
                update_mode = 'initialize'
            } else if (!old_string) {
                updated_state = `${current_state}\n\n${new_string}`
                update_mode = 'append_without_old_string'
            } else if (!current_state.includes(old_string)) {
                updated_state = `${current_state}\n\n${new_string}`
                update_mode = 'append_when_old_string_not_found'
            } else
                updated_state = current_state.replace(old_string, new_string)
            
            await context.workspace_store.update_workspace_state(require_workspace(context), context.api_fetch, updated_state)
            return {
                next_loop: true,
                save_message: result_message(
                    type,
                    `工作区状态已更新。workspaceId=${require_workspace(context)}，更新方式=${update_mode}，beforeLen=${current_state.length}，afterLen=${updated_state.length}。`
                ),
            }
        } catch (error) {
            return error_result(type, `workspace_state_update 执行失败：${error instanceof Error ? error.message : String(error)}`)
        }
    },
}
