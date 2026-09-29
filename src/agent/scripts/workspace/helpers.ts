import { pickBy } from 'lodash'

import { language } from '@i18n'
import type { IMessage } from '@/agent/model/types.ts'
import { normalize_json_object, parse_json_string } from '@/agent/model/helpers.ts'
import type { IWorkspaceSearchOptions } from '@/agent/workspace.ts'
import {
    spill_large_tool_result_content_if_needed,
    spill_large_tool_result_print_if_needed,
} from '@/agent/tool_result_spill.ts'
import type { ScriptResult, ToolContext } from '@/agent/scripts/types.ts'
import {
    TOOL_RESULT_SPILL_THRESHOLD_CHARS,
    normalize_script_args,
    format_ddb_eval_result_info,
    tool_result_json,
    uint8_to_base64,
} from '@/agent/scripts/helpers.ts'
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
} from '@/agent/scripts/vfs_paths.ts'


export {
    spill_large_tool_result_content_if_needed,
    spill_large_tool_result_print_if_needed,
    format_ddb_eval_result_info,
    tool_result_json,
    uint8_to_base64,
    is_skill_path,
    normalize_workspace_result_paths,
    normalize_skill_result_paths,
    parse_skill_scope_path,
    to_skill_display_path,
}


export function result_message (type: string, content: string, content_object?: unknown): IMessage {
    return {
        msgId: `tool_${Date.now()}`,
        role: 'tool',
        messageType: 'tool_result',
        name: type,
        content,
        content_object,
    }
}


export function error_result (type: string, message: string): ScriptResult {
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


export function require_workspace (context: ToolContext) {
    if (!context.session_id)
        throw new Error('No workspace selected.')
    return context.session_id
}


export function require_agent (context: ToolContext) {
    if (!context.agent_id)
        throw new Error('No Agent selected.')
    return context.agent_id
}


export function require_session (context: ToolContext) {
    if (!context.session_id)
        throw new Error('No session selected.')
    return context.session_id
}


export function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


export function decode_base64_utf8 (content: string): string {
    const binary = window.atob(content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0;  i < binary.length;  i++)
        bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
}


export function file_name (path: string) {
    return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || ''
}


export function get_workspace_arg (value: string, allow_empty = false) {
    return normalize_workspace_tool_path(value, allow_empty)
}


export function get_vfs_arg (value: string, allow_empty = false) {
    return normalize_vfs_path(value, allow_empty)
}


export function get_workspace_names (value: unknown): string[] | undefined {
    const names = to_string_array(value)
    return names?.map(name => get_workspace_arg(name))
}


export function get_display_workspace_result (result: unknown) {
    return JSON.stringify(normalize_workspace_result_paths(result))
}


export function normalize_vfs_read_result (result: unknown) {
    if (!is_record(result))
        return result
    const { line_count, start_line, end_line, ...rest } = result
    return {
        ...rest,
        lineCount: result.lineCount ?? line_count,
        startLine: result.startLine ?? start_line,
        endLine: result.endLine ?? end_line,
    }
}


export function reject_oversized_vfs_read (type: string, result: unknown): ScriptResult | null {
    if (!is_record(result) || typeof result.content !== 'string')
        return null
    const content = result.content
    if (content.length <= TOOL_RESULT_SPILL_THRESHOLD_CHARS)
        return null
    const line_count = Number(result.lineCount ?? result.line_count)
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
                ...(Number.isInteger(line_count) ? { lineCount: line_count } : { }),
                error: language === 'en'
                    ? `File has ${Number.isInteger(line_count) ? line_count : 'unknown'} lines; reading content is too large (${content.length} characters) and was omitted from the model context.`
                    : `文件共 ${Number.isInteger(line_count) ? line_count : '未知'} 行；本次读取内容过大（${content.length} 字符），未放入模型上下文。`,
                hint: language === 'en'
                    ? 'Please narrow the startLine and endLine range and try again, or use vfs_search to locate relevant content first.'
                    : '请缩小 startLine 和 endLine 的范围后重试，或先用 vfs_search 定位相关内容。',
            }),
        },
    }
}


export function get_display_workspace_path (path: string) {
    return to_workspace_display_path(path)
}


export function get_named_arg (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed)
        return get_workspace_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim(), true)
    return get_workspace_arg(args[0] || '', true)
}


export function get_vfs_named_arg (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed)
        return get_vfs_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim(), true)
    return get_vfs_arg(args[0] || '', true)
}


export function get_create_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed)
        return {
            name: get_workspace_arg(String(parsed.name ?? parsed.path ?? args[0] ?? '').trim()),
            content: String(parsed.content ?? args[1] ?? ''),
        }
    return { name: get_workspace_arg(args[0] || ''), content: args[1] || '' }
}


export function get_copy_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed) {
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


export function to_optional_int (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}


export function to_string_array (value: unknown): string[] | undefined {
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


export function get_read_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    const start_line = to_optional_int(parsed?.startLine ?? parsed?.start_line ?? args[1])
    const end_line = to_optional_int(parsed?.endLine ?? parsed?.end_line ?? args[2])
    if (!start_line || !end_line)
        throw new Error('vfs_read requires startLine and endLine as positive integers.')
    return {
        name: get_vfs_arg(String(parsed?.name ?? parsed?.path ?? args[0] ?? '').trim()),
        start_line,
        end_line,
    }
}


export function to_replacements (value: unknown) {
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


export function get_update_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed) {
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


export type VfsSearchArgs = IWorkspaceSearchOptions & { path?: string }


export function get_search_args (content: unknown): VfsSearchArgs {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed)
        return pickBy({
            query: parsed.query ? String(parsed.query) : undefined,
            all: to_string_array(parsed.all),
            any: to_string_array(parsed.any),
            scope: parsed.scope ? String(parsed.scope) : undefined,
            caseSensitive: parsed.caseSensitive === undefined
                ? undefined
                : parsed.caseSensitive === true || String(parsed.caseSensitive).toLowerCase() === 'true',
            path: parsed.path ? String(parsed.path) : undefined,
            names: to_string_array(parsed.names),
            extensions: to_string_array(parsed.extensions),
            contextLines: to_optional_int(parsed.contextLines ?? parsed.context_lines),
            maxResults: to_optional_int(parsed.maxResults ?? parsed.max_results),
            maxPerFile: to_optional_int(parsed.maxPerFile ?? parsed.max_per_file),
        }, value => value !== undefined && (!Array.isArray(value) || value.length > 0))
    return { query: args[0] || '' }
}


export async function read_skill_file (context: ToolContext, skill_id: string, file_path: string, start_line?: number, end_line?: number) {
    const search = new URLSearchParams({ agentId: require_agent(context), filePath: file_path })
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


export async function read_vfs_file (context: ToolContext, name: string, start_line: number, end_line: number) {
    if (is_skill_path(name)) {
        const { skill_id, file_path } = parse_skill_file_path(name)
        return read_skill_file(context, skill_id, file_path, start_line, end_line)
    }
    const file = await context.workspace_store.get_file(require_workspace(context), context.api_fetch, get_workspace_arg(name), {
        start_line,
        end_line,
    })
    if (!file)
        throw new Error(`File not found: ${name.replace(/^\/+/, '')}`)
    return normalize_workspace_result_paths(file)
}


export function skill_file_paths_from_list (result: unknown): string[] {
    if (!is_record(result) || !Array.isArray(result.items))
        return [ ]
    return result.items
        .map(item => is_record(item) ? String(item.filePath ?? item.file_path ?? item.path ?? '').trim() : '')
        .filter(Boolean)
}


export function skill_ids_from_list (result: unknown): string[] {
    if (!is_record(result))
        return [ ]
    const items = Array.isArray(result.catalog) ? result.catalog : result.items
    if (!Array.isArray(items))
        return [ ]
    return items
        .map(item => is_record(item) ? String(item.skillId ?? item.skill_id ?? item.id ?? '').trim() : '')
        .filter(Boolean)
}


export function normalize_search_scope (args: VfsSearchArgs) {
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


export function get_state_update_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed)
        return {
            old_string: String(parsed.old_string ?? parsed.oldString ?? args[0] ?? ''),
            new_string: String(parsed.new_string ?? parsed.newString ?? args[1] ?? ''),
        }
    return {
        old_string: args[0] || '',
        new_string: args[1] || '',
    }
}


export function get_step_create_tasks (content: unknown) {
    const parsed = typeof content === 'string' ? parse_json_string(content) : content
    const tasks = is_record(parsed) ? parsed.tasks : parsed
    if (!Array.isArray(tasks))
        throw new Error('step_create requires tasks as a string array.')
    if (tasks.some(task => typeof task !== 'string' || !task.trim()))
        throw new Error('step_create requires every task to be a non-empty string.')
    return tasks.map(task => task.trim())
}


export function get_step_update_args (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    return {
        index: Number(parsed?.index ?? args[0]),
        checked: String(parsed?.checked ?? args[1] ?? '').toLowerCase() === 'true',
    }
}


export const WORKSPACE_FILE_NAME_RULE = '可传 /home/workspace/<file>；后端只支持单层普通文件名，不能包含 /、\\、..，不能以 . 开头'
export const VFS_PATH_RULE = '文件路径使用 /home/workspace/<file> 或 /home/skills/<skill_id>/<file_path>；/home/workspace 只支持单层文件'
