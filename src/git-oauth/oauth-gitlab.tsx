import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { GitLabAdapter, GIT_CONSTANTS } from '@/shell/git/git-adapter.ts'

export function GitLabOauth () {
    
    const navigate = useNavigate()
    
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        localStorage.setItem(GIT_CONSTANTS.ACCESS_CODE, code)
        const git_info = {
            root_url: localStorage.getItem(GIT_CONSTANTS.ROOT_URL),
            client_id: localStorage.getItem(GIT_CONSTANTS.CLIENT_ID),
            redirect_url: localStorage.getItem(GIT_CONSTANTS.REDIRECT_URL),
            api_root: localStorage.getItem(GIT_CONSTANTS.API_ROOT) ?? undefined
        }
        const git_provider = new GitLabAdapter()
        git_provider.get_access_token(code, git_info.client_id, git_info.redirect_url).then(token => {
            localStorage.setItem(GIT_CONSTANTS.ACCESS_TOKEN, token)
            localStorage.setItem(GIT_CONSTANTS.PROVIDER, 'gitlab')
            navigate('/')
        })
    }, [ ])
    
    return <div>Redirecting</div>
}
