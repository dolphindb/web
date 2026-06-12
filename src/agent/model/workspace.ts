import type { ChatModel } from '@/agent/model.ts'
import { chat_workspace_store } from '@/agent/workspace.ts'
import type { IChatWorkspace, IWorkspaceStep } from '@/agent/workspace.ts'

export class ChatWorkspaceModel {
    constructor (private chat: ChatModel) { }
    async load_workspaces () {
        const workspaces = await chat_workspace_store.list_workspaces(this.chat.current_session_id, (path, options) => this.chat.agent.api_fetch(path, options))
        this.chat.set({ workspaces })
        return workspaces
    }
    async create_workspace (name?: string): Promise<IChatWorkspace> {
        return chat_workspace_store.create_workspace()
    }
    async load_steps (session_id = this.chat.current_session_id): Promise<IWorkspaceStep[]> {
        if (!session_id) {
            this.chat.set({ steps: [ ] })
            return [ ]
        }
        const steps = await chat_workspace_store.list_active_steps(session_id, (path, options) => this.chat.agent.api_fetch(path, options))
        if (session_id === this.chat.current_session_id)
            this.chat.set({ steps })
        return steps
    }
    async refresh_workspace_context (session_id = this.chat.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.ensure_session_workspace(session_id, (path, options) => this.chat.agent.api_fetch(path, options))
        const [workspaces, steps] = await Promise.all([
            chat_workspace_store.list_workspaces(session_id, (path, options) => this.chat.agent.api_fetch(path, options)),
            chat_workspace_store.list_active_steps(session_id, (path, options) => this.chat.agent.api_fetch(path, options)),
        ])
        if (session_id === this.chat.current_session_id)
            this.chat.set({
                workspaces,
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                steps,
            })
    }
    async select_workspace (_workspace_id: string, session_id = this.chat.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.get_workspace(session_id, (path, options) => this.chat.agent.api_fetch(path, options))
        if (session_id === this.chat.current_session_id)
            this.chat.set({
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                workspaces: await chat_workspace_store.list_workspaces(session_id, (path, options) => this.chat.agent.api_fetch(path, options)),
            })
    }
}
