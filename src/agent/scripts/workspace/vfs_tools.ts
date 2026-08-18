import type { ScriptConfig, ScriptResult } from '@/agent/scripts/types.ts'
import {
    VFS_PATH_RULE,
    WORKSPACE_FILE_NAME_RULE,
    error_result,
    get_copy_args,
    get_create_args,
    get_display_workspace_path,
    get_display_workspace_result,
    get_named_arg,
    get_read_args,
    get_search_args,
    get_update_args,
    get_vfs_named_arg,
    get_workspace_arg,
    is_record,
    is_skill_path,
    normalize_search_scope,
    normalize_skill_result_paths,
    normalize_vfs_read_result,
    normalize_workspace_result_paths,
    parse_skill_scope_path,
    read_skill_file,
    read_vfs_file,
    reject_oversized_vfs_read,
    require_workspace,
    result_message,
    skill_file_paths_from_list,
    skill_ids_from_list,
    to_skill_display_path,
} from './helpers.ts'


export const vfs_list_config: ScriptConfig = {
    function: 'vfs_list',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_list',
            description: '列出虚拟文件。/home/workspace 返回工作区文件；/home/skills/<skill_id> 返回 Skill 包文件',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: `可选，${VFS_PATH_RULE}` },
                },
                required: [ ],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const path = get_vfs_named_arg(content)
            if (path && is_skill_path(path)) {
                const { skill_id, file_path } = parse_skill_scope_path(path)
                if (!skill_id) {
                    const result = await context.api_fetch('/skill/list?offset=0&limit=1000')
                    const skills = skill_ids_from_list(result).map(skill_id => `/home/skills/${skill_id}`)
                    return {
                        next_loop: true,
                        save_message: result_message(type, skills.join('\n') || 'No skills found.'),
                    }
                }
                const result = await context.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/list`)
                const files = skill_file_paths_from_list(result)
                    .filter(item => !file_path || item === file_path || item.startsWith(`${file_path}/`))
                    .map(item => to_skill_display_path(skill_id, item))
                return {
                    next_loop: true,
                    save_message: result_message(type, files.join('\n') || 'No files found.'),
                }
            }
            const files = await context.workspace_store.list_files(require_workspace(context), context.api_fetch, get_workspace_arg(path, true))
            return {
                next_loop: true,
                save_message: result_message(type, files.map(file => get_display_workspace_path(file.path)).join('\n') || 'No files found.'),
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
            description: '在当前会话工作区 /home/workspace 写入代码文件；文件存在时会完整覆盖',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: WORKSPACE_FILE_NAME_RULE },
                    content: { type: 'string', description: '文件内容' },
                },
                required: ['name', 'content'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { name, content: file_content } = get_create_args(content)
            const result = await context.workspace_store.write_file(require_workspace(context), context.api_fetch, name, file_content)
            return {
                next_loop: true,
                save_message: result_message(type, get_display_workspace_result(result)),
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
            description: '按行分段读取 /home/workspace/<file> 工作区文件或 /home/skills/<skill_id>/<file_path> Skill 文件。必须传入 startLine 和 endLine。每次返回文件总行数 lineCount。',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: VFS_PATH_RULE },
                    startLine: { type: 'number', description: '必填，起始行，1-based' },
                    endLine: { type: 'number', description: '必填，结束行，闭区间' },
                },
                required: ['name', 'startLine', 'endLine'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { name, start_line, end_line } = get_read_args(content)
            const file = normalize_vfs_read_result(await read_vfs_file(context, name, start_line, end_line))
            const oversized = reject_oversized_vfs_read(type, file)
            if (oversized)
                return oversized
            return {
                next_loop: true,
                save_message: result_message(type, JSON.stringify(file)),
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
            description: '用精确字符串替换局部修改当前会话工作区 /home/workspace 中的已有文件',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: `要修改的已有文件，${WORKSPACE_FILE_NAME_RULE}` },
                    hash: { type: 'string', description: '从 vfs_read、vfs_search、vfs_create 或上一次 vfs_update 结果中取得的文件 hash' },
                    replacements: {
                        type: 'array',
                        description: '替换列表，每项包含 old、new、可选 replaceAll；old 必须从读取到的文件内容中精确复制',
                        items: {
                            type: 'object',
                            properties: {
                                old: { type: 'string', description: '要替换的原文，必须从读取到的文件内容中精确复制' },
                                new: { type: 'string', description: '替换后的新文本' },
                                replaceAll: { type: 'boolean', description: '可选，是否替换所有匹配，默认 false' },
                            },
                            required: ['old', 'new'],
                            additionalProperties: false,
                        },
                    },
                },
                required: ['name', 'hash', 'replacements'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { name, hash, replacements } = get_update_args(content)
            if (!hash)
                throw new Error('vfs_update requires hash from vfs_read, vfs_search, vfs_create, or previous vfs_update.')
            if (!replacements.length || replacements.some(item => !item.old))
                throw new Error('vfs_update requires non-empty replacements[].old.')
            const result = await context.workspace_store.replace_file(require_workspace(context), context.api_fetch, name, hash, replacements)
            return {
                next_loop: true,
                save_message: result_message(type, get_display_workspace_result(result)),
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
            description: '删除当前会话工作区 /home/workspace 中的代码文件',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: WORKSPACE_FILE_NAME_RULE },
                },
                required: ['name'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const path = get_named_arg(content)
            await context.workspace_store.delete_file(require_workspace(context), context.api_fetch, path)
            return {
                next_loop: true,
                save_message: result_message(type, `File deleted successfully: ${get_display_workspace_path(path)}`),
            }
        } catch (error) {
            return error_result(type, `vfs_delete failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_copy_config: ScriptConfig = {
    function: 'vfs_copy',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_copy',
            description: '复制只读 Skill 文件到当前会话工作区。source 必须是 /home/skills/<skill_id>/<file_path>，target 必须是 /home/workspace/<file>',
            parameters: {
                type: 'object',
                properties: {
                    source: { type: 'string', description: '源文件路径，必须是 /home/skills/<skill_id>/<file_path>' },
                    target: { type: 'string', description: `目标工作区文件路径，可省略，默认同源文件名；${WORKSPACE_FILE_NAME_RULE}` },
                    overwrite: { type: 'boolean', description: '可选，目标存在时是否覆盖，默认 false' },
                },
                required: ['source'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { skill_id, file_path, target_path, overwrite } = get_copy_args(content)
            if (!skill_id || !file_path)
                throw new Error('vfs_copy source must be /home/skills/<skill_id>/<file_path>.')
            if (!target_path)
                throw new Error('vfs_copy target must be /home/workspace/<file> or omitted to use the source file name.')
            const source_file = await read_skill_file(context, skill_id, file_path)
            const source_content = is_record(source_file) ? String(source_file.content ?? '') : ''
            const file = overwrite && await context.workspace_store.get_file(require_workspace(context), context.api_fetch, target_path)
                ? await context.workspace_store.update_file_content(require_workspace(context), context.api_fetch, target_path, source_content)
                : await context.workspace_store.create_file(require_workspace(context), context.api_fetch, target_path, source_content)
            return {
                next_loop: true,
                save_message: result_message(type, JSON.stringify({
                    source: to_skill_display_path(skill_id, file_path),
                    target: get_display_workspace_path(target_path),
                    overwrite,
                    size: source_content.length,
                    hash: file.hash,
                })),
            }
        } catch (error) {
            return error_result(type, `vfs_copy failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


export const vfs_search_config: ScriptConfig = {
    function: 'vfs_search',
    definition: {
        type: 'function',
        function: {
            name: 'vfs_search',
            description: '搜索虚拟文本文件，按字面量子串匹配，不支持 regex。默认搜索 /home/workspace；传 path=/home/skills/<skill_id> 或 names=/home/skills/<skill_id>/<file> 搜索 Skill 包。',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '单个搜索词；query、all、any 必须且只能提供一个' },
                    all: { type: 'array', items: { type: 'string' }, description: '多个搜索词全部匹配才命中；query、all、any 必须且只能提供一个' },
                    any: { type: 'array', items: { type: 'string' }, description: '多个搜索词任意匹配即命中；query、all、any 必须且只能提供一个' },
                    scope: { type: 'string', description: '可选，file 或 line，默认 file' },
                    caseSensitive: { type: 'boolean', description: '可选，是否大小写敏感，默认 false' },
                    path: { type: 'string', description: '可选，搜索根路径，如 /home/workspace 或 /home/skills/<skill_id>' },
                    names: { type: 'array', items: { type: 'string' }, description: `可选，限定文件路径列表；${VFS_PATH_RULE}` },
                    extensions: { type: 'array', items: { type: 'string' }, description: '可选，限定文件后缀，如 .dos、.md' },
                    contextLines: { type: 'number', description: '可选，命中行前后的上下文行数' },
                    maxResults: { type: 'number', description: '可选，返回命中总数上限' },
                    maxPerFile: { type: 'number', description: '可选，每个文件返回命中数上限' },
                },
                required: [ ],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = get_search_args(content)
            const modes = ['query', 'all', 'any'].filter(key => {
                const value = args[key]
                return Array.isArray(value) ? value.length > 0 : Boolean(value)
            })
            if (modes.length !== 1)
                throw new Error('vfs_search requires exactly one of query, all, or any.')
            const search_scope = normalize_search_scope(args)
            const result = search_scope.skill_id
                ? await context.api_fetch(`/skill/${encodeURIComponent(search_scope.skill_id)}/files/search`, {
                    method: 'POST',
                    body: JSON.stringify(search_scope.body),
                })
                : await context.workspace_store.search_files(require_workspace(context), context.api_fetch, search_scope.body as any)
            return {
                next_loop: true,
                save_message: result_message(type, JSON.stringify(search_scope.skill_id
                    ? normalize_skill_result_paths(result, search_scope.skill_id)
                    : normalize_workspace_result_paths(result))),
            }
        } catch (error) {
            return error_result(type, `vfs_search failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}
