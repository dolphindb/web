import './login.sass'

import React from 'react'

import { Form, Input, Button, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { t } from '../i18n/index.js'
import { model } from './model.js'


export function Login () {
    return <>
        <img className='logo' src='./ddb.svg' />
        
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
                        if (error.message.endsWith('The user name or password is incorrect.'))
                            message.error(t('用户名或密码错误'))
                        else
                            model.show_error({ error })
                        throw error
                    }
                    
                    message.success(t('登录成功'))
                    model.goto_redirection()
                }}
            >
                <Form.Item name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
                    <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder={t(' 用户名')} />
                </Form.Item>
                
                <Form.Item name='password' rules={[{ required: true, message: t('请输入密码') }]}>
                    <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder={t(' 密码')} />
                </Form.Item>
                
                <Form.Item>
                    <Button type='primary' htmlType='submit' className='submit'>{t('登录')}</Button>
                </Form.Item>
            </Form>
        </div>
    </>
}
