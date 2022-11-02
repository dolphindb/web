import 'antd/dist/antd.css'

import 'xshell/scroll-bar.sass'
import '../myfont.sass'

import './index.sass'


import { default as React, useEffect, useState } from 'react'
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
    Card,
    Tooltip,
    Button,
    InputNumber,
    message,
    Anchor
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
    SettingFilled,
    CaretUpOutlined,
    CaretDownOutlined,
    HomeOutlined,
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
import { DashBoard } from './dashboard.js'
import { Job } from './job.js'
import { DFS } from './dfs.js'
import { Log } from './log.js'

import SvgCluster from './cluster.icon.svg'
import SvgShell from './shell.icon.svg'
import SvgDashboard from './dashboard.icon.svg'
import SvgJob from './job.icon.svg'
import SvgDFS from './dfs.icon.svg'
import SvgLog from './log.icon.svg'
const {Link} = Anchor


const { Text } = Typography

const locales = { zh, en, ja, ko }

type env_type = 'dolphindb' | 'citicsai'
const env_ :env_type= 'citicsai'

function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
        model.init()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[language] as any} autoInsertSpaceInButton={false}>
        <Layout className='root-layout'>
            {
                !(env_ === 'citicsai')?
            <Layout.Header className='header'>
                <DdbHeader></DdbHeader>
            </Layout.Header>:
            
            <Layout.Header className='citicsai-header'>
            <DdbHeader_Citicsai></DdbHeader_Citicsai>
        </Layout.Header>
}
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
        trial: t('试用版'),
        community: t('社区版'),
        commercial: t('商业版')
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
                content={
                    <div className='head-bar-info'>
                        <Card
                            size='small'
                            title={t('状态')}
                            bordered={false}
                            extra={
                                <div
                                    className='refresh'
                                    onClick={() => {
                                        model.get_cluster_perf();
                                    }}
                                >
                                    <Tooltip title={t('刷新')} color={'grey'}>
                                        <SyncOutlined className='icon' />
                                    </Tooltip>
                                </div>
                            }
                        >
                            <div className='status-description'>
                                <Perf />
                            </div>
                        </Card>
                    </div>
                }
            >
                <Tag className='node-info' color='#f2f2f2' onMouseOver={() => { model.get_cluster_perf() }}>
                    {t('状态')}
                </Tag>
            </Popover>
        </div>
        
        {
            license && <div>
                <Popover
                    placement='bottomLeft'
                    content={
                        license ? <div className='license-card head-bar-info'>
                            <Card size='small' bordered={false} title={`${authorizations[license.authorization] || license.authorization} v${version}`}>
                                <Descriptions bordered size='small' column={2}>
                                    <Descriptions.Item label={t('授权类型')}>{authorizations[license.authorization] || license.authorization}</Descriptions.Item>
                                    <Descriptions.Item label={t('授权客户')}>{license.clientName}</Descriptions.Item>
                                    <Descriptions.Item label={t('许可类型')}>{license.licenseType}</Descriptions.Item>
                                    <Descriptions.Item label={t('过期时间')}>{date2str(license.expiration)}</Descriptions.Item>
                                    <Descriptions.Item label={t('绑定 CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                                    <Descriptions.Item label={t('版本')}>{license.version}</Descriptions.Item>
                                    <Descriptions.Item label={t('模块')}>{ license.modules === -1n ? 'unlimited' : license.modules.toString() }</Descriptions.Item>
                                    <Descriptions.Item label={t('每节点最大可用内存')}>{license.maxMemoryPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('每节点最大可用核数')}>{license.maxCoresPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('最大节点数')}>{license.maxNodes}</Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </div> : null
                    }
                >
                    <Tag className='license' color='#f2f2f2'>{authorizations[license.authorization] || license.authorization}</Tag>
                </Popover>
            </div>
        }
        
        <Settings />
        
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
                                        >{t('注销')}</a>,
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
                                        >{t('登录')}</a>,
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

function DdbHeader_Citicsai () {
    const { logined, username, node_alias, version, license } = model.use(['logined', 'username', 'node_alias', 'version', 'license'])
    
    const authorizations = {
        trial: t('试用版'),
        community: t('社区版'),
        commercial: t('商业版')
    }
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    return <>
        
        <img  src='./citicsai.png' style={{height:'40px', margin:'5px'}}/>
        
        <HomeOutlined
        size={500}
        style={{color:'white', lineHeight:3, fontSize:18}}
        ></HomeOutlined>
        
        <a
        style={{ fontSize: 18, color: 'white', lineHeight: '48px', marginLeft: '5px' }} 
        href='https://google.com/'
        id={'front_page_link'}
        target='_blank'
        >首页</a>
        <div className='padding' />
        
        <div >
            <Popover
                placement='bottomLeft'
                content={
                    <div className='head-bar-info'>
                        <Card
                            size='small'
                            title={t('状态')}
                            bordered={false}
                            extra={
                                <div
                                    className='refresh'
                                    onClick={() => {
                                        model.get_cluster_perf();
                                    }}
                                >
                                    <Tooltip title={t('刷新')} color={'grey'}>
                                        <SyncOutlined className='icon' />
                                    </Tooltip>
                                </div>
                            }
                        >
                            <div className='status-description'>
                                <Perf />
                            </div>
                        </Card>
                    </div>
                }
            >
                <Tag className='node-info' color='#f2f2f2' onMouseOver={() => { model.get_cluster_perf() }}>
                    {t('状态')}
                </Tag>
            </Popover>
        </div>
        
        {
            license && <div>
                <Popover
                    placement='bottomLeft'
                    content={
                        license ? <div className='license-card head-bar-info'>
                            <Card size='small' bordered={false} title={`${authorizations[license.authorization] || license.authorization} v${version}`}>
                                <Descriptions bordered size='small' column={2}>
                                    <Descriptions.Item label={t('授权类型')}>{authorizations[license.authorization] || license.authorization}</Descriptions.Item>
                                    <Descriptions.Item label={t('授权客户')}>{license.clientName}</Descriptions.Item>
                                    <Descriptions.Item label={t('许可类型')}>{license.licenseType}</Descriptions.Item>
                                    <Descriptions.Item label={t('过期时间')}>{date2str(license.expiration)}</Descriptions.Item>
                                    <Descriptions.Item label={t('绑定 CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                                    <Descriptions.Item label={t('版本')}>{license.version}</Descriptions.Item>
                                    <Descriptions.Item label={t('模块')}>{ license.modules === -1n ? 'unlimited' : license.modules.toString() }</Descriptions.Item>
                                    <Descriptions.Item label={t('每节点最大可用内存')}>{license.maxMemoryPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('每节点最大可用核数')}>{license.maxCoresPerNode}</Descriptions.Item>
                                    <Descriptions.Item label={t('最大节点数')}>{license.maxNodes}</Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </div> : null
                    }
                >
                    <Tag className='license' color='#f2f2f2'>{authorizations[license.authorization] || license.authorization}</Tag>
                </Popover>
            </div>
        }
        
        <Settings />
        
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
                                        >{t('注销')}</a>,
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
                                        >{t('登录')}</a>,
                                    key: 'login',
                                    icon: <LogoutOutlined />
                                }
                            ]
                        } 
                    />
                }
            >
                <a className='username'>
                    <Avatar className='avatar' icon={<UserOutlined />} size='small' /> {logined? `欢迎您，${username}`:'未登录'} <DownOutlined />
                </a>
            </Dropdown>
        </div>
    </>

}

function Perf() {
    const { node } = model.use(['node'])

    if (!node)
        return null

    return (
        <div className='perf'>
            <Descriptions className='table' column={2} bordered size='small' title={t('内存', { context: 'perf' })}>
                <Descriptions.Item label={t('内存已用')}>
                    {Number(node.memoryUsed).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('内存已分配')}>
                    {Number(node.memoryAlloc).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('节点内存空间上限')}>
                    {node.maxMemSize} GB
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={'CPU'}>
                < Descriptions.Item label={t('CPU 占用率')} >
                    {node.cpuUsage.toFixed(1)} %
                </Descriptions.Item >
                <Descriptions.Item label={t('CPU 平均负载')}>
                    {node.avgLoad.toFixed(1)}
                </Descriptions.Item>
                <Descriptions.Item label={t('worker 线程数')}>
                    {node.workerNum}
                </Descriptions.Item>
                <Descriptions.Item label={t('excutor 线程数')}>
                    {node.executorNum}
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={t('磁盘')}>
                <Descriptions.Item label={t('当前连接')}>
                    {node.connectionNum}
                </Descriptions.Item>
                <Descriptions.Item label={t('最大连接')}>
                    {node.maxConnections}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘读速率')}>
                    {Number(node.diskReadRate).to_fsize_str()}/s
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘写速率')}>
                    {Number(node.diskWriteRate).to_fsize_str()}/s
                </Descriptions.Item>
                <Descriptions.Item label={t('前一分钟读磁盘量')}>
                    {Number(node.lastMinuteWriteVolume).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('前一分钟写磁盘量')}>
                    {Number(node.lastMinuteWriteVolume).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘剩余容量')}>
                    {Number(node.diskFreeSpace).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘总容量')}>
                    {Number(node.diskCapacity).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('磁盘可用空间占比')}>
                    {(node.diskFreeSpaceRatio * 100).toFixed(2)}%
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={t('网络', { context: "perf" })}>
                <Descriptions.Item label={t('网络接收速率')}>
                    {Number(node.networkRecvRate).to_fsize_str()}/s
                </Descriptions.Item>
                <Descriptions.Item label={t('网络发送速率')}>
                    {Number(node.networkSendRate).to_fsize_str()}/s
                </Descriptions.Item>
                <Descriptions.Item label={t('前一分钟接收字节数')}>
                    {Number(node.lastMinuteNetworkRecv).to_fsize_str()}
                </Descriptions.Item>
                <Descriptions.Item label={t('前一分钟发送字节数')}>
                    {Number(node.lastMinuteNetworkSend).to_fsize_str()}
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={t('任务与作业')}>
                <Descriptions.Item label={t('排队作业')}>
                    {node.queuedJobs}
                </Descriptions.Item>
                <Descriptions.Item label={t('运行作业')}>
                    {node.runningJobs}
                </Descriptions.Item>
                <Descriptions.Item label={t('排队任务')}>
                    {node.queuedTasks}
                </Descriptions.Item>
                <Descriptions.Item label={t('运行任务')}>
                    {node.runningTasks}
                </Descriptions.Item>
                {
                    Number(node.lastMsgLatency) >= 0 ? <Descriptions.Item label={t('前一批消息延时')}>
                        {Number(node.lastMsgLatency).to_fsize_str()} s
                    </Descriptions.Item> : null
                }
                {
                    Number(node.cumMsgLatency) >= 0 ? <Descriptions.Item label={t('所有消息平均延时')}>
                        {Number(node.cumMsgLatency).to_fsize_str()} s
                    </Descriptions.Item> : null
                }
                <Descriptions.Item label={t('作业负载')}>
                    {node.jobLoad}
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={t('查询')}>
                <Descriptions.Item label={t('前 10 个查询耗费中间值')}>
                    {Number(node.medLast10QueryTime)} ms
                </Descriptions.Item>
                <Descriptions.Item label={t('前 10 个查询耗费最大值')}>
                    {Number(node.maxLast10QueryTime)} ms
                </Descriptions.Item>
                <Descriptions.Item label={t('前 100 个查询耗费中间值')}>
                    {Number(node.medLast100QueryTime)} ms
                </Descriptions.Item>
                <Descriptions.Item label={t('前 100 个查询耗费最大值')}>
                    {Number(node.maxLast100QueryTime)} ms
                </Descriptions.Item>
            </Descriptions>
        </div>
    )
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
            {!collapsed && <Text className='text' ellipsis>{t('收起侧栏')}</Text>}
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
                //     label: t('总览'),
                // },
                ... node_type === NodeType.controller ? [{
                    key: 'cluster',
                    icon: <MenuIcon view='cluster' />,
                    label: t('集群总览'),
                }] : [ ],
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: t('交互编程'),
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

function Settings () {
    type statusType = null | 'error'
    const [decimals, set_decimals] = useState<{ status: statusType, value: number | null }>(
        { status: null, value: model.options?.decimals ? model.options.decimals : null }
    )

    
    const confirm = () => {
        if (decimals.status === null) {
            model.set({ options: { decimals: decimals.value } })
            message.success(t('设置成功，目前小数位数为：') + (decimals.value === null ? t('实际位数') : decimals.value))
        } else {
            set_decimals({ status: null, value: model.options?.decimals ? model.options.decimals : null })
        }
    }

    const validate = (text: string): { status: statusType, value: null | number } => {
        text = text.trim()
        if (text.length === 0) {
            return { value: null, status: null }
        }
        if (!/^[0-9]*$/.test(text)) {
            return { value: null, status: 'error' }
        }
        const num = Number(text)
        if (num === NaN) {
            return { value: null, status: 'error' }
        }
        if (num < 0 || num > 20) {
            return { value: num, status: 'error' }
        }
        return { value: num, status: null }
    }
    
    return <div className='header-settings'>
        <Popover
            placement='bottomLeft'
            content={
                <div className='header-settings-content head-bar-info'>
                    <Card size='small' title={t('设置')} bordered={false}>
                        <div className='decimals-toolbar'>
                            <span className='decimals-toolbar-input'>
                                {t('设置小数位数: ')}
                                <Tooltip title={t('输入应为空或介于 0 ~ 20')} placement="topLeft">
                                    <InputNumber
                                        min={0}
                                        max={20}
                                        onStep={(value) => {
                                            set_decimals(validate(value.toString()))
                                        }}
                                        onInput={(text: string) => {
                                            set_decimals(validate(text))
                                        }}
                                        value={decimals.value}
                                        size='small'
                                        status={decimals.status}
                                        onPressEnter={confirm}
                                        controls={{ upIcon: <CaretUpOutlined />, downIcon: <CaretDownOutlined /> }}
                                    />
                                </Tooltip>
                            </span>
                            <span className='decimals-toolbar-button-group'>
                                <Button size='small' onClick={() => {
                                    model.set({ options: { decimals: null } })
                                    set_decimals({ value: null, status: null })
                                    message.success(t('重置成功，目前小数位数为：实际位数'))
                                }}>
                                    {t('重置')}
                                </Button>
                                <Button onClick={confirm} size='small' type='primary'>
                                    {t('确定')}
                                </Button>
                            </span>
                        </div>
                    </Card>
                </div>
            }
        >
            <SettingFilled className='header-settings-icon'
                style={{ fontSize: '20px', color: '#707070' }}
                onMouseOver={() => {
                    set_decimals({ value: model.options?.decimals ? model.options.decimals : null, status: null })
                }} />
        </Popover>
    </div>
    
}

const views = {
    login: Login,
    cluster: Cluster,
    shell: Shell,
    dashboard: DashBoard,
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
    shell: SvgShell,
    dashboard: SvgDashboard,
    job: SvgJob,
    dfs: SvgDFS,
    log: SvgLog,
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    // @ts-ignore
    return <Icon className='icon-menu' component={svgs[view]} />
}


create_root(
    document.querySelector('.root')
).render(<DolphinDB/>)
