import 'xshell/scroll-bar.sass'

import './index.sass'

import { useEffect, useState } from 'react'

import { createRoot as create_root } from 'react-dom/client'

import { Button, ConfigProvider, Form, Input, Layout, Menu, Modal, Typography, Avatar, Dropdown, App } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'


import {
    default as Icon,
    DoubleLeftOutlined,
    DoubleRightOutlined,
    LockOutlined,
    UserOutlined,
    DownOutlined,
    EditOutlined,
    LoginOutlined
} from '@ant-design/icons'
const { Text } = Typography

import { language, t } from '../i18n/index.js'

import Cookies from 'js-cookie'

import { CloudModel, model, PageViews } from './model.js'
import { Cloud } from './cloud.js'
import { Shell } from './shell.js'
import SvgCluster from './cluster.icon.svg'
import SvgLog from './log.icon.svg'


const locales = { zh, en, ja, ko }


const svgs: { [key in PageViews]: any } = {
    cluster: SvgCluster,
    log: SvgLog,
} as const


create_root(
    document.querySelector('.root')
).render(<Root />)


function Root () {
    return <ConfigProvider
        locale={locales[language] as any}
        autoInsertSpaceInButton={false}
        theme={{ hashed: false, token: { borderRadius: 0 } }}
    >
        <App className='app'>
            <DolphinDB />
        </App>
    </ConfigProvider>
}


function DolphinDB () {
    const { authed, inited, is_shell, username } = model.use(['authed', 'inited', 'is_shell', 'username'])
    
    Object.assign(model, App.useApp())
    
    const [form] = Form.useForm()
    
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    
    useEffect(() => {
        // 最开始状态一定为 pending，此时判断之前是否已经登录过，如果登录过则 authed 直接设置为 yes
        (async () => {
            try {
                await model.check_authed()
            } catch (error) {
                // check_authed 未认证不会抛出异常，而是 return false。只有非预期的错误才会抛出异常
                model.modal.error({
                    title: t('出错了'),
                    content: error.message,
                })
                throw error
            }
        })()
    }, [ ])
    
    useEffect(() => {
        if (authed === 'yes')
            model.init()
    }, [authed])
    
    if (authed === 'pending')
        return null
    
    return authed === 'no' ? // 未登录直接返回登录框 Modal
        <Modal
            className='db-shell-modal'
            width='380px'
            open
            closable={false}
        >
            {/* 这个图片实际上在 ../console/ddb.svg。因打包需要，使用 ./ddb.svg，并在 build.ts 和 dev.ts 中特殊处理。 */}
            <img className='logo' src='./ddb.svg' />
            
            <Form
                name='login-form'
                onFinish={async ({ username, password }: { username: string, password: string }) => {
                    try {
                        await model.auth(username, password)
                    } catch (error) {
                        model.modal.error({
                            title: t('登录失败'),
                            content: error.message,
                        })
                        
                        throw error
                    }
                    
                    form.resetFields(['password'])
                }}
                className='db-modal-form'
                form={form}
            >
                <Form.Item name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
                    <Input prefix={<UserOutlined />} placeholder={t('请输入用户名')} />
                </Form.Item>
                
                <Form.Item name='password' rules={[{ required: true, message: t('请输入密码') }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder={t('请输入密码')} />
                </Form.Item>
                
                <Form.Item className='db-modal-content-button-group'>
                    <Button type='primary' htmlType='submit'>
                        {t('登录')}
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    :  // 已登录则根据是否完成初始化来决定要不要渲染主界面
        inited && <Layout className='root-layout'>
            <Layout.Header className='ddb-header'>
                <DdbHeader />
                <div className='user'>
                    <Dropdown
                        className='dbd-user-popover'
                        menu={{
                            items: [
                                {
                                    key: 'reset',        
                                    icon: <EditOutlined />,
                                    label: <a className='reset' onClick={() => { setIsModalOpen(true) }}>{t('修改密码')}</a>
                                },
                                {
                                    key: 'login',
                                    icon: <LoginOutlined />,
                                    label: <a className='login' onClick={() => { 
                                            Cookies.remove('jwt', { path: '/v1/' })
                                            model.set({ authed: 'no' })
                                        }}
                                        >{t('登出')}</a>,
                                }
                            ]
                        }}
                    >
                        <a className='username'>
                            <Avatar className='avatar' icon={<UserOutlined /> } size='small' />{username} <DownOutlined />
                        </a>
                    </Dropdown>
                </div>
            </Layout.Header>
            {is_shell ?
                <div className='view shell' >
                    <Shell />
                </div>
            :
                <Layout className='body' hasSider>
                    <DdbSider />
                    <Layout.Content className='view'>
                        <DdbContent />
                    </Layout.Content>
                </Layout>
            }
            <Modal
                className='db-shell-modal'
                width='380px'
                open={isModalOpen}
                closable={false}
                afterClose={() => form.resetFields()}
            >
            {/* 这个图片实际上在 ../console/ddb.svg。因打包需要，使用 ./ddb.svg，并在 build.ts 和 dev.ts 中特殊处理。 */}
            <img className='logo' src='./ddb.svg' />
                <Form
                    name='reset-form'
                 
                    onFinish={async ({ new_password, repeat_password }: { new_password: string, repeat_password: string }) => {
                        try {
                            if (new_password === repeat_password) {
                                setIsModalOpen(false)
                                try {
                                    await model.change_password(username, new_password)
                                } catch (error) {      
                                    model.show_json_error(error)
                                    throw error
                                }
                                model.set({ authed: 'no' })
                                Cookies.remove('jwt', { path: '/v1/' })
                                form.resetFields(['new_password', 'repeat_password'])
                            }
                        } catch (error) {
                            model.modal.error({
                                title: t('修改失败'),
                                content: error.message,
                            })
                            throw error
                        }
                    }}
                    className='db-modal-form'
                    form={form}
                >
                    <Form.Item name='new_password' rules={[{ required: true, message: t('请输入新密码') }]}>
                        <Input.Password autoComplete='false' prefix={<LockOutlined />} placeholder={t('请输入新密码')} />
                    </Form.Item>
                    
                    <Form.Item name='repeat_password' dependencies={['new_password']} rules={[{ required: true, message: t('请重新输入新密码') }, ({ getFieldValue }) => ({ async validator ( rule, value ) {
                                if (!value || getFieldValue('new_password') === value) 
                                    return
                                else
                                    throw new Error('两次密码输入不一致')
                            }
                        })]}>
                        <Input.Password autoComplete='false' prefix={<LockOutlined />} placeholder={t('请重新输入新密码')} />
                    </Form.Item>
                    
                    <Form.Item className='db-modal-content-button-group'>
                        <Button type='primary' htmlType='submit' >
                            {t('确认')}
                        </Button>
                        <Button type='primary' onClick={() => { setIsModalOpen(false) }}>
                            {t('取消')}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
}


function DdbHeader () {
    return <>
        <img className='logo' src='./cloud.svg' />
        
        <div className='padding' />
    </>
}


const views: { [key in PageViews]: () => JSX.Element } = {
    cluster: Cloud,
    log: Log
} as const

function Log () {
    // k8s 要求 url 参数部分完全写死
    return <iframe className='log-iframe' src={model.monitor_url + '/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22refId%22:%22A%22%7D%5D'} />
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={view}>
        <View />
    </div>
}

function MenuIcon ({ view }: { view: CloudModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}


function DdbSider () {
    const { view, collapsed } = model.use(['view', 'collapsed'])
    
    return <Layout.Sider
        width={120}
        className='sider'
        theme='light'
        collapsible
        collapsedWidth={50}
        collapsed={collapsed}
        trigger={<div className={`collapse-trigger ${collapsed ? 'collapsed' : 'expand'}`}>
            {collapsed ? <DoubleRightOutlined className='collapse-icon' /> : <DoubleLeftOutlined className='collapse-icon' />}
            {!collapsed && <Text className='text' ellipsis>{t('收起侧栏')}</Text>}
        </div>}
        onCollapse={(collapsed, type) => {
            localStorage.setItem(
                'ddb-cloud.collapsed',
                String(collapsed)
            )
            model.set({ collapsed })
        }}
    >
        <Menu
            className='menu'
            mode='inline'
            theme='light'
            selectedKeys={[view]}
            onSelect={({ key }) => {
                model.set({ view: key as PageViews })
            }}
            inlineIndent={10}
            items={[
                {
                    key: 'cluster',
                    icon: <MenuIcon view='cluster' />,
                    label: t('集群管理'),
                },
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('日志管理'),
                }
            ]}
        />
    </Layout.Sider>
}
