import 'xshell/scroll-bar.sass'

import './index.sass'
import './index.shf.sass'
import './pagination.sass'


import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

import { createBrowserRouter, RouterProvider, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router'

import NiceModal from '@ebay/nice-modal-react'

import { Layout, ConfigProvider, App } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'

import { ProConfigProvider } from '@ant-design/pro-components'

import dayjs from 'dayjs'

import { SWRConfig } from 'swr'

import { language } from '@i18n'

import 'dayjs/locale/zh-cn'
dayjs.locale(language === 'zh' ? 'zh-cn' : language)

import { model } from '@model'

import { light } from './theme.ts'
import { apply_favicon } from './utils.common.ts'

import { DdbHeader } from './components/DDBHeader/index.tsx'
import { DdbSider } from './components/DdbSider.tsx'
import { HostSelect } from './components/DDBHeader/HostSelect.tsx'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx'

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
import { Inspection } from './inspection/index.tsx'
import { Settings } from './settings/index.tsx'
import { CreateGuide } from './guide/iot-guide/index.tsx'
import { FinanceGuide } from './guide/finance-guide/index.tsx'
import { DataCollection } from './data-collection/index.tsx'
import { Access } from './access/index.tsx'
import { StreamingGraph } from './streaming-graph/index.tsx'
import { Lineage } from './lineage/index.tsx'


createRoot(
    document.querySelector('.root')
).render(<DolphinDB />)


const locales = { zh, en, ja, ko }

function DolphinDB () {
    const { shf } = model.use(['shf'])
    
    return <ConfigProvider
        locale={locales[language] as any}
        button={{ autoInsertSpace: false }}
        theme={light}
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
                    <App className={`app ${shf ? 'shf' : ''}`}>
                        <RouterProvider router={router} />
                    </App>
                </NiceModal.Provider>
            </ProConfigProvider>
        </SWRConfig>
    </ConfigProvider>
}


function MainLayout () {
    const { header, inited, sider, shf } = model.use(['header', 'inited', 'sider', 'shf'])
    
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
    
    
    useEffect(() => {
        if (!inited)
            return
        
        document.title = `${shf ? 'DolphinDB' : model.product_name} - ${model.node_alias}`
        
        let link = apply_favicon(shf)
        
        return () => { document.head.removeChild(link) }
    }, [inited, shf])
    
    
    return inited ?
        <Layout className='root-layout'>
            <RouteListener />
            { header && <DdbHeader />}
            <Layout className='body' hasSider>
                { sider && <DdbSider /> }
                <Layout.Content className='view'>
                    <GlobalErrorBoundary>
                        <div className={`view-card ${model.view}`}>
                            {/* 不能指望延迟的 react router 的 location.pathname 状态来决定渲染哪个组件 */}
                            { model.client_auth && !model.logined 
                                ? <Login />
                                : <Outlet /> }
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


/** 监听路由修改 */
function RouteListener () {
    const location = useLocation()
    const [params] = useSearchParams()
    
    useEffect(() => {
        model.set(
            model.get_header_sider(location.pathname, params))
    }, [location])
    
    return null
}


const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            // 除了改这里还需要改 model 中的 default_view
            {
                index: true,
                element: <Shell />
            },
            {
                path: 'shell/',
                element: <Shell />
            },
            {
              path: 'oauth-github/',
              element: <Shell /> 
            },
            {
                path: 'oauth-gitlab/',
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
                path: 'inspection/*',
                element: <Inspection />,
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
                path: 'dashboard/*',
                element: <DashBoard />
            },
            {
                path: 'access/*',
                element: <Access />
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
            },
            {
                path: 'streaming-graph/*',
                element: <StreamingGraph />
            },
            {
                path: 'lineage/*',
                element: <Lineage />
            }
        ]
    }], 
    model.assets_root === '/' ? undefined : { basename: model.assets_root }
)

