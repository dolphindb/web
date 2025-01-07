import { useParams, useLocation } from 'react-router'

import { AccessTabs } from './components/access/AccessTabs.tsx'
import { AccessList } from './AccessList.tsx'
import type { AccessCategory } from './types.ts'
import { AccessManage } from './AccessManage.tsx'
import { useCurrentRole } from './hooks/useCurrentRole.ts'

export function AccessViewPage () {
    const { role, name } = useCurrentRole()
    
    return <AccessTabs role={role} name={name} mode='view'>
            {(category: AccessCategory) => <AccessList role={role} name={name} category={category} />}
        </AccessTabs>
}


export function AccessManagePage () {
    const { role, name } = useCurrentRole()
    
    return <AccessTabs role={role} name={name} mode='manage'>
            {(category: AccessCategory) => <AccessManage role={role} name={name} category={category} />}
        </AccessTabs>
}
