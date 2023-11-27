import './index.sass'

import { access } from './model.js'
import { useEffect } from 'react'

import { model } from '../model.js'
import { UserList } from './UserList.js'
import { AccessView } from './AccessView.js'
import { GroupList } from './GroupList.js'

export function User () {
    
    const { current } = access.use(['current'])
    
    useEffect(() => {
        (async () => {
            if (!access.inited)
                try {
                  await access.init()
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
        })()
    }, [ ])
    
    useEffect(() => {
        if (current && current.role === 'group')
            access.set({ current: null })
     }, [ ])
    
    return current && current.role === 'user' && current.view ? <AccessView {...current}/> : <UserList/>
}

export function Group () {
    
    const { current } = access.use(['current'])
    
    useEffect(() => {
        (async () => {
            if (!access.inited)
                try {
                  await access.init()
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
        })()
    }, [ ])
    
    useEffect(() => {
       if (current && current.role === 'user')
           access.set({ current: null })
    }, [ ])
    
    
    return current && current.role === 'group' && current.view ? <AccessView {...current}/> : <GroupList/>
}
