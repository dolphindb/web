import { Layout, Menu, Typography } from 'antd'

import { default as Icon, DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons'


import { t } from '../../i18n/index.js'

import { model, DdbModel, NodeType, storage_keys } from '../model.js'


import SvgOverview from '../overview/icons/overview.icon.svg'
import SvgShell from '../shell/index.icon.svg'
import SvgDashboard from '../dashboard/icons/dashboard.icon.svg'
import SvgJob from '../job.icon.svg'
import SvgLog from '../log.icon.svg'
import SvgFactor from '../factor.icon.svg'


const { Text, Link } = Typography


const svgs = {
    overview: SvgOverview,
    shell: SvgShell,
    dashboard: SvgDashboard,
    job: SvgJob,
    log: SvgLog,
    factor: SvgFactor
}

function MenuIcon ({ view }: { view: DdbModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}

export function DdbSider () {
    const { view, node_type, collapsed, logined, login_required } = model.use(['view', 'node_type', 'collapsed', 'logined', 'login_required'])
    
    const search_params = new URLSearchParams({
        logined: Number(model.logined).toString(),
        ...localStorage.getItem(storage_keys.ticket) ? { token: localStorage.getItem(storage_keys.ticket) } : { }
    }).toString()
    
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
                if (login_required && !logined) {
                    model.message.error(t('请登录'))
                    return
                }
                if (key === 'factor-platform')
                    return
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
                ... model.dev ? [{
                       key: 'dashboard',
                       icon: <MenuIcon view='dashboard' />,
                       label: t('数据看板')
                }] : [ ],
                {
                    key: 'job',
                    icon: <MenuIcon view='job' />,
                    label: t('作业管理'),
                },
                {
                    key: 'log',
                    icon: <MenuIcon view='log' />,
                    label: t('日志查看'),
                },
                ... model.is_factor_platform_enabled ? [{
                    key: 'factor-platform',
                    icon: <Icon className='icon-menu' component={SvgFactor} />,
                    label: <Link target='_blank' 
                                 href={`factor-platform/index.html?${search_params}}`}>
                                {t('因子平台')}
                        </Link>
                    
                }] : [ ]
            ]}
        />
    </Layout.Sider>
}
