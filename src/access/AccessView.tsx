import { useEffect } from 'react'

import { AccessTabs } from './components/access/AccessTabs.tsx'
import { AccessList } from './AccessList.tsx'
import { access } from './model.ts'
import type { AccessCategory } from './types.ts'
import { AccessManage } from './AccessManage.tsx'

export function AccessViewPage () {
    const { current } = access.use(['current'])
    const { role, name } = current
    
    useEffect(() => {
        (async () => {
            access.set({ 
                accesses: role === 'user' 
                    ? (await access.get_user_access([name]))[0] 
                    : (await access.get_group_access([name]))[0] 
            })
        })()
    }, [role, name])
    
    return <AccessTabs>
            {(category: AccessCategory) => <AccessList category={category} />}
        </AccessTabs>
}


export function AccessManagePage () {
    const { current } = access.use(['current'])
    const { role, name } = current
    
    useEffect(() => {
        (async () => {
            access.set({ 
                accesses: role === 'user' 
                    ? (await access.get_user_access([name]))[0] 
                    : (await access.get_group_access([name]))[0] 
            })
        })()
    }, [role, name])
    
    return <AccessTabs>
            {(category: AccessCategory) => <AccessManage category={category} />}
        </AccessTabs>
}
