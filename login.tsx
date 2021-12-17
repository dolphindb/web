import './login.sass'

import React from 'react'

import { Form, Input, Button, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { t } from './i18n'
import model from './model'

export function Login () {
    return <>
        <Typography.Title className='title'>
            <img src='./ico/logo.png' />
            <span>DolphinDB</span>
        </Typography.Title>
        
        <div className='form-container'>
            <Form
                name='login-form'
                className='form'
                layout='vertical'
                initialValues={{
                    username: '',
                    password: ''
                }}
                onFinish={async values => {
                    try {
                        await model.login_by_password(values.username, values.password)
                        model.goto_default_view()
                        message.success(t('登录成功'))
                    } catch (error) {
                        message.error(t('用户名或密码错误'))
                    }
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

export default Login
