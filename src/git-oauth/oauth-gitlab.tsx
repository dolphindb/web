import { useEffect } from 'react'
import { redirect, useNavigate } from 'react-router-dom'

import { GitHubAdapter, GitLabAdapter } from '@/shell/git/git-adapter.ts'

export function GitLabOauth () {
    
    const navigate = useNavigate()
    
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        localStorage.setItem('git-access-code', code)
        const git_info = {
            root_url: localStorage.getItem('root_url'),
            client_id: localStorage.getItem('client_id'),
            redirect_url: localStorage.getItem('redirect_url'),
            api_root: localStorage.getItem('api_root') ?? undefined
        }
        const git_provider = new GitLabAdapter()
        git_provider.get_access_token(code, git_info.client_id, git_info.redirect_url).then(token => {
            localStorage.setItem('git-access-token', token)
            localStorage.setItem('git-provider', 'gitlab')
            navigate('/')
        })
    }, [ ])
    
    return <div>Redirecting</div>
}
