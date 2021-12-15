import './login.sass'

import React from 'react'

import { Form, Input, Button, Typography } from 'antd'
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
                    await model.login_by_password(values.username, values.password)
                    model.goto_default_view()
                }}
            >
                <Form.Item name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
                    <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder={t(' 用户名 (默认: admin)')} />
                </Form.Item>
                
                <Form.Item name='password' rules={[{ required: true, message: t('请输入密码') }]}>
                    <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder={t(' 密码 (默认: 123456)')} />
                </Form.Item>
                
                <Form.Item>
                    <Button type='primary' htmlType='submit' className='submit'>{t('登录')}</Button>
                </Form.Item>
            </Form>
        </div>
    </>
}

export default Login
