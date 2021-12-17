import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import 'xshell/myfont.sass'

import { default as React, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import {
    Layout, 
    Menu,
    ConfigProvider,
    Dropdown,
    Avatar
} from 'antd'
import {
    ApartmentOutlined,
    AppstoreOutlined, 
    DatabaseOutlined, 
    DownOutlined, 
    LogoutOutlined, 
    ProfileOutlined, 
    RightSquareOutlined, 
    TableOutlined,
    UserOutlined
} from '@ant-design/icons'
import zh from 'antd/lib/locale/zh_CN'
import en from 'antd/lib/locale/en_US'
import ja from 'antd/lib/locale/ja_JP'
import ko from 'antd/lib/locale/ko_KR'



import { model, DdbModel, NodeType } from './model'

import Login from './login'
import Cluster from './cluster'
import Shell from './shell'
import ShellOld from './shell.old'
import Job from './job'
import DFS from './dfs'

import { language, t } from './i18n'


const locales = { zh, en, ja, ko }


function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
        document.title = `DolphinDB - ${t('控制台')}`
        
        model.init()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[language]} autoInsertSpaceInButton={false}>
        <Layout className='root-layout'>
            <Layout.Header className='header'>
                <DdbHeader />
            </Layout.Header>
            <Layout className='body'>
                <DdbSider />
                <Layout.Content className='view'>
                    <DdbContent />
                </Layout.Content>
            </Layout>
        </Layout>
    </ConfigProvider>
}


function DdbHeader () {
    const { logined, username } = model.use(['logined', 'username'])
    
    return <>
        <div className='logo'>
            <img src='./ico/logo.png' />
            <span className='title'>DolphinDB {t('控制台')}</span>
        </div>
        
        <div className='user'>
            <Dropdown overlay={
                <Menu className='menu'>{
                    logined ?
                        <Menu.Item key='logout' icon={<LogoutOutlined />}>
                            <a
                                className='logout'
                                onClick={() => {
                                    model.logout()
                                }}
                            >{t('注销')}</a>
                        </Menu.Item>
                    :
                        <Menu.Item key='login' icon={<LogoutOutlined />}>
                            <a
                                className='login'
                                onClick={() => {
                                    model.set({ view: 'login' })
                            }}>{t('登录')}</a>
                        </Menu.Item>
                }</Menu>
            }>
                <a className='username'>
                    <Avatar className='avatar' icon={<UserOutlined />} size='small' /> {username} <DownOutlined />
                </a>
            </Dropdown>
        </div>
    </>
}


function DdbSider () {
    const { view, node_type } = model.use(['view', 'node_type'])
    
    return <Layout.Sider width={200} className='sider' theme='light' collapsible>
        <Menu
            className='menu'
            mode='inline'
            theme='light'
            selectedKeys={[view]}
            onSelect={({ key }) => {
                model.set({ view: key as DdbModel['view'] })
            }}
        >
            {/* <Menu.Item key='overview' icon={<AppstoreOutlined />}>总览</Menu.Item> */}
            { node_type === NodeType.controller && 
                <Menu.Item key='cluster' icon={<ApartmentOutlined />}>{t('集群管理')}</Menu.Item>
            }
            <Menu.Item key='shellold' icon={<RightSquareOutlined />}>{t('交互编程')}</Menu.Item>
            {/* <Menu.Item key='shell' icon={<RightSquareOutlined />}>Shell</Menu.Item> */}
            {/* <Menu.SubMenu key='data' title='数据' icon={<DatabaseOutlined />}>
                <Menu.Item key='table' icon={<TableOutlined />}>数据表</Menu.Item>
            </Menu.SubMenu> */}
            <Menu.Item key='job' icon={<ProfileOutlined />}>{t('作业管理')}</Menu.Item>
            { (node_type === NodeType.controller || node_type === NodeType.single) && 
                <Menu.Item key='dfs' icon={<DatabaseOutlined />}>{t('文件系统')}</Menu.Item>
            }
            {/* <Menu.Item key='log' icon={<DatabaseOutlined />}>{t('日志查看')}</Menu.Item> */}
        </Menu>
    </Layout.Sider>
}

const views = {
    login: Login,
    cluster: Cluster,
    shell: Shell,
    shellold: ShellOld,
    job: Job,
    dfs: DFS,
}

function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={`view-card ${view}`}>
        <View/>
    </div>
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
