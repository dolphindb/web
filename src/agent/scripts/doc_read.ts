import type { ScriptConfig, ScriptResult } from './types.ts'
import { normalize_script_args } from './helpers.ts'
import { clean_doc_read_response, get_doc_reference } from './doc_context.ts'


export const doc_read_config: ScriptConfig = {
    function: 'doc_read',
    definition: {
        type: 'function',
        function: {
            name: 'doc_read',
            description: '读取 doc_search 返回的某个文档候选 id，返回和当前问题相关的正文内容',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'doc_search 返回的文档候选 id' },
                },
                required: ['id'],
            },
        },
    },
    handler: async (type, content, context): Promise<ScriptResult> => {
        try {
            const args = normalize_script_args(content)
            const id = (args[0] || '').trim()
            
            if (!id)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'doc_read requires id from doc_search.',
                    },
                }
            const reference = get_doc_reference(context.session_id, id)
            if (!reference)
                return {
                    next_loop: true,
                    save_message: {
                        msgId: `tool_${Date.now()}`,
                        role: 'tool',
                        messageType: 'tool_error',
                        name: type,
                        content: 'doc_read id 已失效，请重新调用 doc_search 获取候选文档 id。',
                    },
                }
            
            const result = await context.api_fetch('/doc/read', {
                method: 'POST',
                body: JSON.stringify({
                    agentId: context.agent_id,
                    sessionId: context.session_id,
                    provider: reference.provider,
                    locator: reference.locator,
                    title: reference.title,
                    ...(reference.provider === 'dolphinmind' ? { source: reference.locator } : { url: reference.locator }),
                    ...(reference.fallbackContent ? { fallbackContent: reference.fallbackContent } : { }),
                }),
            })
            const cleaned = clean_doc_read_response(result, reference)
            
            return {
                next_loop: true,
                save_message: {
                    msgId: `tool_${Date.now()}`,
                    role: 'tool',
                    messageType: 'tool_result',
                    name: type,
                    content: JSON.stringify(cleaned),
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
                    content: `doc_read failed: ${message}`,
                },
            }
        }
    },
}
