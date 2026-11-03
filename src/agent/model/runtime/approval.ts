import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'
import type { IScriptExecutionApproval, ScriptExecuteApprovalDecision, ScriptExecuteApprovalMode } from '@/agent/model/types.ts'


export function get_session_script_execute_approval_mode (chat: ChatModel, session_id = chat.current_session_id): ScriptExecuteApprovalMode {
    if (!session_id)
        return 'approval'
    return chat._session_script_approval_modes.get(session_id) || 'approval'
}


export function set_script_execute_approval_mode (chat: ChatModel, mode: ScriptExecuteApprovalMode, session_id = chat.current_session_id) {
    if (session_id)
        chat._session_script_approval_modes.set(session_id, mode)
    
    if (!session_id || session_id === chat.current_session_id)
        chat.set({ script_execute_approval_mode: mode })
    
    if (
        mode === 'auto' &&
        !chat.pending_script_approval?.reason &&
        chat.pending_script_approval?.sessionId === session_id &&
        chat._script_approval_resolver
    )
        resolve_script_execution_approval(chat, 'allow_session')
}


export function resolve_script_execution_approval (chat: ChatModel, decision: ScriptExecuteApprovalDecision) {
    const resolver = chat._script_approval_resolver
    const pending = chat.pending_script_approval
    
    chat._script_approval_resolver = null
    if (decision === 'allow_session' && pending?.sessionId)
        set_script_execute_approval_mode(chat, 'auto', pending.sessionId)
    
    chat.set({ pending_script_approval: null })
    resolver?.(decision)
}


export async function request_script_execution_approval (
    chat: ChatModel,
    tool_name: string,
    script: string,
    message_id: string,
    reason?: string
): Promise<ScriptExecuteApprovalDecision> {
    const session_id = chat._active_session_id
    if (!reason && get_session_script_execute_approval_mode(chat, session_id) === 'auto')
        return 'allow'
    
    return new Promise(resolve => {
        chat._script_approval_resolver = resolve
        chat.set({
            pending_script_approval: {
                id: `script_approval_${Date.now()}`,
                sessionId: session_id,
                messageId: message_id,
                toolName: tool_name,
                script,
                reason,
            },
            agent_status: {
                status: 'tool_running',
                message: reason ? t('检测到破坏性操作被拦截，等待审批...') : t('等待 DolphinDB 脚本执行审批...'),
            },
        })
    })
}


export function clear_pending_script_approval (chat: ChatModel, decision: ScriptExecuteApprovalDecision = 'deny') {
    if (chat._script_approval_resolver || chat.pending_script_approval)
        resolve_script_execution_approval(chat, decision)
}
