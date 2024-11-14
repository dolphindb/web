import { isArray } from 'lodash'

import { client_id, redirect_uri, root_url } from './constants.ts'

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

interface IGitAdapter {
    root_url: string
    api_root: string
    client_id: string
    get_files_by_repo(repo: string, file_path?: string): Promise<IFile[]>
    get_auth_header(): string
    get_projects(): Promise<IProject[]>
    get_access_token(code: string): Promise<string>
    get_auth_url(): Promise<string>
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
    
    private get_fetch_options () {
        return {
            method: 'GET',
            headers: {
                Authorization: this.get_auth_header(),
                'Content-Type': 'application/json'
            }
        }
    }
    
    // 获取所有项目
    async get_projects (): Promise<IProject[]> {
        const result = await fetch(`${this.root_url}${this.api_root}/projects`, this.get_fetch_options()).then(async res => res.json())
        if (isArray(result))
            return result
        else
            return [ ]
    }
}

export const gitProvider = new GitLabAdapter(root_url, client_id, redirect_uri)
