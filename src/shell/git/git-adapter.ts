import { isArray } from 'lodash'

import { t } from '@i18n/index.ts'

import { root_url, client_id, redirect_uri, github_root_url, github_client_id, github_secret } from './constants.ts'

interface IProject {
    id: string
    name: string
    path: string
    path_with_namespace?: string
}

interface IFile {
    id: string
    mode: string
    name: string
    path: string
    type: 'tree' | 'blob' // Add "blob" to handle files as well
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

interface IGitAdapter {
    root_url: string
    api_root: string
    client_id: string
    get_files_by_repo(repo: string, file_path?: string): Promise<IFile[]>
    get_file_by_path(repo: string, file_path: string, ref: string): Promise<IFileData>
    get_auth_header(): string
    get_projects(): Promise<IProject[]>
    get_access_token(code: string): Promise<string>
    get_auth_url(): Promise<string>
    commit_file(repo: string, file_path: string, message: string, branch: string, content: string): Promise<boolean>
}

class GitLabAdapter implements IGitAdapter {
    root_url: string
    api_root: string
    client_id: string
    redirect_uri: string
    
    constructor (root_url: string, client_id: string, redirect_uri: string, api_root = '/api/v4') {
        this.root_url = root_url
        this.api_root = api_root
        this.client_id = client_id
        this.redirect_uri = redirect_uri
    }
    
    // 生成 code_verifier，随机字符串
    private generateCodeVerifier (): string {
        const array = new Uint8Array(43)
        window.crypto.getRandomValues(array)
        return this.base64UrlEncode(array)
    }
    
    // 将字节数组转换为 Base64 URL 编码
    private base64UrlEncode (array: Uint8Array): string {
        let base64 = btoa(String.fromCharCode.apply(null, array))
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    
    // 使用 SHA256 生成 code_challenge
    private async generateCodeChallenge (codeVerifier: string): Promise<string> {
        const encoder = new TextEncoder()
        const data = encoder.encode(codeVerifier)
        return crypto.subtle.digest('SHA-256', data)
            .then(hash => {
                const hashArray = new Uint8Array(hash)
                return this.base64UrlEncode(hashArray)
            })
    }
    
    // 生成 OAuth 认证的 URL
    async get_auth_url (): Promise<string> {
        const codeVerifier = this.generateCodeVerifier()
        localStorage.setItem('git-code-verifier', codeVerifier)
        const codeChallenge = await this.generateCodeChallenge(codeVerifier)
        const authUrl = `${this.root_url}/oauth/authorize?client_id=${this.client_id}&redirect_uri=${encodeURIComponent(this.redirect_uri)}&response_type=code&scope=api&code_challenge=${codeChallenge}&code_challenge_method=S256`
        return authUrl
    }
    
    // 用授权码和 code_verifier 获取访问令牌
    async get_access_token (code: string): Promise<string> {
        const tokenUrl = `${this.root_url}/oauth/token`
        
        const data = {
            client_id: this.client_id,
            client_secret: '',  // 如果是纯客户端应用，通常不需要提供 client_secret
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirect_uri,
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
    async get_files_by_repo (repo: string, file_path = ''): Promise<IFile[]> {
        const result = await fetch(
            `${this.root_url}${this.api_root}/projects/${encodeURIComponent(repo)}/repository/tree?path=${encodeURIComponent(file_path)}`,
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
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${repo}/repository/files/${file_path_encoded}?ref=${ref}`, this.get_fetch_options())
        if (!resp.ok)
            throw new Error(t('获取文件失败，请检查权限'))
        const result = await resp.json()
        const content = this.decodeBase64ToUtf8(result.content)
        return { ...result, content }
    }
    
    async commit_file (repo: string, file_path: string, message: string, content: string, branch = 'main'): Promise<boolean> {
        const resp = await fetch(`${this.root_url}${this.api_root}/projects/${repo}/repository/files/${encodeURIComponent(file_path)}?branch=${branch}`
            , this.get_fetch_options('PUT', JSON.stringify({ branch, message, content, commit_message: message })))
        return resp.ok
    }
    
}

class GitHubAdapter implements IGitAdapter {
    root_url: string
    api_root: string
    client_id: string
    redirect_uri: string
    
    constructor (root_url: string, client_id: string, redirect_uri: string, api_root = '') {
        this.root_url = root_url
        this.api_root = api_root
        this.client_id = client_id
        this.redirect_uri = redirect_uri
    }
    
    async get_auth_url (): Promise<string> {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.client_id}&redirect_uri=${encodeURIComponent(this.redirect_uri)}&scope=repo`
        return authUrl
    }
    
    async get_access_token (code: string): Promise<string> {
        const tokenUrl = 'https://github.com/login/oauth/access_token'
        
        const data = {
            client_id: this.client_id,
            client_secret: github_secret, // **IMPORTANT:** Replace with your actual client secret!
            code: code,
        }
        
        const result = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json' 
            },
            body: JSON.stringify(data) 
        }).then(async res => res.json())
        
        
        if (result.access_token) {
            localStorage.setItem('github-access-token', result.access_token)
            return result.access_token
        } else 
            throw new Error('Failed to get access token')
        
    }
    
    
    get_auth_header (): string {
        return `token ${localStorage.getItem('github-access-token')}` 
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
          id: repo.id.toString(),
          name: repo.name,
          path: repo.full_name, 
          path_with_namespace: repo.full_name 
        }))
       else
          return [ ]
      
    }
    
    
    
    async get_files_by_repo (repo: string, file_path = ''): Promise<IFile[]> {
        const result = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/contents/${file_path}`, this.get_fetch_options()).then(async res => res.json())
        
        return result.map((item: any) => ({
            id: item.sha, 
            mode: item.mode,
            name: item.name,
            path: item.path,
            type: item.type,
            sha: item.sha,
            size: item.size,
            url: item.download_url || item.url // Use download_url for files, url for directories
          }))
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
    
    
    async commit_file (repo: string, file_path: string, message: string, content: string, branch = 'main'): Promise<boolean> {
        const utf8Encoder = new TextEncoder()  
        const contentBytes = utf8Encoder.encode(content)
        const contentBase64 = btoa(String.fromCharCode(...contentBytes))
        
        
        const resp = await fetch(`${this.root_url}${this.api_root}/repos/${repo}/contents/${file_path}`, this.get_fetch_options(
            'PUT',
            {
                message,
                content: contentBase64,
                branch
            }
        ))
        return resp.ok
        
    }
}

export const gitProvider = new GitLabAdapter(root_url, client_id, redirect_uri)
// export const gitProvider = new GitHubAdapter(github_root_url, github_client_id, redirect_uri)
