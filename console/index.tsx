import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import '../fonts/myfont.sass'

import { default as React, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import dayjs from 'dayjs'
import {
    Layout, 
    Menu,
    ConfigProvider,
    Dropdown,
    Avatar,
    Typography,
    Tag,
    Popover,
    Descriptions,
    Badge,
    Card
} from 'antd'
import {
    default as Icon,
    AppstoreOutlined, 
    DatabaseOutlined, 
    DownOutlined, 
    LogoutOutlined, 
    TableOutlined,
    UserOutlined,
    DoubleLeftOutlined,
    DoubleRightOutlined,
} from '@ant-design/icons'
import zh from 'antd/lib/locale/zh_CN'
import en from 'antd/lib/locale/en_US'
import ja from 'antd/lib/locale/ja_JP'
import ko from 'antd/lib/locale/ko_KR'


import { language, t } from '../i18n'

import { model, DdbModel, NodeType } from './model'

import Login from './login'
import Cluster from './cluster'
import Shell from './shell'
import ShellOld from './shell.old'
import Job from './job'
import DFS from './dfs'

import SvgCluster from './cluster.icon.svg'
import SvgDFS from './dfs.icon.svg'
import SvgJob from './job.icon.svg'
import SvgShell from './shell.icon.svg'
import SvgShellOld from './shell.old.icon.svg'


const { Text } = Typography

const locales = { zh, en, ja, ko }


function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
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
    const { logined, username, node_alias, version, license } = model.use(['logined', 'username', 'node_alias', 'version', 'license'])
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    return <>
        <img className='logo' src='./ddb.svg' />
        
        <div className='padding' />

        {/* <div>
            <Tag className='version' color='#828282'>{ 'V' + version }</Tag>
        </div> */}
        
        {
            license && <div>
                <Popover
                    placement="bottomLeft"
                    content={
                        license ? <div>
                            <Badge.Ribbon text={ 'V' + version } color='#B5B5B5'>
                                <Card size='small' title={ license?.authorization.toLowerCase().replace(/( |^)[a-z]/g, (L) => L.toUpperCase()) + ' License' }>
                                <Descriptions
                                    bordered
                                    size='small'
                                    column={2}
                                >
                                    <Descriptions.Item label="authorization">{ license.authorization }</Descriptions.Item>
                                    <Descriptions.Item label="clientName">{ license.clientName }</Descriptions.Item>
                                    <Descriptions.Item label="bindCPU">{ license.bindCPU? 'true' : 'false' }</Descriptions.Item>
                                    <Descriptions.Item label="licenseType">{ license.licenseType }</Descriptions.Item>
                                    <Descriptions.Item label="expiration">{ dayjs(
                                        Number(1000 * 3600 * 24 * Number(license.expiration))
                                        ).format('YYYY.MM.DD') }</Descriptions.Item>
                                    <Descriptions.Item label="modules">{ Number(license.modules) }</Descriptions.Item>
                                    <Descriptions.Item label="maxMemoryPerNode">{ license.maxMemoryPerNode }</Descriptions.Item>
                                    <Descriptions.Item label="maxCoresPerNode">{ license.maxCoresPerNode }</Descriptions.Item>
                                    <Descriptions.Item label="version">{ license.version }</Descriptions.Item>
                                    <Descriptions.Item label="maxNodes">{ license.maxNodes }</Descriptions.Item>
                                </Descriptions>
                                </Card>
                            </Badge.Ribbon>
                        </div> : null
                    }
                >
                    <Tag  className='license' color='#f2f2f2'>{ license.authorization }</Tag>
                </Popover>
            </div>
        }

        <div className='user'>
            <Dropdown
                overlay={
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
                }
            >
                <a className='username'>
                    <Avatar className='avatar' icon={<UserOutlined />} size='small' /> {username} <DownOutlined />
                </a>
            </Dropdown>
        </div>
    </>
}


function DdbSider () {
    const { view, node_type } = model.use(['view', 'node_type'])
    
    const [collapsed, set_collapsed] = useState(false)
    
    return <Layout.Sider
        width={200}
        className='sider'
        theme='light'
        collapsible
        collapsedWidth={50}
        collapsed={collapsed}
        trigger={<div className={`collapse-trigger ${collapsed ? 'collapsed' : 'expand'}`}>
            {collapsed ? <DoubleRightOutlined className='collapse-icon' /> : <DoubleLeftOutlined className='collapse-icon' />}
            {!collapsed && <Text className='text' ellipsis>{t('收起侧边栏')}</Text>}
        </div>}
        onCollapse={(collapsed, type) => {
            set_collapsed(collapsed)
        }}
    >
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
                <Menu.Item key='cluster' icon={<MenuIcon view='cluster' />}>{t('集群总览')}</Menu.Item>
            }
            <Menu.Item key='shellold' icon={<MenuIcon view='shellold' />}>{t('交互编程')}</Menu.Item>
            {/* <Menu.Item key='shell' icon={<MenuIcon view='shell' />}>Shell</Menu.Item> */}
            
            {/* <Menu.SubMenu key='data' title='数据' icon={<DatabaseOutlined />}>
                <Menu.Item key='table' icon={<TableOutlined />}>数据表</Menu.Item>
            </Menu.SubMenu> */}
            
            <Menu.Item key='job' icon={<MenuIcon view='job' />}>{t('作业管理')}</Menu.Item>
            { (node_type === NodeType.controller || node_type === NodeType.single) && 
                <Menu.Item key='dfs' icon={<MenuIcon view='dfs' />}>{t('文件系统')}</Menu.Item>
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


const svgs = {
    cluster: SvgCluster,
    job: SvgJob,
    shell: SvgShell,
    shellold: SvgShellOld,
    dfs: SvgDFS,
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
