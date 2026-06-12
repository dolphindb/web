import { Model } from 'react-object-model'

import { model } from '@model'

import { init_scripts } from './scripts/init.ts'
import type { ChatCompletionOptions } from './tool_call_adapters.ts'
import type { IChatWorkspace, IWorkspaceStep } from './workspace.ts'
import { AGENT_ID_KEY, MAX_TOOL_TURNS, TOOL_CALL_LIMIT_ENABLED_KEY } from './model/constants.ts'
import { get_stored_boolean } from './model/helpers.ts'
import { ChatAgentModel } from './model/agent.ts'
import { ChatWorkspaceModel } from './model/workspace.ts'
import { ChatSessionModel } from './model/session.ts'
import { ChatRuntimeModel } from './model/runtime.ts'
import { ChatLlmModel } from './model/llm.ts'
import { ChatMemoryModel } from './model/memory.ts'
import { ChatSkillModel } from './model/skill.ts'
import type { AgentStatus, IAgentInfo, IAgentStatusEvent, ISelectableLlmInfo, IScriptExecutionApproval, ISession, ISkillInfo, IMessage, IToolLoopControl, ScriptExecuteApprovalDecision, ScriptExecuteApprovalMode } from './model/types.ts'
import type { IToolCall, MessageType } from './model/types.ts'

export type { AgentStatus, IAccessInfo, IAgentInfo, IAgentLlmBinding, IAgentStatusEvent, IBuiltinInitItem, IBuiltinInitResult, IBuiltinInitSummary, IBuiltinStateRecord, ILlmConfig, ILlmProvider, ILlmUsageStats, IMessage, IMemoryEntry, IMemoryStats, ISelectableLlmInfo, IScriptExecutionApproval, ISession, ISkillBinding, ISkillFileContent, ISkillFileInfo, ISkillInfo, IToolCall, IToolLoopControl, IUserLlmAccessInfo, MessageRole, MessageType, ScriptExecuteApprovalDecision, ScriptExecuteApprovalMode } from './model/types.ts'


// 初始化工具注册表
init_scripts()


export class ChatModel extends Model<ChatModel> {
    readonly agent = new ChatAgentModel(this)
    
    readonly workspace = new ChatWorkspaceModel(this)
    
    readonly session = new ChatSessionModel(this)
    
    readonly runtime = new ChatRuntimeModel(this)
    
    readonly llm = new ChatLlmModel(this)
    
    readonly memory = new ChatMemoryModel(this)
    
    readonly skill = new ChatSkillModel(this)
    
    agent_id = localStorage.getItem(AGENT_ID_KEY) || ''
    
    agents: IAgentInfo[] = [ ]
    
    sessions: ISession[] = [ ]
    
    current_session_id = ''
    
    workspaces: IChatWorkspace[] = [ ]
    
    current_workspace_id = ''
    
    current_workspace: IChatWorkspace | null = null
    
    steps: IWorkspaceStep[] = [ ]
    
    messages: IMessage[] = [ ]
    
    buffered_messages: string[] = [ ]
    
    agent_status: IAgentStatusEvent = { status: 'idle' }
    
    sse_controller: AbortController | null = null
    
    /** 缓存的技能列表，工具续传轮次复用 */
    _cached_skills: ISkillInfo[] = [ ]
    
    /** 当前 Agent 下用户可选择的 LLM 列表 */
    selectable_llms: ISelectableLlmInfo[] = [ ]
    
    /** 用户显式选择的 LLM 配置 ID（不选则由后端使用 agent 默认） */
    selected_llm_config_id = ''
    
    use_native_tool_calling = true
    
    tool_call_limit_enabled = get_stored_boolean(TOOL_CALL_LIMIT_ENABLED_KEY, true)
    
    /** 最近一次工具执行产生的 DdbObj，用于直接路由到 DataView */
    latest_ddb_result: unknown = null
    
    /** DolphinDB 脚本工具执行审批模式，仅保存在当前前端运行时 */
    script_execute_approval_mode: ScriptExecuteApprovalMode = 'approval'
    
    pending_script_approval: IScriptExecutionApproval | null = null
    
    pending_tool_loop_control: IToolLoopControl | null = null
    
    settings_visible = false
    
    loading = false
    
    _request_seq = 0
    
    _active_request_seq = 0
    
    _interrupted_request_seq = 0
    
    _pending_assistant_msg_ids: string[] = [ ]
    
    _script_approval_resolver: ((decision: ScriptExecuteApprovalDecision) => void) | null = null
    
    _session_script_approval_modes = new Map<string, ScriptExecuteApprovalMode>()
    
    _last_tool_call_signature = ''
    
    _last_tool_call_failed = false
    
    _consecutive_failed_tool_call_count = 0
    
    _consecutive_ddb_failures = 0
    
    _tool_turn_limit = MAX_TOOL_TURNS
    
    _last_failed_completion: { message: string, options: ChatCompletionOptions, toolTurn: number } | null = null
    
    
    get base_url (): string {
        const protocol = location.protocol
        const hostname = model.hostname || location.hostname
        const port = model.port || location.port
        return `${protocol}//${hostname}${port ? ':' + port : ''}/agent-bus/v1`
    }
}


const chat_model_instances = new Map<string, ChatModel>()

export function get_chat_model (session_id: string) {
    if (!session_id)
        return chat_model
    
    let chat = chat_model_instances.get(session_id)
    if (!chat) {
        chat = new ChatModel()
        chat_model_instances.set(session_id, chat)
    }
    return chat
}


export function bind_chat_model_session (old_session_id: string, session_id: string) {
    const chat = chat_model_instances.get(old_session_id)
    if (!chat || old_session_id === session_id)
        return
    
    chat_model_instances.delete(old_session_id)
    chat_model_instances.set(session_id, chat)
}


export let chat_model = new ChatModel()
