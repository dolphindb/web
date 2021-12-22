import 'antd/dist/antd.css'
import './index.sass'
import 'xshell/scroll-bar.sass'
import 'xshell/myfont.sass'

import { default as React, useEffect } from 'react'
import ReactDOM from 'react-dom'
import {
    Layout, 
    Menu,
    ConfigProvider,
} from 'antd'
import {
    ApartmentOutlined,
} from '@ant-design/icons'
import zh from 'antd/lib/locale/zh_CN'
import en from 'antd/lib/locale/en_US'
import ja from 'antd/lib/locale/ja_JP'
import ko from 'antd/lib/locale/ko_KR'

import { model, CloudModel } from './model'

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
                {/* 目前只有一个管理界面，先隐藏侧边菜单 */}
                {/* <DdbSider /> */}
                <Layout.Content className='view'>
                    <DdbContent />
                </Layout.Content>
            </Layout>
        </Layout>
    </ConfigProvider>
}


function DdbHeader () {
    return <>
        <div className='logo'>
            <img src='./ddb.png' />
            <span className='title'>DolphinDB Cloud</span>
        </div>
    </>
}


function DdbSider () {
    const { view } = model.use(['view'])
    
    return <Layout.Sider width={200} className='sider' theme='light' collapsible>
        <Menu
            className='menu'
            mode='inline'
            theme='light'
            selectedKeys={[view]}
            onSelect={({ key }) => {
                model.set({ view: key as CloudModel['view'] })
            }}
        >
            <Menu.Item key='cloud' icon={<ApartmentOutlined />}>{t('集群管理')}</Menu.Item>
        </Menu>
    </Layout.Sider>
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


ReactDOM.render(<DolphinDB/>, document.querySelector('.root'))
