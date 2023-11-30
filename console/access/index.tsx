import './index.sass'

import { access } from './model.js'
import { useEffect } from 'react'

import { NodeType, model } from '../model.js'
import { UserList } from './UserList.js'
import { AccessView } from './AccessView.js'
import { GroupList } from './GroupList.js'
import { Result } from 'antd'
import { t } from '../../i18n/index.js'

export function User () {
   return <Access role='user'/>
}

export function Group () {
   return <Access role='group'/>
}


function Access ({
    role
}: {
    role: 'group' | 'user'
}) {
    const { current } = access.use(['current'])
    
    useEffect(() => {
        model.execute(async () => { 
            if (!access.inited)
                await access.init() 
        })
    }, [ ])
    
    useEffect(() => {
        if (current && current.role !== role)
            access.set({ current: null })
    }, [ ])
    
    
    if (current?.view)
        return <AccessView/>
    else if (role === 'group')
        return <GroupList/>
    else if (role === 'user')
        return <UserList/>     
}
