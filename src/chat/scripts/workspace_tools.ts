import type { IMessage } from '@/chat/model.ts'

import type { ScriptConfig, ScriptResult, ToolContext } from './types.ts'
import {
    normalize_script_args,
    format_ddb_eval_result_info,
    truncate_tool_content,
    tool_result_json,
    uint8_to_base64,
} from './helpers.ts'


function result_message (type: string, content: string, content_object?: unknown): IMessage {
    return {
        msgId: `tool_${Date.now()}`,
        role: 'tool',
        messageType: 'tool_result',
        name: type,
        content,
        content_object,
    }
}


function error_result (type: string, message: string): ScriptResult {
    return {
        next_loop: true,
        save_message: {
            msgId: `tool_${Date.now()}`,
            role: 'tool',
            messageType: 'tool_error',
            name: type,
            content: message,
        },
    }
}


function require_workspace (context: ToolContext) {
    if (!context.workspace_id)
        throw new Error('No workspace selected.')
    return context.workspace_id
}


function require_session (context: ToolContext) {
    if (!context.session_id)
        throw new Error('No session selected.')
    return context.session_id
}


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function parse_payload (content: unknown): unknown {
    if (typeof content !== 'string')
        return content
    const trimmed = content.trim()
    if (!trimmed)
        return content
    try { return JSON.parse(trimmed) } catch { return content }
}


function decode_base64_utf8 (content: string): string {
    const binary = window.atob(content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0;  i < binary.length;  i++)
        bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
}


function get_copy_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return {
            skill_id: String(parsed.skill_id ?? parsed.skillId ?? args[0] ?? '').trim(),
            file_path: String(parsed.file_path ?? parsed.filePath ?? args[1] ?? '').trim(),
            target_path: String(parsed.target_path ?? parsed.targetPath ?? args[2] ?? parsed.file_path ?? parsed.filePath ?? args[1] ?? '').trim(),
            overwrite: parsed.overwrite === true || String(parsed.overwrite ?? args[3] ?? '').toLowerCase() === 'true',
        }
    return {
        skill_id: (args[0] || '').trim(),
        file_path: (args[1] || '').trim(),
        target_path: (args[2] || args[1] || '').trim(),
        overwrite: String(args[3] || '').toLowerCase() === 'true',
    }
}


export const vfs_list_config: ScriptConfig = {
    function: 'vfs_list',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_list',
            description: '列出当前工作区中的虚拟文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '可选，文件路径或目录前缀' },
                },
                required: [ ],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const files = await context.workspace_store.list_files(require_workspace(context), args[0] || '')
            return {
                next_loop: true,
                save_message: result_message(type, files.map(file => file.path).join('\n') || 'No files found.'),
            }
        } catch (error) {
            return error_result(type, `vfs_list failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_create_config: ScriptConfig = {
    function: 'vfs_create',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_create',
            description: '在当前工作区创建代码文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '文件路径' },
                    content: { type: 'string', description: '文件内容' },
                },
                required: ['path', 'content'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const path = args[0] || ''
            await context.workspace_store.create_file(require_workspace(context), path, args[1] || '')
            return {
                next_loop: true,
                save_message: result_message(type, `File created successfully: ${path.replace(/^\/+/, '')}`),
            }
        } catch (error) {
            return error_result(type, `vfs_create failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_read_config: ScriptConfig = {
    function: 'vfs_read',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_read',
            description: '读取当前工作区中的代码文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '文件路径' },
                },
                required: ['path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const path = normalize_script_args(content)[0] || ''
            const file = await context.workspace_store.get_file(require_workspace(context), path)
            if (!file)
                throw new Error(`File not found: ${path.replace(/^\/+/, '')}`)
            return {
                next_loop: true,
                save_message: result_message(type, file.content || ''),
            }
        } catch (error) {
            return error_result(type, `vfs_read failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_update_config: ScriptConfig = {
    function: 'vfs_update',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_update',
            description: '用精确字符串替换更新当前工作区中的代码文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '文件路径' },
                    old_string: { type: 'string', description: '要替换的原字符串' },
                    new_string: { type: 'string', description: '替换后的新字符串' },
                },
                required: ['path', 'old_string', 'new_string'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const [path, old_string, new_string] = args
            const file = await context.workspace_store.get_file(require_workspace(context), path || '')
            if (!file)
                throw new Error(`File not found: ${(path || '').replace(/^\/+/, '')}`)
            if (!file.content.includes(old_string || ''))
                throw new Error('The specified old_string was not found in the file.')
            await context.workspace_store.update_file_content(context.workspace_id, path || '', file.content.replace(old_string || '', new_string || ''))
            return {
                next_loop: true,
                save_message: result_message(type, `File updated successfully: ${(path || '').replace(/^\/+/, '')}`),
            }
        } catch (error) {
            return error_result(type, `vfs_update failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_delete_config: ScriptConfig = {
    function: 'vfs_delete',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_delete',
            description: '删除当前工作区中的代码文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '文件路径' },
                },
                required: ['path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const path = normalize_script_args(content)[0] || ''
            await context.workspace_store.delete_file(require_workspace(context), path)
            return {
                next_loop: true,
                save_message: result_message(type, `File deleted successfully: ${path.replace(/^\/+/, '')}`),
            }
        } catch (error) {
            return error_result(type, `vfs_delete failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const execute_file_config: ScriptConfig = {
    function: 'execute_file',
    definition: {
        type: 'function',
        function: {
            name: 'execute_file',
            description: '执行当前工作区中的 DolphinDB 脚本文件',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: '脚本文件路径' },
                },
                required: ['path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const path = normalize_script_args(content)[0] || ''
            const file = await context.workspace_store.get_file(require_workspace(context), path)
            if (!file)
                throw new Error(`File not found: ${path.replace(/^\/+/, '')}`)
            if (!file.content.trim())
                return {
                    next_loop: true,
                    save_message: result_message(type, 'File is empty, nothing to execute.'),
                }
            
            const print_messages: string[] = [ ]
            const result = await context.eval(file.content, {
                listener: message => {
                    if (message.type === 'print')
                        print_messages.push(String(message.data))
                },
            })
            const result_info = format_ddb_eval_result_info(result, print_messages)
            let content_object: string | undefined
            try { content_object = uint8_to_base64(result.pack()) } catch { }
            return {
                next_loop: true,
                ddb_result: result,
                save_message: result_message(type, tool_result_json({
                    ok: true,
                    tool: type,
                    returnedVoid: result_info.returnedVoid,
                    resultType: result_info.resultType,
                    content: truncate_tool_content(result_info.content),
                }), content_object),
            }
        } catch (error) {
            return error_result(type, `execute_file failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const skill_file_copy_config: ScriptConfig = {
    function: 'skill_file_copy',
    definition: {
        type: 'function',
        function: {
            name: 'skill_file_copy',
            description: '复制指定 Skill 包内的一个文本文件到当前工作区',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                    file_path: { type: 'string', description: '相对 Skill 包根目录的源文件路径' },
                    target_path: { type: 'string', description: '可选，工作区目标文件路径；默认与源文件路径相同' },
                    overwrite: { type: 'string', description: '可选，目标存在时是否覆盖，true/false，默认 false' },
                },
                required: ['skill_id', 'file_path'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { skill_id, file_path, target_path, overwrite } = get_copy_args(content)
            if (!skill_id || !file_path)
                return error_result(type, 'skill_file_copy requires skill_id and file_path.')
            if (!target_path)
                return error_result(type, 'skill_file_copy requires target_path or file_path.')
            
            const result = await context.api_fetch(
                `/skill/${encodeURIComponent(skill_id)}/files/get?filePath=${encodeURIComponent(file_path)}`
            )
            const source_content = is_record(result) && typeof result.content === 'string' ? result.content : ''
            const source_encoding = is_record(result) && typeof result.encoding === 'string' ? result.encoding : ''
            const text = source_encoding.toLowerCase() === 'base64' ? decode_base64_utf8(source_content) : source_content
            
            if (overwrite && await context.workspace_store.get_file(require_workspace(context), target_path))
                await context.workspace_store.update_file_content(context.workspace_id, target_path, text)
            else
                await context.workspace_store.create_file(context.workspace_id, target_path, text)
                
            return {
                next_loop: true,
                save_message: result_message(type, JSON.stringify({
                    skillId: skill_id,
                    sourcePath: file_path,
                    targetPath: target_path.replace(/^\/+/, ''),
                    overwrite,
                    size: text.length,
                })),
            }
        } catch (error) {
            return error_result(type, `skill_file_copy failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const workspace_state_read_config: ScriptConfig = {
    function: 'workspace_state_read',
    definition: {
        type: 'function',
        function: {
            name: 'workspace_state_read',
            description: '读取当前工作区状态文本',
            parameters: {
                type: 'object',
                properties: { },
                required: [ ],
            },
        },
    },
    handler: async (type, _content, context): Promise<ScriptResult> => {
        try {
            const workspace = await context.workspace_store.get_workspace(require_workspace(context))
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
            description: '通过精确字符串替换更新当前工作区状态文本',
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
            const args = normalize_script_args(content)
            const old_string = args[0] || ''
            const new_string = args[1] || ''
            const workspace = await context.workspace_store.get_workspace(require_workspace(context))
            if (!workspace)
                throw new Error('未找到工作区。')
            
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
            
            await context.workspace_store.update_workspace_state(context.workspace_id, updated_state)
            return {
                next_loop: true,
                save_message: result_message(
                    type,
                    `工作区状态已更新。workspaceId=${context.workspace_id}，更新方式=${update_mode}，beforeLen=${current_state.length}，afterLen=${updated_state.length}。`
                ),
            }
        } catch (error) {
            return error_result(type, `workspace_state_update 执行失败：${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


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
                    tasks: { type: 'string', description: '一个或多个待办事项字符串；也可通过 args 数组传入多项' },
                },
                required: ['tasks'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const tasks = normalize_script_args(content)
            await context.workspace_store.create_step_batch(require_session(context), tasks)
            return {
                next_loop: true,
                save_message: result_message(type, `Successfully created ${tasks.length} tasks and deactivated previous ones.`),
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
                    index: { type: 'string', description: '待办索引，从 0 开始' },
                    checked: { type: 'string', description: 'true 或 false' },
                },
                required: ['index', 'checked'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const index = Number(args[0])
            if (!Number.isInteger(index))
                throw new Error('Index must be a valid number.')
            const checked = String(args[1] || '').toLowerCase() === 'true'
            await context.workspace_store.set_step_status_by_index(require_session(context), index, checked)
            return {
                next_loop: true,
                save_message: result_message(type, `Successfully updated task ${index} to ${checked ? 'checked' : 'unchecked'}.`),
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
            await context.workspace_store.clear_steps(require_session(context))
            return {
                next_loop: true,
                save_message: result_message(type, 'Successfully deactivated all current tasks for this chat.'),
            }
        } catch (error) {
            return error_result(type, `step_clear failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}
