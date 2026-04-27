import type { ScriptConfig, ScriptResult } from './types.ts'
import {
    normalize_script_args,
    stringify_ddb_result,
} from './helpers.ts'


function is_record (value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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
            const instruction = is_record(instruction_detail) && typeof instruction_detail.instruction === 'string'
                ? instruction_detail.instruction
                : ''
            const result = is_record(skill_detail)
                ? {
                    ...skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
                }
                : {
                    skill: skill_detail,
                    instruction,
                    instructionDetail: instruction_detail,
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
