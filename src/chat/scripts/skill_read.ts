import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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


export const skill_read_config: ScriptConfig = {
    function: 'skill_read',
    definition: {
        type: 'function',
        function: {
            name: 'skill_read',
            description: '读取 Agent 技能详情，包括技能名称、描述和指令内容',
            parameters: {
                type: 'object',
                properties: {
                    skill_id: { type: 'string', description: '技能 ID' },
                },
                required: ['skill_id'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const skill_id = (args[0] || '').trim()
            if (!skill_id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'skill_read requires args[0] as skillId.',
                    },
                }
                
            const encoded_skill_id = encodeURIComponent(skill_id)
            const skill_detail = await context.api_fetch(`/skill/${encoded_skill_id}`)
            const instruction_detail = is_record(skill_detail) && skill_detail.hasInstruction === false
                ? null
                : await context.api_fetch(`/skill/${encoded_skill_id}/instruction`)
            const files_detail = await context.api_fetch(`/skill/${encoded_skill_id}/files/list`)
            const files = to_file_paths(files_detail)
            const instruction = is_record(instruction_detail) && typeof instruction_detail.instruction === 'string'
                ? instruction_detail.instruction
                : ''
            const result = is_record(skill_detail)
                ? {
                    ...skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
                    files,
                    fileTree: build_file_tree(files),
                    filesDetail: files_detail,
                }
                : {
                    skill: skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
                    files,
                    fileTree: build_file_tree(files),
                    filesDetail: files_detail,
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
