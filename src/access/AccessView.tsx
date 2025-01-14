import { useParams } from 'react-router'

import { AccessTabs } from './components/access/AccessTabs.tsx'
import { AccessList } from './AccessList.tsx'
import type { AccessCategory } from './types.ts'
import { AccessManage } from './AccessManage.tsx'

export function AccessViewPage ({ role }: { role: 'user' | 'group' }) {
    const query = useParams()
    const name = query.id
    
    return <AccessTabs role={role} name={name} mode='view'>
            {(category: AccessCategory) => <AccessList role={role} name={name} category={category} />}
        </AccessTabs>
}


export function AccessManagePage ({ role }: { role: 'user' | 'group' }) {
    const query = useParams()
    const name = query.id
    
    return <AccessTabs role={role} name={name} mode='manage'>
            {(category: AccessCategory) => <AccessManage role={role} name={name} category={category} />}
        </AccessTabs>
}
