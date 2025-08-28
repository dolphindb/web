import './index.sass'

import { Dropdown, Avatar, Layout } from 'antd'

import { DownOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { model } from '@model'

import { LanguageSelect } from './LanguageSelect.tsx'

import { Status } from './Status.tsx'

import { CompileAndRefresh } from './CompileAndRefresh.tsx'
import { HostSelect } from './HostSelect.tsx'
import { License } from './License.tsx'
import { Settings } from './Settings.tsx'
import { Logo } from './Logo.tsx'



export function DdbHeader () {
    const { logined, username } = model.use(['logined', 'username'])
    
    return <Layout.Header className='ddb-header'>
        <Logo header />
        
        { model.dev && <HostSelect />}
        
        { model.local && <CompileAndRefresh /> }
        
        <div className='padding' />
        
        <div className='actions'>
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
        </div>
    </Layout.Header>
}


