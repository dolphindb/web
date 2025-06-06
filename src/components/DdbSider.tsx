import { useEffect, useMemo, useState } from 'react'

import { Layout, Menu, Typography } from 'antd'

import { default as Icon, DoubleLeftOutlined, DoubleRightOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons'

import { noop } from 'xshell/prototype.browser.js'
import { filter_values } from 'xshell/utils.browser.js'

import { language, t } from '@i18n'

import { model, type DdbModel, NodeType, storage_keys, default_view } from '@model'

import { sider_collapsed_width, sider_uncollapsed_width } from '@utils'


import SvgOverview from '@/overview/icons/overview.icon.svg'
import SvgConfig from '@/config/icons/config.icon.svg'
import SvgShell from '@/shell/index.icon.svg'
import SvgDashboard from '@/dashboard/icons/dashboard.icon.svg'
import SvgJob from '@/job/job.icon.svg'
import SvgLog from '@/log/log.icon.svg'
import SvgFactor from '@/icons/factor.icon.svg'
import SvgComputing from '@/computing/icons/computing.icon.svg'
import SvgAccess from '@/access/icons/access.icon.svg'
import SvgUser from '@/access/icons/user.icon.svg'
import SvgGroup from '@/access/icons/group.icon.svg'
import SvgInspection from '@/inspection/icons/inspection.icon.svg'
import SvgFinance from '@/guide/icons/finance.icon.svg'
import SvgIot from '@/guide/icons/iot.icon.svg'
import SvgPlugins from '@/plugins/plugins.icon.svg'
import SvgDataCollection from '@/data-collection/icons/data-collection.icon.svg'
import SvgConnection from '@/data-collection/icons/connection.icon.svg'
import SvgParserTemplate from '@/data-collection/icons/parser-template.icon.svg'
import SvgStreamingGraph from '@/streaming-graph/flow.icon.svg'


const { Text, Link } = Typography


const svgs = {
    overview: SvgOverview,
    config: SvgConfig,
    shell: SvgShell,
    dashboard: SvgDashboard,
    job: SvgJob,
    log: SvgLog,
    factor: SvgFactor,
    computing: SvgComputing,
    access: SvgAccess,
    user: SvgUser,
    group: SvgGroup,
    'data-collection': SvgDataCollection,
    'data-connection': SvgConnection,
    'parser-template': SvgParserTemplate,
    inspection: SvgInspection,
    'iot-guide': SvgIot,
    'finance-guide': SvgFinance,
    'streaming-graph': SvgStreamingGraph,
    plugins: SvgPlugins
}


function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}

export function DdbSider () {
    const { dev } = model
    
    const { node_type, collapsed, logined, admin, login_required, client_auth, v1, v3, port, hostname, username } 
        = model.use(['node_type', 'collapsed', 'logined', 'admin', 'login_required', 'client_auth', 'v1', 'v3', 'enabled_modules', 'port', 'hostname', 'username'])
    
    const [factor_platform, set_factor_platform] = useState(false)
    
    const factor_href = useMemo(
        () =>
            `${model.assets_root}starfish/index.html?` +
            new URLSearchParams(filter_values({
                ddb_hostname: model.hostname,
                ddb_port: model.port,
                logined: Number(logined).toString(),
                token: localStorage.getItem(storage_keys.ticket)
            })).toString(),
        [logined, hostname, port])
    
    // 获取是否启用因子平台
    useEffect(() => {
        if (logined && !client_auth)
            model.ddb.execute<boolean>('readLicenseAuthorization(license().modules).starfish', { urgent: true })
                .then(set_factor_platform, noop)
    }, [logined, username, client_auth])
    
    return <Layout.Sider
        width={sider_uncollapsed_width}
        className='sider'
        theme='light'
        collapsible
        collapsedWidth={sider_collapsed_width}
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
            className={`menu ${admin ? 'module-settings' : ''}`}
            mode='inline'
            theme='light'
            selectedKeys={[model.view]}
            onSelect={({ key }) => {
                if ((login_required || client_auth) && !logined) {
                    model.message.error(t('请登录'))
                    return
                }
                
                if (key === 'factor')
                    return
                
                model.goto(key === default_view ? '/' : `/${key}/`)
            }}
            inlineIndent={10}
            items={[
                {
                    key: 'overview',
                    icon: <MenuIcon view='overview' />,
                    label: node_type === NodeType.single ? t('单机总览') : t('集群总览'),
                },
                ...admin && node_type === NodeType.controller ? [{
                    key: 'config',
                    icon: <MenuIcon view='config'/>,
                    label: t('配置管理')
                }] : [ ],
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: t('交互编程'),
                },
                ... !v1 ? [ {
                    key: 'dashboard',
                    icon: <MenuIcon view='dashboard' />,
                    label: t('数据面板'),
                }] : [ ],
                {
                    key: 'job',
                    icon: <MenuIcon view='job' />,
                    label: t('作业管理'),
                },
                {
                    key: 'computing',
                    icon: <MenuIcon view='computing' />,
                    label: t('流计算监控', { context: 'menu' }),
                },
                ... logined && v3 ? [{
                    key: 'streaming-graph',
                    icon: <MenuIcon view='streaming-graph' />,
                    label: t('流图监控', { context: 'menu' }),
                }] : [ ],
                ... node_type !== NodeType.computing && admin ? [{
                    key: 'access',
                    icon: <MenuIcon view='access' />,
                    label: t('权限管理'),
                    children: [
                        {
                            key: 'access/user',
                            icon: <MenuIcon view='user' />,
                            label: t('用户管理'),
                        },
                        {
                            key: 'access/group',
                            icon: <MenuIcon view='group' />,
                            label: t('组管理'),
                        },
                    ]
                }] : [ ],
                ... admin && language === 'zh' ? [{
                    key: 'inspection',
                    icon: <MenuIcon view='inspection' />,
                    label: t('定时巡检'),
                }] : [ ],
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('日志查看'),
                },
                ... node_type !== NodeType.controller ? [{
                    key: 'data-collection',
                    icon: <MenuIcon view='data-collection' />,
                    label: t('数据采集'),
                    children: [
                        {
                            icon: <MenuIcon view='data-connection' />,
                            label: t('连接信息'),
                            key: 'data-connection'
                        },
                        {
                            icon: <MenuIcon view='parser-template' />,
                            label: t('解析模板'),
                            key: 'parser-template'
                        }
                    ]
                }] : [ ],
                ... admin ? [
                    {
                        key: 'plugins',
                        icon: <MenuIcon view='plugins' />,
                        label: t('插件管理'),
                }] : [ ],
                ... factor_platform && node_type !== NodeType.controller && !model.dev ? [{
                    key: 'factor',
                    icon: <MenuIcon view='factor' />,
                    label: <Link className='starfish-link' target='_blank' href={factor_href}>{t('因子平台')}</Link>
                }] : [ ],
                {
                    key: 'finance-guide',
                    label: t('金融库表向导'),
                    title: t('金融库表向导'),
                    icon: <MenuIcon view='finance-guide'/>
                },
                {
                    key: 'iot-guide',
                    label: t('物联网库表向导'),
                    title: t('物联网库表向导'),
                    icon: <MenuIcon view='iot-guide'/>
                },
                ... dev ? [
                    {
                        key: 'test',
                        icon: <ExperimentOutlined className='icon-menu' />,
                        label: '测试模块'
                }] : [ ],
                ... admin ? [
                    {
                        key: 'settings',
                        icon: <SettingOutlined  className='icon-menu' />,
                        label: t('功能设置')
                }] : [ ],
            ].filter(item => model.is_module_visible(item.key))}
        />
    </Layout.Sider>
}
