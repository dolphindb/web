import 'antd/dist/antd.css'

import 'xshell/scroll-bar.sass'
import '../fonts/myfont.sass'

import './index.sass'


import { default as React, useEffect } from 'react'
import { createRoot as create_root } from 'react-dom/client'

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

import { date2str } from 'dolphindb/browser'

import { language, t } from '../i18n'

import { model, DdbModel, NodeType } from './model'

import { Login } from './login'
import { Cluster } from './cluster'
import { Shell } from './shell'
import { ShellOld } from './shell.old'
import { Job } from './job'
import { DFS } from './dfs'
import { Log } from './log'

import SvgCluster from './cluster.icon.svg'
import SvgDFS from './dfs.icon.svg'
import SvgJob from './job.icon.svg'
import SvgShell from './shell.icon.svg'
import SvgShellOld from './shell.old.icon.svg'
import SvgLog from './log.icon.svg'


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
        
        {
            license && <div>
                <Popover
                    placement='bottomLeft'
                    content={
                        license ? <div>
                            <Badge.Ribbon text={`V${version}`} color='#b5b5b5'>
                                <Card size='small' title={ license.authorization?.toLowerCase().replace(/( |^)[a-z]/g, (L) => L.toUpperCase()) + ' License' }>
                                <Descriptions bordered size='small' column={2}>
                                    <Descriptions.Item label='authorization'>{license.authorization}</Descriptions.Item>
                                    <Descriptions.Item label='client name'>{license.clientName}</Descriptions.Item>
                                    <Descriptions.Item label='license type'>{license.licenseType}</Descriptions.Item>
                                    <Descriptions.Item label='expiration'>{date2str(license.expiration)}</Descriptions.Item>
                                    <Descriptions.Item label='bind CPU'>{String(license.bindCPU)}</Descriptions.Item>
                                    <Descriptions.Item label='version'>{license.version}</Descriptions.Item>
                                    <Descriptions.Item label='modules'>{ license.modules === -1n ? 'unlimited' : license.modules.toString() }</Descriptions.Item>
                                    <Descriptions.Item label='max memory per node'>{license.maxMemoryPerNode}</Descriptions.Item>
                                    <Descriptions.Item label='max cores per node'>{license.maxCoresPerNode}</Descriptions.Item>
                                    <Descriptions.Item label='max nodes'>{license.maxNodes}</Descriptions.Item>
                                </Descriptions>
                                </Card>
                            </Badge.Ribbon>
                        </div> : null
                    }
                >
                    <Tag className='license' color='#f2f2f2'>{license.authorization}</Tag>
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
    const { view, node_type, collapsed } = model.use(['view', 'node_type', 'collapsed'])
    
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
            model.set({ collapsed })
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
            items={[
                // {
                //     key: 'overview',
                //     icon: <AppstoreOutlined />,
                //     label: t('总览'),
                // },
                ... node_type === NodeType.controller ? [{
                    key: 'cluster',
                    icon: <MenuIcon view='cluster' />,
                    label: t('集群总览'),
                }] : [ ],
                {
                    key: 'shellold',
                    icon: <MenuIcon view='shellold' />,
                    label: t('交互编程'),
                },
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: 'Shell',
                },
                // {
                //     key: 'data',
                //     label: t('数据'),
                //     icon: <DatabaseOutlined />,
                //     children: [
                //         {
                //             key: 'table',
                //             icon: <TableOutlined />,
                //             label: t('数据表'),
                //         },
                //     ]
                // },
                {
                    key: 'job',
                    icon: <MenuIcon view='job' />,
                    label: t('作业管理'),
                },
                ... (node_type === NodeType.controller || node_type === NodeType.single) ? [{
                    key: 'dfs',
                    icon: <MenuIcon view='dfs' />,
                    label: t('文件系统'),
                }] : [ ],
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('日志查看'),
                },
            ]}
        />
    </Layout.Sider>
}

const views = {
    login: Login,
    cluster: Cluster,
    shell: Shell,
    shellold: ShellOld,
    job: Job,
    dfs: DFS,
    log: Log,
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
    log: SvgLog,
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}


create_root(
    document.querySelector('.root')
).render(<DolphinDB/>)
