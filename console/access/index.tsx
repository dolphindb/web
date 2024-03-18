import './index.sass'

import { useEffect } from 'react'
import { access } from './model.js'
import { model } from '../model.js'

import { AccessView } from './AccessView.js'
import { GroupList } from './GroupList.js'
import { UserList } from './UserList.js'

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
    const { admin } = model.use(['admin'])
    
    useEffect(() => {
        (async () => { 
            if (!access.inited)
                await access.init() 
        })()
    }, [ ])
    
    useEffect(() => {
        if (current && current.role !== role)
            access.set({ current: null })
    }, [ ])
    
    
    return !admin ? <div /> : (current?.view ? 
            <AccessView/> : 
            (role === 'group' ? <GroupList/> : <UserList/>))
}
