import './index.sass'
import { useRoutes, Navigate } from 'react-router'

import { Result } from 'antd'

import { t } from '@i18n/index.ts'

import { model } from '@/model.ts'

import { AccessManagePage, AccessViewPage } from './AccessView.tsx'
import { GroupList } from './GroupList.tsx'
import { UserList } from './UserList.tsx'

function AccessGuard ({ children }) {
    const { admin } = model.use(['admin'])
    
    if (!admin)
        return <Result status='warning' className='interceptor' title={t('非管理员不能查看权限管理模块。')} />
        
    return children
}

export function Access () {
    return <AccessGuard>{useRoutes([
        {
            index: true,
            element: <Navigate to='/access/user' replace />
        },
        {
            path: 'user',
            children: [
                {
                    index: true,
                    element: <UserList />
                },
                {
                    path: ':id',
                    children: [
                        {
                            index: true,
                            element: <Navigate to='view' replace />
                        },
                        {
                            path: 'view',
                            element: <AccessViewPage />
                        },
                        {
                            path: 'manage',
                            element: <AccessManagePage />
                        }
                    ]
                }
            ]
        },
        {
            path: 'group',
            children: [
                {
                    index: true,
                    element: <GroupList />
                },
                {
                    path: ':id',
                    children: [
                        {
                            index: true,
                            element: <Navigate to='view' replace />
                        },
                        {
                            path: 'view',
                            element: <AccessViewPage />
                        },
                        {
                            path: 'manage',
                            element: <AccessManagePage />
                        }
                    ]
                }
            ]
        }
    ])}</AccessGuard>
}
