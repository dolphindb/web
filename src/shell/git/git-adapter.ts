import { isArray } from 'lodash'

import { t } from '@i18n/index.ts'

import { model } from '@/model.ts'

interface IProject {
    id: string
    name: string
    description: string | null
    last_activity_at: string
    path: string
    default_branch: string
    path_with_namespace?: string
}

interface IFile {
    id: string
    mode: string
    name: string
    path: string
    type: 'tree' | 'blob' | 'file' // Add "blob" to handle files as well
    sha?: string          // Optional SHA for the content
    size?: number         // Optional size for files (type: "blob")
    url?: string          // Optional URL to access the content
}

interface IFileData {
    file_name: string
    file_path: string
    size: number
    encoding: string
    content: string
    content_sha256: string
    ref: string
    blob_id: string
    commit_id: string
    last_commit_id: string
    execute_filemode: boolean
}

export interface IFileBlame {
    commit: {
        id: string
        message: string
        committed_date: string
        committer_name: string
        committer_email: string
    }
    lines: string[]
}

interface IGitAdapter {
    root_url: string
    api_root: string
    get_files_by_repo(repo: string, file_path?: string, branch?: string): Promise<IFile[]>
    get_file_by_path(repo: string, file_path: string, ref: string): Promise<IFileData>
    get_auth_header(): string
    get_projects(): Promise<IProject[]>
    get_project(id: string): Promise<IProject>
    get_branches(repo: string): Promise<string[]>
    get_access_token(code: string, client_id: string, redirect_uri?: string, secret?: string): Promise<string>
    commit_file(repo: string, file_path: string, message: string, branch: string, content: string, sha?: string, create?: boolean): Promise<boolean>
    get_file_blame(repo: string, file_path: string, ref: string): Promise<IFileBlame[]>
}

export class GitLabAdapter implements IGitAdapter {
    root_url: string = 'https://gitlab.com'
    api_root: string = '/api/v4'
    
    constructor () {
        this.root_url = localStorage.getItem('root_url') || this.root_url
        this.api_root = localStorage.getItem('api_root') || this.api_root
    }
    
    // 用授权码和 code_verifier 获取访问令牌
    async get_access_token (code: string, client_id: string, redirect_uri: string): Promise<string> {
        const tokenUrl = `${this.root_url}/oauth/token`
        
        const data = {
            client_id: client_id,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirect_uri,
            code_verifier: localStorage.getItem('git-code-verifier')
        }
        
        const result = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(data)
        }).then(async res => res.json())
        
        if (result.access_token) {
            localStorage.setItem('git-access-token', result.access_token)
            return result.access_token
        } else
            throw new Error('Failed to get access token')
            
    }
    
    // 获取文件列表
    async get_files_by_repo (repo: string, file_path = '', branch = 'main'): Promise<IFile[]> {
        const result = await fetch(
            `${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/tree?path=${encodeURIComponent(file_path)}&ref=${branch}&per_page=1000`,
            this.get_fetch_options()
        ).then(async res => res.json())
        return result
    }
    
    // 获取 GitLab 认证头
    get_auth_header (): string {
        return `Bearer ${localStorage.getItem('git-access-token')}`
    }
    
    private get_fetch_options (method = 'GET', body?) {
        return {
            method,
            headers: {
                Authorization: this.get_auth_header(),
                'Content-Type': 'application/json'
            },
            body
        }
    }
    
    // 获取所有项目
    async get_projects (): Promise<IProject[]> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects?per_page=100&membership=true`, this.get_fetch_options())
        const result = await resp.json()
        if (isArray(result))
            return result
        else
            return [ ]
    }
    
    async get_project (id: string): Promise<IProject> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${id}`, this.get_fetch_options())
        const result = await resp.json()
        return result
    }
    
    async get_branches (repo: string): Promise<string[]> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/branches`, this.get_fetch_options())
        const result = await resp.json()
        return result.map((b: any) => b.name)
    }
    
    private decodeBase64ToUtf8 (base64: string): string {
        // Step 1: 解码 Base64，得到一个字节数组
        const binaryString = atob(base64)
        
        // Step 2: 将二进制字符串转换为字节数组
        const byteArray = new Uint8Array(binaryString.length)
        for (let i = 0;  i < binaryString.length;  i++)
            byteArray[i] = binaryString.charCodeAt(i)
            
            
        // Step 3: 使用 TextDecoder 将字节数组解码为 UTF-8 字符串
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(byteArray)
    }
    
    
    async get_file_by_path (repo: string, file_path: string, ref = 'main'): Promise<IFileData> {
        const file_path_encoded = encodeURIComponent(file_path)
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/files/${file_path_encoded}?ref=${ref}`, this.get_fetch_options())
        if (!resp.ok)
            throw new Error(t('获取文件失败，请检查权限'))
        const result = await resp.json()
        const content = this.decodeBase64ToUtf8(result.content)
        return { ...result, content }
    }
    
    async commit_file (repo: string, file_path: string, message: string, content: string, branch = 'main', sha?: string, create = false): Promise<boolean> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/files/${encodeURIComponent(file_path)}?branch=${branch}`
            , this.get_fetch_options(create ? 'POST' : 'PUT', JSON.stringify({ branch, message, content, commit_message: message })))
        return resp.ok
    }
    
    async get_file_blame (repo: string, file_path: string, ref: string): Promise<IFileBlame[]> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/files/${encodeURIComponent(file_path)}/blame?ref=${ref}`
            , this.get_fetch_options())
        const result = await resp.json()
        return result
    }
}

export class GitHubAdapter implements IGitAdapter {
    root_url: string = 'https://api.github.com'
    api_root: string = ''
    
    constructor () { }
    async get_file_blame (repo: string, file_path: string, ref: string): Promise<IFileBlame[]> {
        throw new Error('Method not implemented.')
    }
    
    async get_access_token (code: string, client_id: string, redirect_uri?: string, secret?: string): Promise<string> {
        const tokenUrl = 'https://github.com/login/oauth/access_token'
        
        const data = {
            client_id: client_id,
            client_secret: secret,
            code: code,
        }
        
        try {
            let script = `
            param=${JSON.stringify(data)};
            ret = httpClient::httpPost('${tokenUrl}', param, 1000, 'Accept: application/json');
            ret
            `
            
            const result = await model.ddb.execute(script)
            
            const text = result.text as string
            const result_data = JSON.parse(text)
            
            if (result_data.access_token) {
                localStorage.setItem('git-access-token', result_data.access_token)
                return result_data.access_token
            } else
                throw new Error('Failed to get access token')
                
        } catch (error) {
            throw error
        }
        
    }
    
    
    get_auth_header (): string {
        return `token ${localStorage.getItem('git-access-token')}`
    }
    
    
    private get_fetch_options (method = 'GET', body?: any) {
        return {
            method,
            headers: {
                Authorization: this.get_auth_header(),
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: body ? JSON.stringify(body) : null
        }
    }
    
    
    async get_projects (): Promise<IProject[]> {
        const resp = await fetch(`${this.root_url}${this.api_root}/user/repos`, this.get_fetch_options())
        const result = await resp.json()
        if (isArray(result))
            return result.map((repo: any) => ({
                id: String(repo.id),
                name: repo.name,
                path: repo.full_name,
                description: repo.description,
                last_activity_at: repo.updated_at,
                path_with_namespace: repo.full_name,
                default_branch: repo.default_branch
            }))
        else
            return [ ]
            
    }
    
    async get_project (id: string): Promise<IProject> {
        const resp = await fetch(`${this.root_url}${this.api_root}/repositories/${id}`, this.get_fetch_options())
        const result = await resp.json()
        return {
            id: String(result.id),
            name: result.name,
            path: result.full_name,
            description: result.description,
            last_activity_at: result.updated_at,
            path_with_namespace: result.full_name,
            default_branch: result.default_branch
        }
    }
    
    async get_branches (repo: string): Promise<string[]> {
        const resp = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/branches`, this.get_fetch_options())
        const result = await resp.json()
        return result.map((b: any) => b.name)
    }
    
    async get_files_by_repo (repo: string, file_path = '', branch = 'main'): Promise<IFile[]> {
        const result = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/contents/${file_path}?ref=${branch}`, this.get_fetch_options()).then(async res => res.json())
        
        const ret = result.map((item: any) => ({
            id: '',
            mode: '',
            name: item.name,
            path: item.path,
            type: item.type
        }))
        
        console.log(ret)
        
        return ret
    }
    
    
    
    private decodeBase64ToUtf8 (base64: string): string {
        const binaryString = atob(base64)
        const utf8Decoder = new TextDecoder('utf-8')
        return utf8Decoder.decode(new Uint8Array([...binaryString.split('').map(char => char.charCodeAt(0))]))
        
    }
    
    
    
    async get_file_by_path (repo: string, file_path: string, ref = 'main'): Promise<IFileData> {
        const resp = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/contents/${file_path}?ref=${ref}`, this.get_fetch_options())
        
        if (!resp.ok)
            throw new Error(t('获取文件失败，请检查权限'))
            
            
        const result = await resp.json()
        const content = this.decodeBase64ToUtf8(result.content)
        
        
        return {
            file_name: result.name,
            file_path: result.path,
            size: result.size,
            encoding: 'base64',
            content,
            content_sha256: result.sha,
            ref,
            blob_id: result.sha,
            commit_id: result.sha,
            last_commit_id: result.sha,
            execute_filemode: result.executable || false
        } as IFileData
        
    }
    
    async commit_file (repo: string, file_path: string, message: string, content: string, branch = 'main', sha?: string, create = false): Promise<boolean> {
        const utf8Encoder = new TextEncoder()
        const contentBytes = utf8Encoder.encode(content)
        const contentBase64 = btoa(String.fromCharCode(...contentBytes))
        const resp = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/contents/${file_path}`, this.get_fetch_options(
            create ? 'POST' : 'PUT',
            {
                message,
                content: contentBase64,
                branch,
                sha
            }
        ))
        return resp.ok
        
    }
}

export const git_provider = localStorage.getItem('git-provider') === 'github' ? new GitHubAdapter() : new GitLabAdapter()
