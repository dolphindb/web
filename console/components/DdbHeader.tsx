import { useEffect } from 'react'

import { Dropdown, Avatar } from 'antd'

import { default as Icon, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'


import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { License } from './License.js'
import { Status } from './Status.js'
import { Settings } from './Settings.js'
import { CompileAndRefresh } from './CompileAndRefresh.js'

import SvgArrowDown from './icons/arrow.down.icon.svg'
import { HostSelect } from './HostSelect.js'



export function DdbHeader () {
    const { logined, username, node_alias } = model.use(['logined', 'username', 'node_alias'])
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    return <>
        <img className='logo' src='./ddb.svg' />
        {(model.dev || model.cdn) && <HostSelect />}
        { model.dev && <CompileAndRefresh /> }
        
        <div className='padding' />
        
        <div className='section'><Status /></div>
        
        <div className='section'><License /></div>
        
        <Settings />
        
        <div className='section'>
            <div className='user'>
                <Dropdown
                    menu={{
                        className: 'menu',
                        items: [
                            logined ?
                                {
                                    key: 'logout',
                                    icon: <LogoutOutlined />,
                                    label: <a className='logout' onClick={() => { model.logout() }}>{t('注销')}</a>,
                                }
                            :
                                {
                                    key: 'login',
                                    icon: <LoginOutlined />,
                                    label: <a className='login' onClick={() => { model.goto_login() }}>{t('登录')}</a>,
                                }
                        ]
                    }}
                >
                    <a className='username'>
                        <Avatar className='avatar' icon={<UserOutlined /> } size='small' />{username}<Icon className='arrow-down' component={SvgArrowDown} />
                    </a>
                </Dropdown>
            </div>
        </div>
    </>
}
