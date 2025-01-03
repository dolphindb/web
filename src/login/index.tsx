import './index.sass'

import { Form, Input, Button } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'

import { delay } from 'xshell/utils.browser.js'

import { t } from '@i18n/index.ts'

import { model } from '@/model.ts'


export function Login () {
    return <>
        <img className='logo' src={`${model.assets_root}ddb.svg`} />
        
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
                    
                    model.navigate(-1)
                    
                    // 防止登陆后一直在登录页面 (比如首次打开就是登录页面的情况)
                    await delay(100)
                    if (location.pathname === '/login/')
                        model.goto('/')
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
