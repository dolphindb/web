import 'antd/dist/antd.css'

import 'xshell/scroll-bar.sass'
import '../myfont.sass'

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
    SyncOutlined,
} from '@ant-design/icons'
import zh from 'antd/lib/locale/zh_CN.js'
import en from 'antd/lib/locale/en_US.js'
import ja from 'antd/lib/locale/ja_JP.js'
import ko from 'antd/lib/locale/ko_KR.js'

import { date2str } from 'dolphindb/browser.js'

import { language, t } from '../i18n/index.js'

import { model, DdbModel, NodeType, storage_keys } from './model.js'

import { Login } from './login.js'
import { Cluster } from './cluster.js'
import { Shell } from './shell.js'
import { Job } from './job.js'
import { DFS } from './dfs.js'
import { Log } from './log.js'

import SvgCluster from './cluster.icon.svg'
import SvgDFS from './dfs.icon.svg'
import SvgJob from './job.icon.svg'
import SvgShell from './shell.icon.svg'
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
    
    return <ConfigProvider locale={locales[language] as any} autoInsertSpaceInButton={false}>
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
    
    const authorizations = {
        trial: t('?????????'),
        community: t('?????????'),
        commercial: t('?????????')
    }
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    return <>
        <img className='logo' src='./ddb.svg' />
        
        <div className='padding' />
        
        <div>
            <Popover
                placement='bottomLeft'
                content={<Perf />}
            >
                <Tag className='node-info' color='#f2f2f2'>{t('??????')}</Tag>
            </Popover>
        </div>
        
        {
            license && <div>
                <Popover
                    placement='bottomLeft'
                    content={
                        license ? <div>
                            <Badge.Ribbon text={`V${version}`} color='#b5b5b5'>
                                <Card size='small' title={ authorizations[license.authorization] || license.authorization }>
                                <Descriptions bordered size='small' column={2}>
                                    <Descriptions.Item label={t('????????????')}>{authorizations[license.authorization] || license.authorization}</Descriptions.Item>
                                    <Descriptions.Item label={t('????????????')}>{license.clientName}</Descriptions.Item>
                                    <Descriptions.Item label={t('????????????')}>{license.licenseType}</Descriptions.Item>
                                    <Descriptions.Item label={t('????????????')}>{date2str(license.expiration)}</Descriptions.Item>
                                    <Descriptions.Item label={t('?????? CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                                    <Descriptions.Item label={t('??????')}>{license.version}</Descriptions.Item>
                                    <Descriptions.Item label={t('??????')}>{ license.modules === -1n ? 'unlimited' : license.modules.toString() }</Descriptions.Item>
                                    <Descriptions.Item label={t('???????????????????????????')}>{license.maxMemoryPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('???????????????????????????')}>{license.maxCoresPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('???????????????')}>{license.maxNodes}</Descriptions.Item>
                                </Descriptions>
                                </Card>
                            </Badge.Ribbon>
                        </div> : null
                    }
                >
                    <Tag className='license' color='#f2f2f2'>{authorizations[license.authorization] || license.authorization}</Tag>
                </Popover>
            </div>
        }

        <div className='user'>
            <Dropdown
                overlay={
                    <Menu
                        className='menu'
                        items={[
                            logined ?
                                {
                                    label: <a
                                            className='logout'
                                            onClick={() => {
                                                model.logout()
                                            }}
                                        >{t('??????')}</a>,
                                    key: 'logout',
                                    icon: <LogoutOutlined />
                                }
                            :
                                {
                                    label: <a
                                            className='login'
                                            onClick={() => {
                                                model.set({ view: 'login' })
                                            }}
                                        >{t('??????')}</a>,
                                    key: 'login',
                                    icon: <LogoutOutlined />
                                }
                            ]
                        } 
                    />
                }
            >
                <a className='username'>
                    <Avatar className='avatar' icon={<UserOutlined />} size='small' /> {username} <DownOutlined />
                </a>
            </Dropdown>
        </div>
    </>
}

function Perf() {
    const { node } = model.use(['node'])

    if (!node)
        return null

    return <div className='perf'>
        <Descriptions
            className='table'
            column={9}
            bordered
            size='small'
            layout='vertical'
        >
            <Descriptions.Item label={t('???????????? (?????????) / ????????????')}>{Number(node.memoryUsed).to_fsize_str()} ({Number(node.memoryAlloc).to_fsize_str()}) / {node.maxMemSize} GB</Descriptions.Item>
            <Descriptions.Item label={t('CPU ?????? (????????????)')}>{node.cpuUsage.toFixed(1)}% ({node.avgLoad.toFixed(1)})</Descriptions.Item>
            <Descriptions.Item label={t('???????????? | ????????????')}>{node.connectionNum} | {node.maxConnections}</Descriptions.Item>
            <Descriptions.Item label={t('???????????? | ????????????')}>{Number(node.diskReadRate).to_fsize_str()}/s | {Number(node.diskWriteRate).to_fsize_str()}/s</Descriptions.Item>
            <Descriptions.Item label={t('???????????? | ????????????')}>{Number(node.networkRecvRate).to_fsize_str()}/s | {Number(node.networkSendRate).to_fsize_str()}/s</Descriptions.Item>
            <Descriptions.Item label={t('???????????? | ????????????')}>{node.queuedJobs} | {node.runningJobs}</Descriptions.Item>
            <Descriptions.Item label={t('???????????? | ????????????')}>{node.queuedTasks} | {node.runningTasks}</Descriptions.Item>
            <Descriptions.Item label='Workers'>{node.workerNum} | {node.executorNum} | {node.jobLoad}</Descriptions.Item>
        </Descriptions>

        <div
            className='refresh'
            onClick={() => {
                model.get_cluster_perf()
            }}
        >
            <SyncOutlined className='icon' />
            <div className='text'>{t('??????')}</div>
        </div>
    </div>
}

function DdbSider () {
    const { view, node_type, collapsed } = model.use(['view', 'node_type', 'collapsed'])
    
    return <Layout.Sider
        width={130}
        className='sider'
        theme='light'
        collapsible
        collapsedWidth={50}
        collapsed={collapsed}
        trigger={<div className={`collapse-trigger ${collapsed ? 'collapsed' : 'expand'}`}>
            {collapsed ? <DoubleRightOutlined className='collapse-icon' /> : <DoubleLeftOutlined className='collapse-icon' />}
            {!collapsed && <Text className='text' ellipsis>{t('????????????')}</Text>}
        </div>}
        onCollapse={(collapsed, type) => {
            localStorage.setItem(
                storage_keys.collapsed,
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
                model.set({ view: key as DdbModel['view'] })
            }}
            inlineIndent={20}
            items={[
                // {
                //     key: 'overview',
                //     icon: <AppstoreOutlined />,
                //     label: t('??????'),
                // },
                ... node_type === NodeType.controller ? [{
                    key: 'cluster',
                    icon: <MenuIcon view='cluster' />,
                    label: t('????????????'),
                }] : [ ],
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: t('????????????'),
                },
                // {
                //     key: 'data',
                //     label: t('??????'),
                //     icon: <DatabaseOutlined />,
                //     children: [
                //         {
                //             key: 'table',
                //             icon: <TableOutlined />,
                //             label: t('?????????'),
                //         },
                //     ]
                // },
                {
                    key: 'job',
                    icon: <MenuIcon view='job' />,
                    label: t('????????????'),
                },
                ... (node_type === NodeType.controller || node_type === NodeType.single) ? [{
                    key: 'dfs',
                    icon: <MenuIcon view='dfs' />,
                    label: t('????????????'),
                }] : [ ],
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('????????????'),
                },
            ]}
        />
    </Layout.Sider>
}

const views = {
    login: Login,
    cluster: Cluster,
    shell: Shell,
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
    dfs: SvgDFS,
    log: SvgLog,
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}


create_root(
    document.querySelector('.root')
).render(<DolphinDB/>)
