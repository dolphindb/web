import { useEffect } from 'react'

import { useNavigate } from 'react-router'

import { GitHubAdapter } from '@/shell/git/git-adapter.ts'
import { GIT_CONSTANTS } from '@/shell/constants.ts'

export function GitHubOauth () {
    
    const navigate = useNavigate()
    
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        localStorage.setItem(GIT_CONSTANTS.ACCESS_CODE, code)
        const git_info = {
            client_id: localStorage.getItem(GIT_CONSTANTS.CLIENT_ID),
            redirect_url: localStorage.getItem(GIT_CONSTANTS.REDIRECT_URL),
            client_secret: localStorage.getItem(GIT_CONSTANTS.CLIENT_SECRET)
        }
        const git_provider = new GitHubAdapter()
        git_provider.get_access_token(code, git_info.client_id, git_info.redirect_url, git_info.client_secret).then(token => {
            localStorage.setItem(GIT_CONSTANTS.ACCESS_TOKEN, token)
            localStorage.setItem(GIT_CONSTANTS.PROVIDER, 'github')
            navigate('/')
        })
    }, [ ])
    
    return <div>Redirecting</div>
}
