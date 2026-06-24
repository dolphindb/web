import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'
import { normalize_skill_result_paths, to_skill_display_path } from './vfs_paths.ts'


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


function get_skill_ref (content: unknown) {
    const parsed = parse_payload(content)
    const args = normalize_script_args(content)
    if (is_record(parsed)) {
        const explicit_id = String(parsed.skill_id ?? parsed.skillId ?? parsed.id ?? '').trim()
        if (explicit_id)
            return { value: explicit_id, kind: 'id' as const }
        const explicit_name = String(parsed.skill_name ?? parsed.skillName ?? parsed.name ?? args[0] ?? '').trim()
        return { value: explicit_name, kind: 'name' as const }
    }
    return { value: (args[0] || '').trim(), kind: 'auto' as const }
}


type SkillFileTreeNode = {
    name: string
    path: string
    type: 'directory' | 'file'
    children?: SkillFileTreeNode[]
}


function to_file_paths (value: unknown): string[] {
    const items = Array.isArray(value)
        ? value
        : is_record(value)
            ? value.items ?? value.files ?? value.filePaths ?? value.file_paths ?? value.data
            : null
    if (!Array.isArray(items))
        return [ ]
    
    return items
        .map(item => typeof item === 'string' ? item.trim() : is_record(item) ? String(item.filePath ?? item.file_path ?? item.path ?? item.name ?? '').trim() : '')
        .filter(Boolean)
}


function build_file_tree (file_paths: string[]): SkillFileTreeNode[] {
    const roots: SkillFileTreeNode[] = [ ]
    
    for (const file_path of file_paths) {
        const parts = file_path.split('/').map(part => part.trim()).filter(Boolean)
        let level = roots
        let current_path = ''
        
        parts.forEach((part, index) => {
            current_path = current_path ? `${current_path}/${part}` : part
            const is_file = index === parts.length - 1
            let node = level.find(item => item.name === part)
            if (!node) {
                node = {
                    name: part,
                    path: current_path,
                    type: is_file ? 'file' : 'directory',
                    ...(!is_file ? { children: [ ] } : { }),
                }
                level.push(node)
            }
            if (!is_file)
                level = node.children ?? [ ]
        })
    }
    
    return roots
}


function get_skill_id_from_detail (value: unknown) {
    return is_record(value)
        ? String(value.skillId ?? value.skill_id ?? value.id ?? '').trim()
        : ''
}


function get_skill_name_from_detail (value: unknown) {
    return is_record(value)
        ? String(value.name ?? value.skillName ?? value.skill_name ?? '').trim()
        : ''
}


function get_skill_items (value: unknown): Record<string, unknown>[] {
    if (!is_record(value) || !Array.isArray(value.items))
        return [ ]
    return value.items.filter(is_record)
}


async function list_skills_by_name (context: Parameters<ScriptConfig['handler']>[2], skill_name: string) {
    const matches: Record<string, unknown>[] = [ ]
    const limit = 100
    for (let offset = 0;  ;  offset += limit) {
        const result = await context.api_fetch(`/skill/list?offset=${offset}&limit=${limit}`)
        const items = get_skill_items(result)
        matches.push(...items.filter(item => get_skill_name_from_detail(item) === skill_name))
        const size = is_record(result) ? Number(result.size ?? 0) : 0
        if (items.length < limit || offset + items.length >= size)
            break
    }
    return matches
}


async function fetch_skill_by_name (context: Parameters<ScriptConfig['handler']>[2], skill_name: string) {
    const matches = await list_skills_by_name(context, skill_name)
    if (matches.length > 1) {
        const candidates = matches
            .map(item => get_skill_id_from_detail(item))
            .filter(Boolean)
            .join(', ')
        throw new Error(`Multiple skills named "${skill_name}" were found. Please provide skill_id instead.${candidates ? ` Candidates: ${candidates}` : ''}`)
    }
    if (matches.length === 1)
        return matches[0]
        
    const result = await context.api_fetch(`/skill/byName/${encodeURIComponent(skill_name)}`)
    const result_items = get_skill_items(result)
    if (result_items.length > 1) {
        const candidates = result_items
            .map(item => get_skill_id_from_detail(item))
            .filter(Boolean)
            .join(', ')
        throw new Error(`Multiple skills named "${skill_name}" were found. Please provide skill_id instead.${candidates ? ` Candidates: ${candidates}` : ''}`)
    }
    return result_items[0] ?? result
}


async function fetch_skill_detail (context: Parameters<ScriptConfig['handler']>[2], skill_ref: ReturnType<typeof get_skill_ref>) {
    if (skill_ref.kind === 'id')
        return context.api_fetch(`/skill/${encodeURIComponent(skill_ref.value)}`)
    if (skill_ref.kind === 'name')
        return fetch_skill_by_name(context, skill_ref.value)
    try {
        return await context.api_fetch(`/skill/${encodeURIComponent(skill_ref.value)}`)
    } catch {
        return fetch_skill_by_name(context, skill_ref.value)
    }
}


export const skill_read_config: ScriptConfig = {
    function: 'skill_read',
    definition: {
        type: 'function',
        function: {
            name: 'skill_read',
            description: '读取 Agent 技能详情，包括技能名称、描述、指令内容和 Skill 包文件目录；可传 skill_id 或唯一技能名称；只用于 Skill 元信息，不读取工作区文件',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                    name: { type: 'string', description: '可选，技能名称；存在重名时必须改用 skill_id' },
                },
                required: [ ],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const skill_ref = get_skill_ref(content)
            if (!skill_ref.value)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'skill_read requires skill_id or unique skill name.',
                    },
                }
                
            const skill_detail = await fetch_skill_detail(context, skill_ref)
            const skill_id = get_skill_id_from_detail(skill_detail)
            if (!skill_id)
                throw new Error('skill_read failed to resolve skill_id from skill detail.')
            const encoded_skill_id = encodeURIComponent(skill_id)
            const instruction_detail = is_record(skill_detail) && skill_detail.hasInstruction === false
                ? null
                : await context.api_fetch(`/skill/${encoded_skill_id}/instruction`)
            const files_detail = await context.api_fetch(`/skill/${encoded_skill_id}/files/list`)
            const files = to_file_paths(files_detail)
            const display_files = files.map(file_path => to_skill_display_path(skill_id, file_path))
            const file_tree = normalize_skill_result_paths(build_file_tree(files), skill_id)
            const instruction = is_record(instruction_detail) && typeof instruction_detail.instruction === 'string'
                ? instruction_detail.instruction
                : ''
            const result = is_record(skill_detail)
                ? {
                    ...skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
                    files: display_files,
                    fileTree: file_tree,
                    filesDetail: normalize_skill_result_paths(files_detail, skill_id),
                }
                : {
                    skill: skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
                    files: display_files,
                    fileTree: file_tree,
                    filesDetail: normalize_skill_result_paths(files_detail, skill_id),
                }
            const message_content = stringify_ddb_result(result)
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'skill_result',
                    name: type,
                    content: message_content,
                },
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_error',
                    name: type,
                    content: `skill_read failed: ${message}`,
                },
            }
        }
    },
}
