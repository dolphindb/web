import './index.sass'

import { useEffect } from 'react'
import { Result } from 'antd'

import { model } from '../model.js'

import { t } from '../../i18n/index.js'

import { access } from './model.js'

import { AccessView } from './AccessView.js'
import { GroupList } from './GroupList.js'
import { UserList } from './UserList.js'


export function User () {
    return <Access role='user' />
}

export function Group () {
    return <Access role='group' />
}


function Access ({ role }: { role: 'group' | 'user' }) {
    const { current, inited } = access.use(['current', 'inited'])
    const { admin } = model.use(['admin'])
    
    useEffect(() => {
        if (admin && !inited)
            access.init()
    }, [ admin, inited])
    
    
    useEffect(() => {
        if (current && current.role !== role)
            access.set({ current: { role } })
        return () => { access.set({ current: null, inited: false }) }
    }, [role])
    
    return admin ? (
        current?.view ?
            <AccessView />
            : role === 'group' ?
                <GroupList />
                :
                <UserList />
    ) :
        <Result status='warning' className='interceptor' title={t('非管理员不能查看权限管理模块。')} />
}
