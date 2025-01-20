import './index.sass'
import { useEffect } from 'react'

import { Dropdown, Avatar, Space, Layout } from 'antd'

import { DownOutlined, default as Icon, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.js'

import { model } from '@/model.ts'

import { LanguageSelect } from '../LanguageSelect.tsx'

import { Status } from './Status.tsx'

import { CompileAndRefresh } from './CompileAndRefresh.tsx'
import { HostSelect } from './HostSelect.tsx'
import { License } from './License.tsx'
import { Settings } from './Settings.tsx'



export function DdbHeader () {
    const { logined, username, node_alias } = model.use(['logined', 'username', 'node_alias'])
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    
    return <Layout.Header className='ddb-header'>
        <img className='logo' src={`${model.assets_root}ddb.svg`} />
        
        { model.local && <CompileAndRefresh /> }
        
        <div className='padding' />
        
        <Space size='middle'>
            { model.dev && <HostSelect />}
            
            <Status />
            
            <License />
            
            <Settings />
            
            <LanguageSelect/>
            
            
            <Dropdown
                    menu={{
                        className: 'menu',
                        items: [
                            logined ?
                                {
                                    key: 'logout',
                                    icon: <LogoutOutlined />,
                                    label: <a className='logout' onClick={async () => { await model.logout() }}>{t('注销')}</a>,
                                }
                            :
                                {
                                    key: 'login',
                                    icon: <LoginOutlined />,
                                    label: <a className='login' onClick={async () => { await model.goto_login() }}>{t('登录')}</a>,
                                }
                        ]
                    }}
                >
                    <div className='user'>
                        <Avatar className='avatar' icon={<UserOutlined /> } size='small' />
                        {username}
                        {/* <Icon className='arrow-down' component={SvgArrowDown} /> */}
                        <DownOutlined className='arrow-down'/>
                    </div>
                </Dropdown>
            
            
        </Space>
    </Layout.Header>
}


