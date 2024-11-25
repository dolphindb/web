import { useEffect } from 'react'

import { useNavigate } from 'react-router'

import { GitHubAdapter } from '@/shell/git/git-adapter.ts'

export function GitHubOauth () {
    
    const navigate = useNavigate()
    
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        localStorage.setItem('git-access-code', code)
        const git_info = {
            client_id: localStorage.getItem('client_id'),
            redirect_url: localStorage.getItem('redirect_url'),
            client_secret: localStorage.getItem('client_secret')
        }
        const git_provider = new GitHubAdapter()
        git_provider.get_access_token(code, git_info.client_id, git_info.redirect_url, git_info.client_secret).then(token => {
            localStorage.setItem('git-access-token', token)
            localStorage.setItem('git-provider', 'github')
            navigate('/')
        })
    }, [ ])
    
    return <div>Redirecting</div>
}
