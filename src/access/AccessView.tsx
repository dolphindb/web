import { useEffect } from 'react'

import { useParams, useLocation } from 'react-router'

import { AccessTabs } from './components/access/AccessTabs.tsx'
import { AccessList } from './AccessList.tsx'
import type { AccessCategory } from './types.ts'
import { AccessManage } from './AccessManage.tsx'

export function AccessViewPage () {
    const params = useParams()
    const location = useLocation()
  
    const isUser = location.pathname.includes('/user/')
    
    const role = isUser ? 'user' : 'group'
    const name = params.id // 从 URL 参数获取名称
    
    return <AccessTabs role={role} name={name} mode='view'>
            {(category: AccessCategory) => <AccessList role={role} name={name} category={category} />}
        </AccessTabs>
}


export function AccessManagePage () {
    const params = useParams()
    const location = useLocation()
  
    const isUser = location.pathname.includes('/user/')
    
    const role = isUser ? 'user' : 'group'
    const name = params.id // 从 URL 参数获取名称
    
    return <AccessTabs role={role} name={name} mode='manage'>
            {(category: AccessCategory) => <AccessManage role={role} name={name} category={category} />}
        </AccessTabs>
}
