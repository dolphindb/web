type ApiFetch = (path: string, options?: RequestInit) => Promise<any>

const STATE_FILE = '__workspace_state.md'
const STEPS_FILE = '__workspace_steps.json'
const INTERNAL_FILES = new Set([STATE_FILE, STEPS_FILE])
const WORKSPACE_FILE_NAME_RULE = 'File name must be a plain file name and cannot contain /, \\, .., or start with .'


export interface IChatWorkspace {
    workspace_id: string
    name: string
    current_state: string
    create_time: number
    update_time: number
}


export interface IWorkspaceFile {
    key: string
    workspace_id: string
    path: string
    content: string
    create_time: number
    update_time: number
    size?: number
    line_count?: number
}


export interface IWorkspaceStep {
    id: string
    session_id: string
    step_index: number
    content: string
    checked: boolean
    active: boolean
    create_time: number
    update_time: number
}


export interface IWorkspaceReadOptions {
    start_line?: number
    end_line?: number
}


export interface IWorkspaceSearchOptions {
    query?: string
    all?: string[]
    any?: string[]
    scope?: string
    caseSensitive?: boolean
    names?: string[]
    extensions?: string[]
    contextLines?: number
    maxResults?: number
    maxPerFile?: number
}


function new_id (prefix: string) {
    return `${prefix}_${crypto.randomUUID()}`
}


function now () {
    return Date.now()
}


function time_value (value: unknown) {
    if (typeof value === 'number')
        return value
    if (typeof value === 'string') {
        const time = Date.parse(value)
        if (Number.isFinite(time))
            return time
    }
    return now()
}


export function normalize_workspace_path (path: string) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').trim()
}


function normalize_workspace_name (path: string) {
    const name = normalize_workspace_path(path)
    if (!name)
        throw new Error('File name is required.')
    if (name.includes('/') || name.includes('..') || name.startsWith('.'))
        throw new Error(`Invalid workspace file name: ${name}. ${WORKSPACE_FILE_NAME_RULE}.`)
    return name
}


function is_file_not_found (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('FILE_NOT_FOUND') || /not found/i.test(message)
}


function map_file (session_id: string, item: any, content = ''): IWorkspaceFile {
    const name = item.name || item.path || ''
    const update_time = time_value(item.updateTime ?? item.update_time)
    return {
        key: `${session_id}:${name}`,
        workspace_id: session_id,
        path: name,
        content,
        create_time: update_time,
        update_time,
        size: item.size,
        line_count: item.lineCount ?? item.line_count,
    }
}


function workspace_file_path (session_id: string, name: string, options: IWorkspaceReadOptions = { }) {
    const search = new URLSearchParams({ name })
    if (options.start_line)
        search.set('startLine', String(options.start_line))
    if (options.end_line)
        search.set('endLine', String(options.end_line))
    return `/workspace/${encodeURIComponent(session_id)}/file?${search}`
}


function parse_steps (session_id: string, content: string): IWorkspaceStep[] {
    try {
        const parsed = JSON.parse(content)
        return Array.isArray(parsed)
            ? parsed.filter(Boolean).map((step, index) => ({
                id: String(step.id || new_id('step')),
                session_id,
                step_index: Number.isInteger(step.step_index) ? step.step_index : index,
                content: String(step.content || ''),
                checked: step.checked === true,
                active: step.active !== false,
                create_time: Number(step.create_time) || now(),
                update_time: Number(step.update_time) || now(),
            }))
            : [ ]
    } catch {
        return [ ]
    }
}


class ChatWorkspaceStore {
    async list_workspaces (session_id = '', api_fetch?: ApiFetch): Promise<IChatWorkspace[]> {
        return session_id && api_fetch ? [await this.get_workspace(session_id, api_fetch)] : [ ]
    }
    
    
    async create_workspace (): Promise<IChatWorkspace> {
        throw new Error('Workspace is managed by session.')
    }
    
    
    async get_workspace (session_id: string, api_fetch: ApiFetch): Promise<IChatWorkspace> {
        const state = await this.read_internal_file(session_id, api_fetch, STATE_FILE)
        return {
            workspace_id: session_id,
            name: '当前会话工作区',
            current_state: state,
            create_time: now(),
            update_time: now(),
        }
    }
    
    
    async update_workspace_state (session_id: string, api_fetch: ApiFetch, current_state: string): Promise<IChatWorkspace> {
        await this.write_file(session_id, api_fetch, STATE_FILE, current_state)
        return this.get_workspace(session_id, api_fetch)
    }


    async ensure_default_workspace (session_id: string, api_fetch: ApiFetch): Promise<IChatWorkspace> {
        return this.get_workspace(session_id, api_fetch)
    }
    
    
    async bind_session_workspace () { }
    
    
    async get_session_workspace_id (session_id: string): Promise<string> {
        return session_id || ''
    }
    
    
    async ensure_session_workspace (session_id: string, api_fetch: ApiFetch): Promise<IChatWorkspace> {
        return this.get_workspace(session_id, api_fetch)
    }
    
    
    async list_files (session_id: string, api_fetch: ApiFetch, query_path = ''): Promise<IWorkspaceFile[]> {
        const cleaned_path = normalize_workspace_path(query_path)
        const result = await api_fetch(`/workspace/${encodeURIComponent(session_id)}/files`)
        return (result.items || [ ])
            .map((item: any) => map_file(session_id, item))
            .filter((file: IWorkspaceFile) => !INTERNAL_FILES.has(file.path))
            .filter((file: IWorkspaceFile) => !cleaned_path || file.path === cleaned_path || file.path.startsWith(cleaned_path))
            .sort((a: IWorkspaceFile, b: IWorkspaceFile) => a.path.localeCompare(b.path))
    }
    
    
    async get_file (session_id: string, api_fetch: ApiFetch, path: string, options: IWorkspaceReadOptions = { }): Promise<IWorkspaceFile | null> {
        const name = normalize_workspace_name(path)
        try {
            const result = await api_fetch(workspace_file_path(session_id, name, options))
            return map_file(session_id, result, result.content || '')
        } catch (error) {
            if (is_file_not_found(error))
                return null
            throw error
        }
    }
    
    
    async create_file (session_id: string, api_fetch: ApiFetch, path: string, content: string): Promise<IWorkspaceFile> {
        const name = normalize_workspace_name(path)
        if (await this.get_file(session_id, api_fetch, name))
            throw new Error(`File already exists: ${name}`)
        await this.write_file(session_id, api_fetch, name, content)
        return await this.get_file(session_id, api_fetch, name) as IWorkspaceFile
    }
    
    
    async update_file_content (session_id: string, api_fetch: ApiFetch, path: string, content: string): Promise<IWorkspaceFile> {
        const name = normalize_workspace_name(path)
        if (!await this.get_file(session_id, api_fetch, name))
            throw new Error(`File not found: ${name}`)
        await this.write_file(session_id, api_fetch, name, content)
        return await this.get_file(session_id, api_fetch, name) as IWorkspaceFile
    }
    
    
    async delete_file (session_id: string, api_fetch: ApiFetch, path: string) {
        const name = normalize_workspace_name(path)
        await api_fetch(workspace_file_path(session_id, name), { method: 'DELETE' })
    }
    
    
    async search_files (session_id: string, api_fetch: ApiFetch, options: IWorkspaceSearchOptions): Promise<any> {
        return api_fetch(`/workspace/${encodeURIComponent(session_id)}/search`, {
            method: 'POST',
            body: JSON.stringify(options),
        })
    }
    
    
    async apply_patch (session_id: string, api_fetch: ApiFetch, path: string, patch: string): Promise<any> {
        const name = normalize_workspace_name(path)
        return api_fetch(`/workspace/${encodeURIComponent(session_id)}/patch`, {
            method: 'POST',
            body: JSON.stringify({ name, patch }),
        })
    }
    
    
    async list_active_steps (session_id: string, api_fetch: ApiFetch): Promise<IWorkspaceStep[]> {
        const content = await this.read_internal_file(session_id, api_fetch, STEPS_FILE)
        return parse_steps(session_id, content).filter(step => step.active).sort((a, b) => a.step_index - b.step_index)
    }
    
    
    async create_step_batch (session_id: string, api_fetch: ApiFetch, contents: string[]): Promise<IWorkspaceStep[]> {
        const tasks = contents.map(item => item.trim()).filter(Boolean)
        if (!tasks.length)
            throw new Error('step_create requires at least one task string.')
        const time = now()
        const steps = tasks.map((content, index) => ({
            id: new_id('step'),
            session_id,
            step_index: index,
            content,
            checked: false,
            active: true,
            create_time: time,
            update_time: time,
        }))
        await this.write_steps(session_id, api_fetch, steps)
        return steps
    }
    
    
    async set_step_status_by_index (session_id: string, api_fetch: ApiFetch, step_index: number, checked: boolean) {
        const steps = await this.list_active_steps(session_id, api_fetch)
        const step = steps.find(item => item.step_index === step_index)
        if (!step)
            throw new Error(`Task not found: ${step_index}`)
        await this.write_steps(session_id, api_fetch, steps.map(item =>
            item.step_index === step_index ? { ...item, checked, update_time: now() } : item
        ))
    }
    
    
    async clear_steps (session_id: string, api_fetch: ApiFetch) {
        try {
            await this.delete_file(session_id, api_fetch, STEPS_FILE)
        } catch (error) {
            if (!is_file_not_found(error))
                throw error
        }
    }


    async write_file (session_id: string, api_fetch: ApiFetch, name: string, content: string) {
        name = normalize_workspace_name(name)
        await api_fetch(`/workspace/${encodeURIComponent(session_id)}/file`, {
            method: 'POST',
            body: JSON.stringify({ name, content }),
        })
    }


    async read_internal_file (session_id: string, api_fetch: ApiFetch, name: string) {
        try {
            const file = await this.get_file(session_id, api_fetch, name)
            return file?.content || ''
        } catch (error) {
            if (is_file_not_found(error))
                return ''
            throw error
        }
    }


    async write_steps (session_id: string, api_fetch: ApiFetch, steps: IWorkspaceStep[]) {
        await this.write_file(session_id, api_fetch, STEPS_FILE, JSON.stringify(steps))
    }
}


export const chat_workspace_store = new ChatWorkspaceStore()
