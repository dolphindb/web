import { normalize_json_object } from '@/agent/model/helpers.ts'

import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'
import { to_skill_display_path } from './vfs_paths.ts'


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}


function get_skill_ref (content: unknown) {
    const parsed = normalize_json_object(content)
    const args = normalize_script_args(content)
    if (parsed) {
        const explicit_id = String(parsed.skill_id ?? parsed.skillId ?? parsed.id ?? '').trim()
        if (explicit_id)
            return { value: explicit_id, kind: 'id' as const }
        const explicit_name = String(parsed.skill_name ?? parsed.skillName ?? parsed.name ?? args[0] ?? '').trim()
        return { value: explicit_name, kind: 'name' as const }
    }
    return { value: (args[0] || '').trim(), kind: 'auto' as const }
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
    if (!is_record(value) || !Array.isArray(value.catalog))
        return [ ]
    return value.catalog.filter(is_record)
}


async function fetch_skill_detail (context: Parameters<ScriptConfig['handler']>[2], skill_ref: ReturnType<typeof get_skill_ref>) {
    const catalog = get_skill_items(await context.api_fetch(`/skill/${encodeURIComponent(context.agent_id)}/catalog`))
    const id_match = catalog.find(item => get_skill_id_from_detail(item) === skill_ref.value)
    if (skill_ref.kind !== 'name' && id_match)
        return id_match
    const matches = catalog.filter(item => get_skill_name_from_detail(item) === skill_ref.value)
    if (skill_ref.kind === 'id' || matches.length === 0)
        throw new Error(`Skill "${skill_ref.value}" is not available to the current agent.`)
    if (matches.length > 1)
        throw new Error(`Multiple skills named "${skill_ref.value}" were found. Please provide skill_id instead. Candidates: ${matches.map(get_skill_id_from_detail).join(', ')}`)
    return matches[0]
}


export const skill_read_config: ScriptConfig = {
    function: 'skill_read',
    definition: {
        type: 'function',
        function: {
            name: 'skill_read',
            description: '读取 Agent 技能详情，包括技能名称、描述、指令内容和 Skill 包文件列表；可传 skill_id 或唯一技能名称；只用于 Skill 元信息，不读取工作区文件',
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
            if (!context.agent_id)
                throw new Error('skill_read requires an active agent.')
                
            const skill_detail = await fetch_skill_detail(context, skill_ref)
            const skill_id = get_skill_id_from_detail(skill_detail)
            if (!skill_id)
                throw new Error('skill_read failed to resolve skill_id from skill detail.')
            const encoded_skill_id = encodeURIComponent(skill_id)
            const agent_query = `agentId=${encodeURIComponent(context.agent_id)}`
            const instruction_detail = is_record(skill_detail) && skill_detail.hasInstruction === false
                ? null
                : await context.api_fetch(`/skill/${encoded_skill_id}/instruction?${agent_query}`)
            const files_detail = await context.api_fetch(`/skill/${encoded_skill_id}/files/list?${agent_query}`)
            const files = to_file_paths(files_detail)
            const display_files = files.map(file_path => to_skill_display_path(skill_id, file_path))
            const instruction = is_record(instruction_detail) && typeof instruction_detail.instruction === 'string'
                ? instruction_detail.instruction
                : ''
            const detail = is_record(instruction_detail) ? { ...skill_detail, ...instruction_detail } : skill_detail
            const name = get_skill_name_from_detail(detail)
            const result = {
                skillId: skill_id,
                name,
                displayName: String(detail.displayName ?? detail.display_name ?? '') || name,
                description: String(detail.description ?? ''),
                instruction,
                files: display_files,
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
