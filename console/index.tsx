import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'


import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import NiceModal from '@ebay/nice-modal-react'

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
import { DashBoard } from './dashboard/index.js'
import { Job } from './job.js'
import { Log } from './log.js'
import { GridDashBoard } from './gridstack/index.js'


createRoot(
    document.querySelector('.root')
).render(<DolphinDB />)


const locales = { zh, en, ja, ko }

function DolphinDB () {
    return <ConfigProvider
        locale={locales[language] as any}
        autoInsertSpaceInButton={false}
        theme={{ hashed: false, token: { borderRadius: 0 } }}
    >
        <NiceModal.Provider>
            <App className='app'>
                <MainLayout />
            </App>
        </NiceModal.Provider>
    </ConfigProvider>
}


function MainLayout () {
    const { header, inited } = model.use(['header', 'inited'])
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(model, App.useApp())
    
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
    
    return <Layout className='root-layout'>
        { header && <Layout.Header className='ddb-header'>
            <DdbHeader />
        </Layout.Header> }
        <Layout className='body' hasSider>
            <DdbSider />
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
    dashboard: DashBoard,
    job: Job,
    log: Log,
    gridstack: GridDashBoard
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View)
        return null
    
    return <div className={`view-card ${view}`}>
        <View />
    </div>
}
