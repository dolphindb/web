import type { ScriptConfig, ScriptResult } from './types.ts'


export const kb_list_config: ScriptConfig = {
    function: 'kb_list',
    definition: {
        type: 'function',
        function: {
            name: 'kb_list',
            description: '列出当前 Agent 已绑定的所有可用知识库（名称、描述和 ID）',
            parameters: {
                type: 'object',
                properties: { },
                required: [ ],
            },
        },
    },
    handler: async (type, _content, context): Promise<ScriptResult> => {
        try {
            const body: Record<string, string> = { }
            if (context.session_id)
                body.sessionId = context.session_id
            if (context.agent_id)
                body.agentId = context.agent_id
            
            const result = await context.api_fetch('/knowledge/available', {
                method: 'POST',
                body: JSON.stringify(body),
            })
            
            const raw_items = Array.isArray(result?.items) ? result.items : [ ]
            const items = raw_items.map((item: any) => {
                const kb_id = String(item.knowledgeBaseId || '').trim()
                const name = String(item.name || '').trim()
                const description = String(item.description || '').trim()
                if (!kb_id)
                    return null
                return {
                    knowledgeBaseId: kb_id,
                    name: name || kb_id,
                    ...(description ? { description } : { }),
                }
            }).filter(Boolean)
            
            const content = JSON.stringify({
                knowledgeBases: items,
                ...(items.length === 0 ? { message: '当前 Agent 未绑定任何可用知识库。' } : { }),
            })
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content,
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
                    content: `kb_list failed: ${message}`,
                },
            }
        }
    },
}
