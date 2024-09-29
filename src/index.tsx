import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'
import './pagination.sass'


import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

import NiceModal from '@ebay/nice-modal-react'

import { Layout, ConfigProvider, App } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'

import { ProConfigProvider } from '@ant-design/pro-components'

import dayjs from 'dayjs'

import { SWRConfig } from 'swr'

import { language } from '../i18n/index.ts'

import 'dayjs/locale/zh-cn'
dayjs.locale(language === 'zh' ? 'zh-cn' : language)

import { model, type PageViews } from './model.ts'

import { DdbHeader } from './components/DdbHeader.tsx'
import { DdbSider } from './components/DdbSider.tsx'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx'
import { HostSelect } from './components/HostSelect.tsx'

import { Login } from './login/index.tsx'
import { Overview } from './overview/index.tsx'
import { Config } from './config/index.tsx'
import { Shell } from './shell/index.tsx'
import { Test } from './test/index.tsx'
import { Job } from './job/index.tsx'
import { Log } from './log/index.tsx'
import { Plugins } from './plugins/index.tsx'
import { Computing } from './computing/index.tsx'
import { DashBoard } from './dashboard/index.tsx'
import { User, Group } from './access/index.tsx'
import { Settings } from './settings/index.tsx'
import { CreateGuide } from './guide/iot-guide/index.tsx'
import { FinanceGuide } from './guide/finance-guide/index.tsx'
import { DataCollection } from './data-collection/index.tsx'




createRoot(
    document.querySelector('.root')
).render(<DolphinDB />)


const locales = { zh, en, ja, ko }

function DolphinDB () {
    return <ConfigProvider
        locale={locales[language] as any}
        button={{ autoInsertSpace: false }}
        theme={{
            hashed: false,
            token: {
                motion: false,
                
                borderRadius: 0,
                
                controlOutlineWidth: 0,
            }
        }}
        renderEmpty={() => <div className='empty-placeholder' />}
    >
        <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            errorRetryCount: 0
        }}>
            <ProConfigProvider hashed={false} token={{ borderRadius: 0, motion: false }}>
                <NiceModal.Provider>
                    <App className='app'>
                        <MainLayout />
                    </App>
                </NiceModal.Provider>
            </ProConfigProvider>
        </SWRConfig>
    </ConfigProvider>
}


function MainLayout () {
    const { header, inited, sider, client_auth, logined } = model.use(['header', 'inited', 'sider', 'client_auth', 'logined'])
    
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(model, App.useApp())
    
    
    useEffect(() => {
        model.init()
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
                    await model.recompile_and_refresh()
                }
            }
            
            window.addEventListener('keydown', on_keydown)
            
            return () => { window.removeEventListener('keydown', on_keydown) }
        }
    }, [ ])
    
    if (!logined && client_auth)
        return <GlobalErrorBoundary>
            <div className='force-login login'>
                <Login />
            </div>
        </GlobalErrorBoundary>
        
    return inited ?
        <Layout className='root-layout'>
            { header && <Layout.Header className='ddb-header'>
                <DdbHeader />
            </Layout.Header> }
            <Layout className='body' hasSider>
                { sider && <DdbSider />}
                <Layout.Content className='view'>
                    <GlobalErrorBoundary>
                        <DdbContent />
                    </GlobalErrorBoundary>
                </Layout.Content>
            </Layout>
        </Layout>
    :
        <GlobalErrorBoundary>
            { (model.dev || model.test) && <div className='host-select-container'>
                <HostSelect size='middle' />
            </div> }
        </GlobalErrorBoundary>
}


const views: Partial<Record<PageViews, React.FunctionComponent>> = {
    login: Login,
    overview: Overview,
    config: Config,
    shell: Shell,
    test: Test,
    job: Job,
    log: Log,
    plugins: Plugins,
    computing: Computing,
    dashboard: DashBoard,
    user: User,
    group: Group,
    settings: Settings,
    'data-connection': DataCollection,
    'parser-template': DataCollection,
    'iot-guide': CreateGuide,
    'finance-guide': FinanceGuide,
}


function DdbContent () {
    const { view } = model.use(['view'])
    
    const View = views[view]
    
    if (!View || !model.is_module_visible(view))
        return null
    
    return <div className={`view-card ${view}`}>
        <View />
    </div>
}

