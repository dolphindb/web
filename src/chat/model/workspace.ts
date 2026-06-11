import { chat_workspace_store } from '@/chat/workspace.ts'
import type { IChatWorkspace, IWorkspaceStep } from '@/chat/workspace.ts'

export const chat_model_workspace_actions = {
    async load_workspaces (this: any) {
        const workspaces = await chat_workspace_store.list_workspaces(this.current_session_id, (path, options) => this.api_fetch(path, options))
        this.set({ workspaces })
        return workspaces
    },
    
    
    async create_workspace (this: any, name?: string): Promise<IChatWorkspace> {
        return chat_workspace_store.create_workspace()
    },
    
    
    async load_steps (this: any, session_id = this.current_session_id): Promise<IWorkspaceStep[]> {
        if (!session_id) {
            this.set({ steps: [ ] })
            return [ ]
        }
        const steps = await chat_workspace_store.list_active_steps(session_id, (path, options) => this.api_fetch(path, options))
        if (session_id === this.current_session_id)
            this.set({ steps })
        return steps
    },
    
    
    async refresh_workspace_context (this: any, session_id = this.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.ensure_session_workspace(session_id, (path, options) => this.api_fetch(path, options))
        const [workspaces, steps] = await Promise.all([
            chat_workspace_store.list_workspaces(session_id, (path, options) => this.api_fetch(path, options)),
            chat_workspace_store.list_active_steps(session_id, (path, options) => this.api_fetch(path, options)),
        ])
        if (session_id === this.current_session_id)
            this.set({
                workspaces,
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                steps,
            })
    },
    
    
    async select_workspace (this: any, _workspace_id: string, session_id = this.current_session_id) {
        if (!session_id)
            return
        const workspace = await chat_workspace_store.get_workspace(session_id, (path, options) => this.api_fetch(path, options))
        if (session_id === this.current_session_id)
            this.set({
                current_workspace_id: workspace.workspace_id,
                current_workspace: workspace,
                workspaces: await chat_workspace_store.list_workspaces(session_id, (path, options) => this.api_fetch(path, options)),
            })
    }
}

export type ChatModelWorkspaceActions = typeof chat_model_workspace_actions
