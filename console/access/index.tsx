import './index.sass'

import { Breadcrumb } from 'antd'
import { t } from '../../i18n/index.js'

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
    
    
    return current && current.role === 'user' ? <AccessView {...current}/> : <UserList/>
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
    
    
    return current && current.role === 'group' ? <AccessView {...current}/> : <GroupList/>
}
