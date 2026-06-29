import './index.sass'

import { useEffect } from 'react'

import { Form, Input, Button } from 'antd'
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { model } from '@model'

import { Logo } from '@components/DDBHeader/Logo.tsx'


export function Login () {
    const { logined } = model.use(['logined'])
    
    // 已登录就不显示登录页，回到之前的页面或者主页 (直接打开登录页的情况)
    useEffect(() => {
        const { assets_root } = model
        
        if (!logined || location.pathname !== `${assets_root}login/`)
            return
        
        let path = model.pathname_before_login || '/'
        if (assets_root !== '/' && path.startsWith(assets_root))
            path = '/' + path.strip_start(assets_root)
        
        model.navigate(path === '/login/' ? '/' : path, { replace: true })
        model.pathname_before_login = undefined
    }, [logined])
    
    return <>
        <Logo header={false} />
        
        <Form
            name='login-form'
            className='login-form'
            layout='vertical'
            initialValues={{
                username: model.dev ? 'admin' : '',
                password: model.dev ? '123456' : ''
            }}
            onFinish={async values => {
                try {
                    await model.login_by_password(values.username, values.password)
                } catch (error) {
                    if (error.message.endsWith('The user name or password is incorrect.')) {
                        model.message.error(t('用户名或密码错误'))
                        return 
                    } else
                        throw error
                }
                
                model.message.success(t('登录成功'))
            }}
        >
            <Form.Item name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
                <Input prefix={<UserOutlined className='site-form-item-icon' />} placeholder={t(' 用户名')} />
            </Form.Item>
            
            <Form.Item name='password' rules={[{ required: true, message: t('请输入密码') }]}>
                <Input.Password prefix={<LockOutlined className='site-form-item-icon' />} placeholder={t(' 密码')} />
            </Form.Item>
            
            <Form.Item>
                <Button className='login-button' type='primary' htmlType='submit'>{t('登录')}</Button>
            </Form.Item>
            
            { model.oauth && model.oauth_allow_password_login && <Form.Item>
                <Button className='oauth-button' icon={<LoginOutlined />} onClick={() => { model.goto_oauth() }}>{t('OAuth 登录')}</Button>
            </Form.Item> }
        </Form>
    </>
}
