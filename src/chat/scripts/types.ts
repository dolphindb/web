import type { DdbEvalOptions } from 'dolphindb/browser.js'
import type { IMessage } from '@/chat/model.ts'
import type { chat_workspace_store } from '@/chat/workspace.ts'


export type ScriptType = 'execute' | 'coldefs' | 'testsql' | 'show' | 'doc_search' | 'doc_read' | 'skill_read' | 'skill_file_read' | string


export interface ScriptResult {
    /** 是否继续 agent loop（调用 LLM 继续对话） */
    next_loop: boolean
    /** 需要保存/展示的消息 */
    save_message?: IMessage
    /** 工具执行产生的 DdbObj 结果，用于直接路由到 DataView（不经过序列化） */
    ddb_result?: unknown
}


export interface ToolContext {
    /** 执行 DDB 脚本，返回 DdbObj */
    eval: (script: string, options?: DdbEvalOptions) => Promise<any>
    /** 调用 agent-bus API */
    api_fetch: (path: string, options?: RequestInit) => Promise<any>
    session_id: string
    workspace_id: string
    workspace_store: typeof chat_workspace_store
}


export type ScriptHandler = (type: ScriptType, content: unknown, context: ToolContext) => Promise<ScriptResult> | ScriptResult


export interface ToolDefinition {
    type: 'function'
    function: {
        name: string
        description: string
        parameters: {
            type: 'object'
            properties: Record<string, { type: string, description: string }>
            required: string[]
        }
    }
}


export interface ScriptConfig {
    function: ScriptType
    definition: ToolDefinition
    handler: ScriptHandler
}
