import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'
import './pagination.sass'


import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

import { createBrowserRouter, RouterProvider, Outlet, useNavigate } from 'react-router-dom'

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

import { model } from './model.ts'

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
import { DashboardInstancePage } from './dashboard/Instance.tsx'
import { Overview as DashboardOverview } from './dashboard/Overview.tsx'

import { User, Group } from './access/index.tsx'
import { Settings } from './settings/index.tsx'
import { CreateGuide } from './guide/iot-guide/index.tsx'
import { FinanceGuide } from './guide/finance-guide/index.tsx'
import { DataCollection } from './data-collection/index.tsx'
import { GitOauth } from './git-oauth/oauth.tsx'



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
            },
            components: {
                Tree: {
                    indentSize: 12
                }
            }
        }}
        renderEmpty={() => <div className='empty-placeholder' />}
    >
        <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            errorRetryCount: 0,
            /** throw error 才会被全局错误处理捕获 */
            onError (error) {
                throw error
            }
        }}>
            <ProConfigProvider hashed={false} token={{ borderRadius: 0, motion: false }}>
                <NiceModal.Provider>
                    <App className='app'>
                        <RouterProvider router={router} />
                    </App>
                </NiceModal.Provider>
            </ProConfigProvider>
        </SWRConfig>
    </ConfigProvider>
}


function MainLayout () {
    const { header, inited, sider } = model.use(['header', 'inited', 'sider'])
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(model, App.useApp())
    
    model.navigate = useNavigate()
    
    
    useEffect(() => {
        model.init()
    }, [ ])
    
    
    useEffect(() => {
        if (model.local) {
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
    
    return inited ?
        <Layout className='root-layout'>
            { header && <Layout.Header className='ddb-header'>
                <DdbHeader />
            </Layout.Header> }
            <Layout className='body' hasSider>
                { sider && <DdbSider />}
                <Layout.Content className='view'>
                    <GlobalErrorBoundary>
                        <div className={`view-card ${model.view}`}>
                            <Outlet />
                        </div>
                    </GlobalErrorBoundary>
                </Layout.Content>
            </Layout>
        </Layout>
    :
        <GlobalErrorBoundary>
            { model.dev && <div className='host-select-container'>
                <HostSelect size='middle' />
            </div> }
        </GlobalErrorBoundary>
}


const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            // 除了改这里还需要改 model 中的 defaut_view
            {
                index: true,
                element: <Shell />
            },
            {
                path: 'shell/',
                element: <Shell />
            },
            {
                path: 'login/',
                element: <Login />
            },
            {
                path: 'overview/',
                element: <Overview />
            },
            {
                path: 'config/',
                element: <Config />
            },
            {
                path: 'test/',
                element: <Test />
            },
            {
                path: 'job/',
                element: <Job />
            },
            {
                path: 'log/',
                element: <Log />
            },
            {
                path: 'plugins/',
                element: <Plugins />
            },
            {
                path: 'computing/',
                element: <Computing />
            },
            {
                path: 'dashboard/',
                element: <DashBoard />,
                children: [
                    {
                        index: true,
                        element: <DashboardOverview />
                    },
                    {
                        path: ':id',
                        element: <DashboardInstancePage />
                    },
                ]
            },
            {
                path: 'user/',
                element: <User />
            },
            {
                path: 'group/',
                element: <Group />
            },
            {
                path: 'settings/',
                element: <Settings />
            },
            {
                path: 'data-connection/',
                element: <DataCollection />
            },
            {
                path: 'parser-template/',
                element: <DataCollection />
            },
            {
                path: 'iot-guide/',
                element: <CreateGuide />
            },
            {
                path: 'finance-guide/',
                element: <FinanceGuide />
            }
        ]
    },
    {
        path: 'oauth/',
        element: <GitOauth/>
    }
], 
    model.assets_root === '/' ? undefined : { basename: model.assets_root }
)

