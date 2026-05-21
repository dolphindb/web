const DB_NAME = 'ddb.chat.workspace'
const DB_VERSION = 1
const KEY_SEPARATOR = '\u001f'


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


interface ISessionWorkspace {
    session_id: string
    workspace_id: string
    update_time: number
}


function new_id (prefix: string) {
    return `${prefix}_${crypto.randomUUID()}`
}


function now () {
    return Date.now()
}


export function normalize_workspace_path (path: string) {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').trim()
}


function file_key (workspace_id: string, path: string) {
    return `${workspace_id}${KEY_SEPARATOR}${path}`
}


function request_result<T> (request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => { resolve(request.result) }
        request.onerror = () => { reject(request.error) }
    })
}


function transaction_done (transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => { resolve() }
        transaction.onerror = () => { reject(transaction.error) }
        transaction.onabort = () => { reject(transaction.error) }
    })
}


function get_all_from_index<T> (store: IDBObjectStore, index_name: string, key: IDBValidKey): Promise<T[]> {
    return request_result(store.index(index_name).getAll(key)) as Promise<T[]>
}


class ChatWorkspaceStore {
    _db: Promise<IDBDatabase> | null = null
    
    
    db () {
        return this._db ??= new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            
            request.onupgradeneeded = () => {
                const db = request.result
                
                if (!db.objectStoreNames.contains('workspaces'))
                    db.createObjectStore('workspaces', { keyPath: 'workspace_id' })
                    
                if (!db.objectStoreNames.contains('files')) {
                    const store = db.createObjectStore('files', { keyPath: 'key' })
                    store.createIndex('workspace_id', 'workspace_id')
                    store.createIndex('workspace_path', ['workspace_id', 'path'], { unique: true })
                }
                
                if (!db.objectStoreNames.contains('session_workspaces'))
                    db.createObjectStore('session_workspaces', { keyPath: 'session_id' })
                    
                if (!db.objectStoreNames.contains('steps')) {
                    const store = db.createObjectStore('steps', { keyPath: 'id' })
                    store.createIndex('session_id', 'session_id')
                }
            }
            
            request.onsuccess = () => { resolve(request.result) }
            request.onerror = () => { reject(request.error) }
        })
    }
    
    
    async list_workspaces (): Promise<IChatWorkspace[]> {
        const db = await this.db()
        const items = await request_result<IChatWorkspace[]>(db.transaction('workspaces').objectStore('workspaces').getAll())
        return items.sort((a, b) => b.update_time - a.update_time)
    }
    
    
    async create_workspace (name = '新工作区'): Promise<IChatWorkspace> {
        const db = await this.db()
        const time = now()
        const workspace: IChatWorkspace = {
            workspace_id: new_id('workspace'),
            name,
            current_state: '',
            create_time: time,
            update_time: time,
        }
        const transaction = db.transaction('workspaces', 'readwrite')
        transaction.objectStore('workspaces').put(workspace)
        await transaction_done(transaction)
        return workspace
    }
    
    
    async get_workspace (workspace_id: string): Promise<IChatWorkspace | null> {
        if (!workspace_id)
            return null
        const db = await this.db()
        return await request_result<IChatWorkspace | undefined>(
            db.transaction('workspaces').objectStore('workspaces').get(workspace_id)
        ) ?? null
    }
    
    
    async update_workspace_state (workspace_id: string, current_state: string): Promise<IChatWorkspace> {
        const workspace = await this.get_workspace(workspace_id)
        if (!workspace)
            throw new Error('未找到工作区。')
        const updated = { ...workspace, current_state, update_time: now() }
        const db = await this.db()
        const transaction = db.transaction('workspaces', 'readwrite')
        transaction.objectStore('workspaces').put(updated)
        await transaction_done(transaction)
        return updated
    }
    
    
    async ensure_default_workspace (): Promise<IChatWorkspace> {
        const existing = (await this.list_workspaces())[0]
        return existing ?? await this.create_workspace()
    }
    
    
    async bind_session_workspace (session_id: string, workspace_id: string) {
        const db = await this.db()
        const transaction = db.transaction('session_workspaces', 'readwrite')
        transaction.objectStore('session_workspaces').put({
            session_id,
            workspace_id,
            update_time: now(),
        } satisfies ISessionWorkspace)
        await transaction_done(transaction)
    }
    
    
    async get_session_workspace_id (session_id: string): Promise<string> {
        if (!session_id)
            return ''
        const db = await this.db()
        const binding = await request_result<ISessionWorkspace | undefined>(
            db.transaction('session_workspaces').objectStore('session_workspaces').get(session_id)
        )
        return binding?.workspace_id || ''
    }
    
    
    async ensure_session_workspace (session_id: string): Promise<IChatWorkspace> {
        const workspace_id = await this.get_session_workspace_id(session_id)
        const workspace = await this.get_workspace(workspace_id)
        if (workspace)
            return workspace
        const next = await this.ensure_default_workspace()
        await this.bind_session_workspace(session_id, next.workspace_id)
        return next
    }
    
    
    async list_files (workspace_id: string, query_path = ''): Promise<IWorkspaceFile[]> {
        const cleaned_path = normalize_workspace_path(query_path)
        const db = await this.db()
        const store = db.transaction('files').objectStore('files')
        const files = await get_all_from_index<IWorkspaceFile>(store, 'workspace_id', workspace_id)
        return files
            .filter(file => !cleaned_path || file.path === cleaned_path || file.path.startsWith(`${cleaned_path}/`))
            .sort((a, b) => a.path.localeCompare(b.path))
    }
    
    
    async get_file (workspace_id: string, path: string): Promise<IWorkspaceFile | null> {
        const cleaned_path = normalize_workspace_path(path)
        if (!workspace_id || !cleaned_path)
            return null
        const db = await this.db()
        return await request_result<IWorkspaceFile | undefined>(
            db.transaction('files').objectStore('files').get(file_key(workspace_id, cleaned_path))
        ) ?? null
    }
    
    
    async create_file (workspace_id: string, path: string, content: string): Promise<IWorkspaceFile> {
        const cleaned_path = normalize_workspace_path(path)
        if (!cleaned_path)
            throw new Error('Path is required')
        if (await this.get_file(workspace_id, cleaned_path))
            throw new Error(`File already exists: ${cleaned_path}`)
        const time = now()
        const file: IWorkspaceFile = {
            key: file_key(workspace_id, cleaned_path),
            workspace_id,
            path: cleaned_path,
            content,
            create_time: time,
            update_time: time,
        }
        const db = await this.db()
        const transaction = db.transaction('files', 'readwrite')
        transaction.objectStore('files').put(file)
        await transaction_done(transaction)
        return file
    }
    
    
    async update_file_content (workspace_id: string, path: string, content: string): Promise<IWorkspaceFile> {
        const file = await this.get_file(workspace_id, path)
        if (!file)
            throw new Error(`File not found: ${normalize_workspace_path(path)}`)
        const updated = { ...file, content, update_time: now() }
        const db = await this.db()
        const transaction = db.transaction('files', 'readwrite')
        transaction.objectStore('files').put(updated)
        await transaction_done(transaction)
        return updated
    }
    
    
    async delete_file (workspace_id: string, path: string) {
        const cleaned_path = normalize_workspace_path(path)
        if (!await this.get_file(workspace_id, cleaned_path))
            throw new Error(`File not found: ${cleaned_path}`)
        const db = await this.db()
        const transaction = db.transaction('files', 'readwrite')
        transaction.objectStore('files').delete(file_key(workspace_id, cleaned_path))
        await transaction_done(transaction)
    }
    
    
    async list_active_steps (session_id: string): Promise<IWorkspaceStep[]> {
        const db = await this.db()
        const store = db.transaction('steps').objectStore('steps')
        const steps = await get_all_from_index<IWorkspaceStep>(store, 'session_id', session_id)
        return steps.filter(step => step.active).sort((a, b) => a.step_index - b.step_index)
    }
    
    
    async create_step_batch (session_id: string, contents: string[]): Promise<IWorkspaceStep[]> {
        const tasks = contents.map(item => item.trim()).filter(Boolean)
        if (!tasks.length)
            throw new Error('step_create requires at least one task string.')
        const existing = await this.list_active_steps(session_id)
        const db = await this.db()
        const transaction = db.transaction('steps', 'readwrite')
        const store = transaction.objectStore('steps')
        const time = now()
        
        for (const step of existing)
            if (step.active)
                store.put({ ...step, active: false, update_time: time })
                
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
        for (const step of steps)
            store.put(step)
        await transaction_done(transaction)
        return steps
    }
    
    
    async set_step_status_by_index (session_id: string, step_index: number, checked: boolean) {
        const step = (await this.list_active_steps(session_id)).find(item => item.step_index === step_index)
        if (!step)
            throw new Error(`Task not found: ${step_index}`)
        const db = await this.db()
        const transaction = db.transaction('steps', 'readwrite')
        const store = transaction.objectStore('steps')
        store.put({ ...step, checked, update_time: now() })
        await transaction_done(transaction)
    }
    
    
    async clear_steps (session_id: string) {
        const steps = await this.list_active_steps(session_id)
        const db = await this.db()
        const transaction = db.transaction('steps', 'readwrite')
        const store = transaction.objectStore('steps')
        const time = now()
        for (const step of steps)
            if (step.active)
                store.put({ ...step, active: false, update_time: time })
        await transaction_done(transaction)
    }
}


export const chat_workspace_store = new ChatWorkspaceStore()
