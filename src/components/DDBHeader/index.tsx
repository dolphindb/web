import './index.sass'
import { useEffect } from 'react'

import { Dropdown, Avatar, Space, Layout } from 'antd'

import { DownOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.js'

import { model } from '@/model.ts'

import { LanguageSelect } from './LanguageSelect.tsx'

import { Status } from './Status.tsx'

import { CompileAndRefresh } from './CompileAndRefresh.tsx'
import { HostSelect } from './HostSelect.tsx'
import { License } from './License.tsx'
import { Settings } from './Settings.tsx'

import ddb_svg from '@/icons/ddb.svg'
import ddb_white_svg from '@/icons/ddb.white.svg'


export function DdbHeader () {
    const { logined, username, node_alias } = model.use(['logined', 'username', 'node_alias'])
    const { shf } = model
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    
    return <Layout.Header className='ddb-header'>
        <img className='logo' src={shf ? ddb_svg : ddb_white_svg} style={shf ? { marginLeft: 6 } : undefined} />
        
        <div className='padding' />
        
        <Space size='middle'>
            { model.local && <CompileAndRefresh /> }
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
                        <Avatar className='avatar' icon={<UserOutlined /> } size={18} />
                        {username}
                        {/* <Icon className='arrow-down' component={SvgArrowDown} /> */}
                        <DownOutlined className='arrow-down'/>
                    </div>
                </Dropdown>
        </Space>
    </Layout.Header>
}


