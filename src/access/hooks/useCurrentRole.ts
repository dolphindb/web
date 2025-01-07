import { useParams, useLocation } from 'react-router'

import type { AccessRole } from '../types.ts'

export function useCurrentRole () {
    const params = useParams()
    const location = useLocation()
  
    const isUser = location.pathname.includes('/user/')
    
    const role = isUser ? 'user' : 'group'
    const name = params.id // 从 URL 参数获取名称
    
    return { role: role as AccessRole, name }
}
