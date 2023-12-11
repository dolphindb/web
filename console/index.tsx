import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'


import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

import NiceModal from '@ebay/nice-modal-react'

import cn from 'classnames'

import { Layout, ConfigProvider, App } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'


import { language } from '../i18n/index.js'

import { model } from './model.js'

import { DdbHeader } from './components/DdbHeader.js'
import { DdbSider } from './components/DdbSider.js'

import { Login } from './login.js'
import { Overview } from './overview/index.js'
import { OverviewOld } from './overview/old.js'
import { Shell } from './shell/index.js'
import { Test } from './test/index.js'
import { Job } from './job.js'
import { Log } from './log.js'
import { Computing } from './computing/index.js'
import { DashBoard } from './dashboard/index.js'


createRoot(
    document.querySelector('.root')
).render(<DolphinDB />)


const locales = { zh, en, ja, ko }

function DolphinDB () {
    return <ConfigProvider
        locale={locales[language] as any}
        autoInsertSpaceInButton={false}
        theme={{ hashed: false, token: { borderRadius: 0, motion: false } }}
    >
        <NiceModal.Provider>
            <App className='app'>
                <MainLayout />
            </App>
        </NiceModal.Provider>
    </ConfigProvider>
}


function MainLayout () {
    const { header, inited, sider } = model.use(['header', 'inited', 'sider'])
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(model, App.useApp())
    
    useEffect(() => {
        model.execute(async () => model.init())
    }, [ ])
    
    useEffect(() => {
        if (model.dev) {
            async function on_keydown (event: KeyboardEvent) {
                const { key, target, ctrlKey: ctrl, altKey: alt } = event
                
                if (
                    key === 'r' && 
                    (target as HTMLElement).tagName !== 'INPUT' && 
                    (target as HTMLElement).tagName !== 'TEXTAREA' && 
                    !ctrl && 
                    !alt
                ) {
                    event.preventDefault()
                    await model.execute(async () => model.recompile_and_refresh())
                }
            }
            
            window.addEventListener('keydown', on_keydown)
            
            return () => { window.removeEventListener('keydown', on_keydown) }
        }
    }, [ ])
    
    if (!inited)
        return null
    
    return <Layout className='root-layout'>
        { header && <Layout.Header className='ddb-header'>
            <DdbHeader />
        </Layout.Header> }
        <Layout className='body' hasSider>
            { sider && <DdbSider />}
            <Layout.Content className='view'>
                <DdbContent />
            </Layout.Content>
        </Layout>
    </Layout>
}


const views = {
    login: Login,
    overview: Overview,
    'overview-old': OverviewOld,
    shell: Shell,
    test: Test,
    job: Job,
    log: Log,
    computing: Computing,
    dashboard: DashBoard,
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={cn('view-card', view, { 'white-pagination': view !== 'dashboard' })}>
        <View />
    </div>
}
