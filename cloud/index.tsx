import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import '../fonts/myfont.sass'

import { default as React, useEffect } from 'react'
import ReactDOM from 'react-dom'
import {
    Layout, 
    ConfigProvider,
    Menu
} from 'antd'
import zh from 'antd/lib/locale/zh_CN'
import en from 'antd/lib/locale/en_US'
import ja from 'antd/lib/locale/ja_JP'
import ko from 'antd/lib/locale/ko_KR'

import { model } from './model'

import { language, t } from '../i18n'

import Cloud from './cloud'


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
                {/* 目前只有一个管理界面，先不加侧边菜单 */}
                {/* <DbDSider /> */}
                <Layout.Content className='view'>
                    <DdbContent />
                </Layout.Content>
            </Layout>
        </Layout>
    </ConfigProvider>
}


function DdbHeader () {
    return <>
        <img className='logo' src='./cloud.svg' />
        
        <div className='padding' />
    </>
}


const views = {
    cloud: Cloud,
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



function DbDSider() {

    const { clusters } = model.use(['clusters'])


    const handleClick = (e) => {
        console.log('menu click:', e)
    }

    const handleTitleClick = e => {
        console.log('title cilck:', e)
    }

    return <Layout.Sider
        width={256}
        theme='light'
    >
        <Menu
            mode='inline'
            onClick={handleClick}
            theme='light'
        >
            <Menu.SubMenu title={t('集群管理')} key='cluster' onTitleClick={handleTitleClick}>
                {clusters.map((cluster) => {
                    return (
                        <Menu.SubMenu 
                            title={`${cluster.namespace}/${cluster.name}`} 
                            key={`${cluster.namespace}/${cluster.name}`} 
                            onTitleClick={handleTitleClick}
                        >
                            <Menu.Item key={`${cluster.namespace}/${cluster.name}/info`}>Info</Menu.Item>
                            <Menu.Item key={`${cluster.namespace}/${cluster.name}/config`}>Configuration</Menu.Item>
                        </Menu.SubMenu>
                    )
                })}   
            </Menu.SubMenu>
        </Menu>
    </Layout.Sider>
}


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
