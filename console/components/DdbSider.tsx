import { useMemo } from 'react'

import { Layout, Menu, Typography } from 'antd'

import { default as Icon, DoubleLeftOutlined, DoubleRightOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons'

import { isNil, omitBy } from 'lodash'


import { t } from '../../i18n/index.js'

import { model, type DdbModel, NodeType, storage_keys } from '../model.js'


import SvgOverview from '../overview/icons/overview.icon.svg'
import SvgShell from '../shell/index.icon.svg'
import SvgDashboard from '../dashboard/icons/dashboard.icon.svg'
import SvgJob from '../job.icon.svg'
import SvgLog from '../log.icon.svg'
import SvgFactor from '../factor.icon.svg'
import SvgComputing from '../computing/icons/computing.icon.svg'
import SvgTools from '../icons/tools.icon.svg'


const { Text, Link } = Typography


const svgs = {
    overview: SvgOverview,
    shell: SvgShell,
    dashboard: SvgDashboard,
    job: SvgJob,
    log: SvgLog,
    factor: SvgFactor,
    computing: SvgComputing,
    tools: SvgTools,
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}

export function DdbSider () {
    const { view, node_type, collapsed, logined, login_required } = model.use(['view', 'node_type', 'collapsed', 'logined', 'login_required'])
    
    
    const factor_href = useMemo(() => {
        const search_params = new URLSearchParams(location.search)
        
        return 'factor-platform/index.html?' + new URLSearchParams(omitBy({
            ddb_hostname: search_params.get('hostname'),
            ddb_port: search_params.get('port'),
            logined: Number(logined).toString(),
            token: localStorage.getItem(storage_keys.ticket)
        }, isNil)).toString()
    },
        [logined]
    )
    
    return <Layout.Sider
        width={170}
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
                if (login_required && !logined) {
                    model.message.error(t('请登录'))
                    return
                }
                
                if (key === 'factor')
                    return
                
                model.set_query('view', key)
                
                model.set({ view: key as DdbModel['view'] })
            }}
            inlineIndent={10}
            items={[
                ... model.dev || model.cdn ? [{
                    key: 'overview',
                    icon: <MenuIcon view='overview' />,
                    label: node_type === NodeType.single ? t('单机总览') : t('集群总览'),
                }] : [ ],
                ... !model.cdn && node_type === NodeType.controller ? [{
                    key: 'overview-old',
                    icon: <MenuIcon view='overview' />,
                    label: t('集群总览'),
                }] : [ ],
                {
                    key: 'shell',
                    icon: <MenuIcon view='shell' />,
                    label: t('交互编程'),
                },
                {
                    key: 'job',
                    icon: <MenuIcon view='job' />,
                    label: t('作业管理'),
                },
                {
                    key: 'computing',
                    icon: <MenuIcon view='computing' />,
                    label: t('流计算监控'),
                },
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('日志查看'),
                },
                ... model.is_factor_platform_enabled ? [{
                    key: 'factor',
                    icon: <MenuIcon view='factor' />,
                    label: <Link target='_blank' href={factor_href}>{t('因子平台')}</Link>
                }] : [ ],
                {
                    key: 'dashboard',
                    icon: <MenuIcon view='dashboard' />,
                    label: t('数据面板'),
                },
                {
                    key: 'tools',
                    icon: <MenuIcon view='tools' />,
                    label: t('运维工具'),
                    children: [
                        {
                            key: 'iot-guide',
                            label: '物联网库表创建引导'
                        },
                        {
                            key: 'finance-guide',
                            label: '金融库表创建引导'
                        }
                    ]
                },
                ... model.dev || model.cdn ? [
                    {
                        key: 'test',
                        icon: <ExperimentOutlined className='icon-menu' />,
                        label: '测试模块'
                }] : [ ],
            ]}
        />
    </Layout.Sider>
}
