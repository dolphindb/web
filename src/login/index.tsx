import './index.sass'

import { useEffect } from 'react'

import { Form, Input, Button } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.ts'

import { model, shf } from '@/model.ts'

import ddb_svg from '@/icons/ddb.svg'
import ddb_italic_svg from '@/icons/ddb.italic.svg'


export function Login () {
    const { logined } = model.use(['logined'])
    
    // 已登录就不显示登录页，回到之前的页面或者主页 (直接打开登录页的情况)
    useEffect(() => {
        if (logined && location.pathname === `${model.assets_root}login/`)
            if (model.pathname_before_login)
                model.navigate(-1)
            else
                model.goto(model.assets_root)
    }, [logined])
    
    return <>
        <img className='logo' src={shf ? ddb_svg : ddb_italic_svg} />
        
        <div className='form-container'>
            <Form
                name='login-form'
                className='form'
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
                    <Button type='primary' htmlType='submit' className='submit'>{t('登录')}</Button>
                </Form.Item>
            </Form>
        </div>
    </>
}
