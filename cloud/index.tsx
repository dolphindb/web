import 'xshell/scroll-bar.sass'

import './index.sass'

import { default as React, useEffect, useState } from 'react'
import { createRoot as create_root } from 'react-dom/client'

import {
    ConfigProvider,
    
    Layout,
    
    // @ts-ignore 使用了 antd-with-locales 之后 window.antd 变量中有 locales 属性
    locales,
    Menu,
    Typography,
} from 'antd'

import {
    default as _Icon,
    DoubleLeftOutlined,
    DoubleRightOutlined,
} from '@ant-design/icons'
import SvgCluster from './cluster.icon.svg'

const Icon: typeof _Icon.default = _Icon as any

import { CloudModel, model, PageViews } from './model.js'

import { language, t } from '../i18n/index.js'

import { Cloud } from './cloud.js'

const { Text } = Typography
const locale_names = {
    zh: 'zh_CN',
    en: 'en_US',
    ja: 'ja_JP',
    ko: 'ko_KR'
} as const


const svgs: {[key in PageViews]: any} = {
    cluster: SvgCluster,
    grafana: SvgCluster
}

function DolphinDB () {
    const { inited } = model.use(['inited'])
    
    useEffect(() => {
        model.init()
    }, [ ])
    
    if (!inited)
        return null
    
    return <ConfigProvider locale={locales[locale_names[language]]} autoInsertSpaceInButton={false}>
        <Layout className='root-layout'>
            <Layout.Header className='ddb-header'>
                <DdbHeader />
            </Layout.Header>
            <Layout className='body' hasSider>
                <DdbSider />
                <Layout.Content className='view'>
                    <DdbContent />
                </Layout.Content>
            </Layout>
        </Layout>
    </ConfigProvider>
    
}


function DdbHeader () {
    return <div>
        <img className='logo' src='./cloud.svg' />
        
        <div className='padding' />
    </div>
}


const views: {[key in PageViews]: any}= {
    cluster: Cloud,
    grafana: Grafana
}

function Grafana () {
    const [src, set_source] = useState('//192.168.0.65:32083/?&var-cluster_name=sdf&var-dolphindb_node=All')
    
    useEffect(()=>{
        console.log('RELOAD')
    }, [src])
    
    return <iframe className='iframe' src={src}/>
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    useEffect(()=>{
        console.log('current view', view)
    }, [view])
    
    if (!View)
        return null
    
    // 这里要决定是 view-card 还是 view
    return <div className={`view-card ${view}`}>
        <View/>
    </div>
}

function MenuIcon ({ view }: { view: CloudModel['view'] }) {
    return <Icon className='icon-menu' component={svgs[view]} />
}


function DdbSider () {
    const { view, collapsed} = model.use(['view', 'collapsed'])
    
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
                    key: 'grafana',
                    icon: <MenuIcon view='grafana' />,
                    label: t('嵌入页面'),
                }
            ]}
        />
    </Layout.Sider>
}

create_root(
    document.querySelector('.root')
).render(<DolphinDB/>)
