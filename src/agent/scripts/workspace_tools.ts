import type { IMessage } from '@/agent/model.ts'

import type { ScriptConfig, ScriptResult, ToolContext } from './types.ts'
import {
    normalize_script_args,
    format_ddb_eval_result_info,
    TOOL_RESULT_SPILL_THRESHOLD_CHARS,
    tool_result_json,
    uint8_to_base64,
} from './helpers.ts'
import {
    is_skill_path,
    normalize_workspace_result_paths,
    normalize_workspace_tool_path,
    normalize_skill_result_paths,
    normalize_vfs_path,
    parse_skill_file_path,
    parse_skill_scope_path,
    to_skill_display_path,
    to_workspace_display_path,
} from './vfs_paths.ts'


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
    if (!context.session_id)
        throw new Error('No workspace selected.')
    return context.session_id
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


function file_name (path: string) {
    return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || ''
}


function get_workspace_arg (value: string, allow_empty = false) {
    return normalize_workspace_tool_path(value, allow_empty)
}


function get_vfs_arg (value: string, allow_empty = false) {
    return normalize_vfs_path(value, allow_empty)
}


function get_workspace_names (value: unknown): string[] | undefined {
    const names = to_string_array(value)
    return names?.map(name => get_workspace_arg(name))
}


function get_display_workspace_result (result: unknown) {
    return JSON.stringify(normalize_workspace_result_paths(result))
}


function get_display_workspace_path (path: string) {
    return to_workspace_display_path(path)
}


function get_named_arg (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return get_workspace_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim(), true)
    return get_workspace_arg(args[0] || '', true)
}


function get_vfs_named_arg (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return get_vfs_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim(), true)
    return get_vfs_arg(args[0] || '', true)
}


function get_create_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return {
            name: get_workspace_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim()),
            content: String(parsed.content ?? args[1] ?? ''),
        }
    return { name: get_workspace_arg(args[0] || ''), content: args[1] || '' }
}


function get_copy_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed)) {
        const source_path = String(parsed.source ?? parsed.source_path ?? parsed.sourcePath ?? parsed.src ?? args[0] ?? '').trim()
        const source = parse_skill_file_path(source_path)
        const target_source = String(parsed.target ?? parsed.target_path ?? parsed.targetPath ?? parsed.dest ?? parsed.destination ?? parsed.name ?? parsed.path ?? args[1] ?? file_name(source.file_path)).trim()
        return {
            skill_id: source.skill_id,
            file_path: source.file_path,
            target_path: get_workspace_arg(target_source),
            overwrite: parsed.overwrite === true || String(parsed.overwrite ?? args[2] ?? '').toLowerCase() === 'true',
        }
    }
    const source = parse_skill_file_path(args[0] || '')
    return {
        skill_id: source.skill_id,
        file_path: source.file_path,
        target_path: get_workspace_arg(args[1] || file_name(source.file_path)),
        overwrite: String(args[2] || '').toLowerCase() === 'true',
    }
}


function to_optional_int (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}


function to_string_array (value: unknown): string[] | undefined {
    if (Array.isArray(value))
        return value.map(item => String(item).trim()).filter(Boolean)
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed)
            return undefined
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed))
                return parsed.map(item => String(item).trim()).filter(Boolean)
        } catch { }
        return trimmed.split(',').map(item => item.trim()).filter(Boolean)
    }
    return undefined
}


function get_read_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return {
            name: get_vfs_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim()),
            start_line: to_optional_int(parsed.startLine ?? parsed.start_line ?? args[1]),
            end_line: to_optional_int(parsed.endLine ?? parsed.end_line ?? args[2]),
        }
    return {
        name: get_vfs_arg(args[0] || ''),
        start_line: to_optional_int(args[1]),
        end_line: to_optional_int(args[2]),
    }
}


function to_replacements (value: unknown) {
    if (!Array.isArray(value))
        return [ ]
    return value
        .filter(is_record)
        .map(item => ({
            old: String(item.old ?? ''),
            new: String(item.new ?? ''),
            ...(item.replaceAll !== undefined ? { replaceAll: item.replaceAll === true || String(item.replaceAll).toLowerCase() === 'true' } : { }),
        }))
}


function get_update_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed)) {
        const replacements = to_replacements(parsed.replacements)
        return {
            name: get_workspace_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim()),
            hash: String(parsed.hash ?? args[1] ?? '').trim(),
            replacements: replacements.length ? replacements : [{
                old: String(parsed.old ?? parsed.old_string ?? args[2] ?? ''),
                new: String(parsed.new ?? parsed.new_string ?? args[3] ?? ''),
                ...(parsed.replaceAll !== undefined ? { replaceAll: parsed.replaceAll === true || String(parsed.replaceAll).toLowerCase() === 'true' } : { }),
            }],
        }
    }
    return {
        name: get_workspace_arg(args[0] || ''),
        hash: (args[1] || '').trim(),
        replacements: [{ old: args[2] || '', new: args[3] || '' }],
    }
}


function get_search_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed)) {
        const result: Record<string, unknown> = { }
        if (parsed.query)
            result.query = String(parsed.query)
        const all = to_string_array(parsed.all)
        if (all?.length)
            result.all = all
        const any = to_string_array(parsed.any)
        if (any?.length)
            result.any = any
        if (parsed.scope)
            result.scope = String(parsed.scope)
        if (parsed.caseSensitive !== undefined)
            result.caseSensitive = parsed.caseSensitive === true || String(parsed.caseSensitive).toLowerCase() === 'true'
        if (parsed.path)
            result.path = String(parsed.path)
        const names = to_string_array(parsed.names)
        if (names?.length)
            result.names = names
        const extensions = to_string_array(parsed.extensions)
        if (extensions?.length)
            result.extensions = extensions
        const contextLines = to_optional_int(parsed.contextLines ?? parsed.context_lines)
        if (contextLines !== undefined)
            result.contextLines = contextLines
        const maxResults = to_optional_int(parsed.maxResults ?? parsed.max_results)
        if (maxResults !== undefined)
            result.maxResults = maxResults
        const maxPerFile = to_optional_int(parsed.maxPerFile ?? parsed.max_per_file)
        if (maxPerFile !== undefined)
            result.maxPerFile = maxPerFile
        return result
    }
    return { query: args[0] || '' }
}


async function read_skill_file (context: ToolContext, skill_id: string, file_path: string, start_line?: number, end_line?: number) {
    const search = new URLSearchParams({ filePath: file_path })
    if (start_line !== undefined)
        search.set('lineStart', String(start_line))
    if (start_line !== undefined && end_line !== undefined)
        search.set('lineLimit', String(Math.max(1, end_line - start_line + 1)))
    const result = await context.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/get?${search}`)
    const source_content = is_record(result) && typeof result.content === 'string' ? result.content : ''
    const source_encoding = is_record(result) && typeof result.encoding === 'string' ? result.encoding : ''
    const text = source_encoding.toLowerCase() === 'base64'
        ? decode_base64_utf8(source_content)
        : source_content
    return normalize_skill_result_paths({
        ...(is_record(result) ? result : { }),
        filePath: is_record(result) && typeof result.filePath === 'string' ? result.filePath : file_path,
        encoding: 'text',
        sourceEncoding: source_encoding || undefined,
        content: text,
    }, skill_id)
}


function skill_file_paths_from_list (result: unknown): string[] {
    if (!is_record(result) || !Array.isArray(result.items))
        return [ ]
    return result.items
        .map(item => is_record(item) ? String(item.filePath ?? item.file_path ?? item.path ?? '').trim() : '')
        .filter(Boolean)
}


function skill_ids_from_list (result: unknown): string[] {
    if (!is_record(result) || !Array.isArray(result.items))
        return [ ]
    return result.items
        .map(item => is_record(item) ? String(item.skillId ?? item.skill_id ?? item.id ?? '').trim() : '')
        .filter(Boolean)
}


function normalize_search_scope (args: Record<string, unknown>) {
    const raw_path = typeof args.path === 'string' && args.path.trim() ? args.path.trim() : ''
    const raw_names = to_string_array(args.names)
    
    if (raw_path && is_skill_path(raw_path)) {
        const scope = parse_skill_scope_path(raw_path)
        const names = raw_names?.length
            ? raw_names.map(name => parse_skill_file_path(name, scope.skill_id).file_path)
            : scope.file_path ? [scope.file_path] : undefined
        const { path: _path, names: _names, ...body } = args
        return { skill_id: scope.skill_id, body: { ...body, ...(names?.length ? { filePaths: names } : { }) } }
    }
    
    const skill_names = raw_names?.filter(name => is_skill_path(name)) || [ ]
    if (skill_names.length) {
        if (raw_names && skill_names.length !== raw_names.length)
            throw new Error('vfs_search cannot mix /home/skills and /home/workspace paths in one call.')
        const parsed = skill_names.map(name => parse_skill_file_path(name))
        const skill_id = parsed[0]?.skill_id || ''
        if (!skill_id || parsed.some(item => item.skill_id !== skill_id))
            throw new Error('vfs_search can search only one Skill package per call.')
        const { path: _path, names: _names, ...body } = args
        return { skill_id, body: { ...body, filePaths: parsed.map(item => item.file_path) } }
    }
    
    const { path: _path, ...body } = args
    const path_name = raw_path ? get_workspace_arg(raw_path, true) : ''
    const names = raw_names?.length ? get_workspace_names(raw_names) : path_name ? [path_name] : undefined
    return { body: { ...body, ...(names?.length ? { names } : { }) } }
}


function get_state_update_args (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed))
        return {
            old_string: String(parsed.old_string ?? parsed.oldString ?? args[0] ?? ''),
            new_string: String(parsed.new_string ?? parsed.newString ?? args[1] ?? ''),
        }
    return {
        old_string: args[0] || '',
        new_string: args[1] || '',
    }
}


function get_step_create_tasks (content: unknown) {
    const parsed = parse_payload(content)
    const tasks = is_record(parsed) ? parsed.tasks : parsed
    if (!Array.isArray(tasks))
        throw new Error('step_create requires tasks as a string array.')
    if (tasks.some(task => typeof task !== 'string' || !task.trim()))
        throw new Error('step_create requires every task to be a non-empty string.')
    return tasks.map(task => task.trim())
}


const WORKSPACE_FILE_NAME_RULE = '可传 /home/workspace/<file>；后端只支持单层普通文件名，不能包含 /、\\、..，不能以 . 开头'
const VFS_PATH_RULE = '文件路径使用 /home/workspace/<file> 或 /home/skills/<skill_id>/<file_path>；/home/workspace 只支持单层文件'


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
            description: '读取虚拟文本文件。/home/workspace/<file> 返回 content、lineCount、startLine、endLine、hash；/home/skills/<skill_id>/<file_path> 返回 Skill 文件文本内容。',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: VFS_PATH_RULE },
                    startLine: { type: 'number', description: '可选，起始行，1-based' },
                    endLine: { type: 'number', description: '可选，结束行，闭区间' },
                },
                required: ['name'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const { name, start_line, end_line } = get_read_args(content)
            if (is_skill_path(name)) {
                const { skill_id, file_path } = parse_skill_file_path(name)
                const file = await read_skill_file(context, skill_id, file_path, start_line, end_line)
                return {
                    next_loop: true,
                    save_message: result_message(type, JSON.stringify(file)),
                }
            }
            const file = await context.workspace_store.get_file(require_workspace(context), context.api_fetch, get_workspace_arg(name), {
                start_line,
                end_line,
            })
            if (!file)
                throw new Error(`File not found: ${name.replace(/^\/+/, '')}`)
            return {
                next_loop: true,
                save_message: result_message(type, get_display_workspace_result(file)),
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


export const execute_file_config: ScriptConfig = {
    function: 'execute_file',
    definition: {
        type: 'function',
        function: {
            name: 'execute_file',
            description: '执行当前会话工作区 /home/workspace 中的 DolphinDB 脚本文件',
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
            
            const print_messages: string[] = [ ]
            const result = await context.eval(file.content, {
                listener: message => {
                    if (message.type === 'print')
                        print_messages.push(String(message.data))
                },
            })
            const result_info = format_ddb_eval_result_info(result, print_messages)
            let content_object: string | undefined
            if (result_info.content.length <= TOOL_RESULT_SPILL_THRESHOLD_CHARS)
                try { content_object = uint8_to_base64(result.pack()) } catch { }
            return {
                next_loop: true,
                ddb_result: result,
                save_message: result_message(type, tool_result_json({
                    ok: true,
                    tool: type,
                    returnedVoid: result_info.returnedVoid,
                    resultType: result_info.resultType,
                    ...(print_messages.length ? { print: print_messages } : { }),
                    content: result_info.content,
                }), content_object),
            }
        } catch (error) {
            return error_result(type, `execute_file failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    },
}


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
            const args = normalize_script_args(content)
            const index = Number(args[0])
            if (!Number.isInteger(index))
                throw new Error('Index must be a valid number.')
            const checked = String(args[1] || '').toLowerCase() === 'true'
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
