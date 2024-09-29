import { useEffect } from 'react'

import { Dropdown, Avatar } from 'antd'

import { default as Icon, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'


import { t } from '@i18n/index.js'


import dayjs from 'dayjs'

import { date_format } from 'xshell/utils.browser.js'

import { model, storage_keys } from '@/model.ts'

import { License } from './License.js'
import { Status } from './Status.js'
import { Settings } from './Settings.js'
import { CompileAndRefresh } from './CompileAndRefresh.js'
import { HostSelect } from './HostSelect.js'

import SvgArrowDown from './icons/arrow.down.icon.svg'


export function DdbHeader () {
    const { logined, username, node_alias, admin, license } = model.use(['logined', 'username', 'node_alias', 'admin', 'license'])
    
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    // 在 admin 状态变化时，弹提示
    useEffect(() => {
        function check_license_expiration () {
            if (checked_expired)
                return
            
            checked_expired = true
            const license = model.license
            
            // license.expiration 是以 date 为单位的数字
            const expiration_date = dayjs(license.expiration)
            const now = dayjs()
            const after_two_week = now.add(2, 'week')
            const is_license_expired = now.isAfter(expiration_date, 'day')
            const is_license_expire_soon = after_two_week.isAfter(expiration_date, 'day')
            
            const skip_expired_date = localStorage.getItem(storage_keys.license_notified_date)
            if (skip_expired_date === now.format(date_format))
                return
                
            if (is_license_expired)
                model.modal.error({
                    title: t('License 过期提醒'),
                    content: t('DolphinDB License 已过期，请联系管理人员立即更新，避免数据库关闭'),
                    width: 600,
                    onOk: () => { localStorage.setItem(storage_keys.license_notified_date, now.format(date_format)) },
                })
            else if (is_license_expire_soon)
                model.modal.warning({
                    title: t('License 过期提醒'),
                    content: t('DolphinDB License 将在两周内过期，请提醒管理人员及时更新，避免数据库过期后自动关闭'),
                    width: 700,
                    onOk: () => { localStorage.setItem(storage_keys.license_notified_date, now.format(date_format)) },
                })
                
        }
        
        if (admin && license)
            check_license_expiration()
    }, [admin, license])
    
    return <>
        <img className='logo' src='./ddb.svg' />
        {(model.dev || model.test) && <HostSelect />}
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
                    <a className='username'>
                        <Avatar className='avatar' icon={<UserOutlined /> } size='small' />{username}<Icon className='arrow-down' component={SvgArrowDown} />
                    </a>
                </Dropdown>
            </div>
        </div>
    </>
}

let checked_expired = false
