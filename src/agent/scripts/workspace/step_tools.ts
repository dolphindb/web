import type { ScriptConfig, ScriptResult } from '@/agent/scripts/types.ts'
import {
    error_result,
    get_step_create_tasks,
    get_step_update_args,
    require_session,
    result_message,
} from './helpers.ts'


export const step_create_config: ScriptConfig = {
    function: 'step_create',
    definition: {
        type: 'function',
        function: {
            name: 'step_create',
            description: '为当前会话创建新的待办事项清单',
            parameters: {
                type: 'object',
                properties: {
                    tasks: { type: 'array', items: { type: 'string' }, description: '待办事项数组，每个元素是一条独立待办' },
                },
                required: ['tasks'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const tasks = get_step_create_tasks(content)
            await context.workspace_store.create_step_batch(require_session(context), context.api_fetch, tasks)
            return {
                next_loop: true,
                save_message: result_message(type, [
                    `Successfully created ${tasks.length} tasks and deactivated previous ones.`,
                    'TODO reminder: execute tasks in order. As soon as a task is finished, call step_update with checked=true. If all tasks become checked, call step_clear promptly.',
                ].join('\n')),
            }
        } catch (error) {
            return error_result(type, `step_create failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const step_update_config: ScriptConfig = {
    function: 'step_update',
    definition: {
        type: 'function',
        function: {
            name: 'step_update',
            description: '更新当前会话待办事项的完成状态',
            parameters: {
                type: 'object',
                properties: {
                    index: { type: 'number', description: '待办索引，从 0 开始' },
                    checked: { type: 'boolean', description: '是否已完成' },
                },
                required: ['index', 'checked'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { index, checked } = get_step_update_args(content)
            if (!Number.isInteger(index))
                throw new Error('Index must be a valid number.')
            await context.workspace_store.set_step_status_by_index(require_session(context), context.api_fetch, index, checked)
            const active_steps = await context.workspace_store.list_active_steps(require_session(context), context.api_fetch)
            const checked_count = active_steps.filter(step => step.checked).length
            const all_checked = active_steps.length > 0 && checked_count === active_steps.length
            return {
                next_loop: true,
                save_message: result_message(type, [
                    `Successfully updated task ${index} to ${checked ? 'checked' : 'unchecked'}.`,
                    all_checked
                        ? 'TODO reminder: all active tasks are checked. Call step_clear promptly if the user request is complete.'
                        : `TODO reminder: ${checked_count}/${active_steps.length} tasks checked. Continue with the next unchecked task and call step_update as soon as it is finished.`,
                ].join('\n')),
            }
        } catch (error) {
            return error_result(type, `step_update failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const step_clear_config: ScriptConfig = {
    function: 'step_clear',
    definition: {
        type: 'function',
        function: {
            name: 'step_clear',
            description: '清除当前会话的待办事项清单',
            parameters: {
                type: 'object',
                properties: { },
                required: [ ],
            },
        },
    },
    handler: async (type, _content, context): Promise<ScriptResult> => {
        try {
            await context.workspace_store.clear_steps(require_session(context), context.api_fetch)
            return {
                next_loop: true,
                save_message: result_message(type, 'Successfully deactivated all current tasks for this chat.'),
            }
        } catch (error) {
            return error_result(type, `step_clear failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}
