import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { gitProvider } from '@/shell/git/git-adapter.ts'

export function GitOauth () {
    
    const navigate = useNavigate()
    
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        localStorage.setItem('git-access-code', code)
        gitProvider.get_access_token(code).then(token => {
            localStorage.setItem('git-access-token', token)
            navigate('/')
        })
    }, [ ])
    
    return <div>Redirecting</div>
}
