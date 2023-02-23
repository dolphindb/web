import 'xshell/scroll-bar.sass'

import './index.sass'


import { default as React, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'


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
    
    // @ts-ignore 使用了 antd-with-locales 之后 window.antd 变量中有 locales 属性
    locales
} from 'antd'

import {
    default as _Icon,
    AppstoreOutlined, 
    DatabaseOutlined, 
    DownOutlined, 
    LoginOutlined,
    LogoutOutlined, 
    TableOutlined,
    UserOutlined,
    DoubleLeftOutlined,
    DoubleRightOutlined,
    SyncOutlined,
    SettingFilled,
    SettingOutlined,
    CaretUpOutlined,
    CaretDownOutlined,
    HomeOutlined,
    InfoCircleOutlined,
    InfoOutlined,
} from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any


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
import SvgArrowDown from './arrow.down.icon.svg'


const { Text } = Typography

const locale_names = {
    zh: 'zh_CN',
    en: 'en_US',
    ja: 'ja_JP',
    ko: 'ko_KR'
} as const


function DolphinDB () {
    const { inited, header } = model.use(['inited', 'header'])
    
    useEffect(() => {
        (async () => {
            try {
                await model.init()
            } catch (error) {
                model.show_error({ error })
            }
        })()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[locale_names[language]]} autoInsertSpaceInButton={false}>
        <Layout className='root-layout'>
            { header && <Layout.Header className='ddb-header'>
                <DdbHeader />
            </Layout.Header> }
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
    const { logined, username, node_alias } = model.use(['logined', 'username', 'node_alias'])
    
    useEffect(() => {
        if (!node_alias)
            return
        document.title = `DolphinDB - ${node_alias}`
    }, [node_alias])
    
    return <>
        <img className='logo' src='./ddb.svg' />
        
        <div className='padding' />
        
        <div className='section'><Status /></div>
        
        <div className='section'><License /></div>
        
        <Settings />
        
        <div className='section'>
            <div className='user'>{
                <Dropdown
                    menu={{
                        className: 'menu',
                        items: [
                            logined ?
                                {
                                    key: 'logout',
                                    icon: <LogoutOutlined />,
                                    label: <a className='logout' onClick={() => { model.logout() }}>{t('注销')}</a>,
                                }
                            :
                                {
                                    key: 'login',
                                    icon: <LoginOutlined />,
                                    label: <a className='login' onClick={() => { model.goto_login() }}>{t('登录')}</a>,
                                }
                        ]
                    }}
                >
                    <a className='username'>
                        <Avatar className='avatar' icon={<UserOutlined /> } size='small' />{username}<Icon className='arrow-down' component={SvgArrowDown} />
                    </a>
                </Dropdown>
            }</div>
        </div>
    </>
}


const authorizations = {
    trial: t('试用版'),
    community: t('社区版'),
    commercial: t('商业版')
}

function License () {
    const { version, license } = model.use(['version', 'license'])
    
    if (!license)
        return
    
    const auth = authorizations[license.authorization] || license.authorization
    
    return <Popover
        placement='bottomLeft'
        zIndex={1060}
        trigger='hover'
        content={
            <div className='license-card head-bar-info'>
                <Card size='small' bordered={false} title={`${auth} v${version}`}>
                    <Descriptions bordered size='small' column={2}>
                        <Descriptions.Item label={t('授权类型')}>{auth}</Descriptions.Item>
                        <Descriptions.Item label={t('授权客户')}>{license.clientName}</Descriptions.Item>
                        <Descriptions.Item label={t('许可类型')}>{license.licenseType}</Descriptions.Item>
                        <Descriptions.Item label={t('过期时间')}>{date2str(license.expiration)}</Descriptions.Item>
                        <Descriptions.Item label={t('绑定 CPU')}>{String(license.bindCPU)}</Descriptions.Item>
                        <Descriptions.Item label={t('license 版本')}>{license.version}</Descriptions.Item>
                        <Descriptions.Item label={t('模块数量')}>{ license.modules === -1n ? '∞' : license.modules.toString() }</Descriptions.Item>
                        <Descriptions.Item label={t('每节点最大可用内存')}>{license.maxMemoryPerNode}</Descriptions.Item>
                        <Descriptions.Item label={t('每节点最大可用核数')}>{license.maxCoresPerNode}</Descriptions.Item>
                        <Descriptions.Item label={t('最大节点数')}>{license.maxNodes}</Descriptions.Item>
                        <Descriptions.Item label={t('web 构建时间')}>{BUILD_TIME}</Descriptions.Item>
                    </Descriptions>
                </Card>
            </div>
        }
    >
        <Tag className='license' color='#f2f2f2'>{auth} v{version}</Tag>
    </Popover>
}

const uppercase_node_types = {
    [NodeType.data_node]: t('数据节点', { context: 'node_type_title' }),
    [NodeType.controller]: t('控制节点', { context: 'node_type_title' }),
    [NodeType.single]: t('单机节点', { context: 'node_type_title' }),
    [NodeType.computing_node]: t('计算节点', { context: 'node_type_title' }),
}

const lowercase_node_types = {
    [NodeType.data_node]: t('数据节点', { context: 'node_type' }),
    [NodeType.controller]: t('控制节点', { context: 'node_type' }),
    [NodeType.single]: t('单机节点', { context: 'node_type' }),
    [NodeType.computing_node]: t('计算节点', { context: 'node_type' }),
}

function Status () {
    const { node_type } = model.use(['node_type'])
    
    return <Popover
        placement='bottomLeft'
        zIndex={1060}
        trigger='hover'
        content={
            <div className='head-bar-info'>
                <Card
                    size='small'
                    title={uppercase_node_types[node_type] + t('状态', { context: 'node_type' })}
                    bordered={false}
                    extra={
                        <div
                            className='refresh'
                            onClick={() => { model.get_cluster_perf() }}
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
        <Tag
            className='node-info'
            color='#f2f2f2'
            onMouseOver={() => { model.get_cluster_perf() }}
        >{lowercase_node_types[node_type]}</Tag>
    </Popover>
}


function Perf () {
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
                <Descriptions.Item label={t('executor 线程数')}>
                    {node.executorNum}
                </Descriptions.Item>
            </Descriptions >
            <Descriptions className='table' column={2} bordered size='small' title={t('磁盘')}>
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
                <Descriptions.Item label={t('当前连接')}>
                    {node.connectionNum}
                </Descriptions.Item>
                <Descriptions.Item label={t('最大连接')}>
                    {node.maxConnections}
                </Descriptions.Item>
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
        </div>
    )
}

function DdbSider () {
    const { view, node_type, collapsed } = model.use(['view', 'node_type', 'collapsed'])
    const { cdn, dev } = model
    
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
            inlineIndent={10}
            items={[
                // {
                //     key: 'overview',
                //     icon: <AppstoreOutlined />,
                //     label: t('总览'),
                // },
                ... (!cdn && (node_type === NodeType.controller || dev)) ? [{
                    key: 'cluster',
                    icon: <MenuIcon view='cluster' />,
                    label: t('集群总览'),
                }] : [ ],
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: t('交互编程'),
                },
                
                ... dev ? [{
                       key: 'dashboard',
                       icon: <MenuIcon view='dashboard' />,
                       label: t('数据看板')
                }] : [ ],
                
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
                ... (!cdn && (node_type === NodeType.controller || node_type === NodeType.single)) ? [{
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
    type DecimalsStatus = null | 'error'
    
    const [decimals, set_decimals] = useState<{ status: DecimalsStatus, value: number | null }>(
        { status: null, value: model.options?.decimals ?? null }
    )
    
    function confirm () {
        if (decimals.status === null) {
            model.set({ options: { decimals: decimals.value } })
            message.success(t('设置成功，目前小数位数为：') + (decimals.value === null ? t('实际位数') : decimals.value))
        } else
            set_decimals({ status: null, value: model.options?.decimals ? model.options.decimals : null })
    }
    
    function validate (text: string): { status: DecimalsStatus, value: null | number } {
        text = text.trim()
        if (text.length === 0) 
            return { value: null, status: null }
        
        if (!/^[0-9]*$/.test(text)) 
            return { value: null, status: 'error' }
        
        const num = Number(text)
        if (Number.isNaN(num)) 
            return { value: null, status: 'error' }
        
        if (num < 0 || num > 20) 
            return { value: num, status: 'error' }
        
        return { value: num, status: null }
    }
    
    
    return <div className='header-settings'>
        <Popover
            trigger='hover'
            placement='bottomLeft'
            zIndex={1060}
            content={
                <div className='header-settings-content head-bar-info'>
                    <Card size='small' title={t('设置', { context: 'settings' })} bordered={false}>
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
                    set_decimals({ value: model.options?.decimals ?? null, status: null })
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
    return <Icon className='icon-menu' component={svgs[view]} />
}


createRoot(
    document.querySelector('.root')
).render(<DolphinDB/>)
