import 'xshell/scroll-bar.sass'

import './formily-patch.scss'
import './index.sass'
import './pagination.sass'


import { Component, useEffect, type PropsWithChildren } from 'react'
import { createRoot } from 'react-dom/client'

import NiceModal from '@ebay/nice-modal-react'

import { Layout, ConfigProvider, App, Result, Button } from 'antd'
import zh from 'antd/es/locale/zh_CN.js'
import en from 'antd/locale/en_US.js'
import ja from 'antd/locale/ja_JP.js'
import ko from 'antd/locale/ko_KR.js'


import { language, t } from '../i18n/index.js'

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
import { dashboard } from './dashboard/model.js'


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
    
    
    // 挂载全局的错误处理方法，在 onClick, useEffect 等回调中报错且未 catch 时弹框显示错误
    useEffect(() => {
        function on_global_error ({ error, reason }: ErrorEvent & PromiseRejectionEvent) {
            error ??= reason
            
            if (!error.shown) {
                error.shown = true
                
                // 忽略 monaco editor 的错误
                // https://github.com/microsoft/monaco-editor/issues/4325
                if (error.message.includes('getModifierState is not a function'))
                    return
                
                const in_dashboard = new URLSearchParams(location.search).get('dashboard')
                
                if (in_dashboard)
                    dashboard.show_error({ error })
                else
                    model.show_error({ error })
            }
        }
        
        
        window.addEventListener('error', on_global_error)
        window.addEventListener('unhandledrejection', on_global_error)
        
        return () => {
            window.removeEventListener('error', on_global_error)
            window.removeEventListener('unhandledrejection', on_global_error)
        }
    }, [ ])
    
    
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
    
    if (!inited)
        return null
    
    return <Layout className='root-layout'>
        { header && <Layout.Header className='ddb-header'>
            <DdbHeader />
        </Layout.Header> }
        <Layout className='body' hasSider>
            { sider && <DdbSider />}
            <Layout.Content className='view'>
                <DdbErrorBoundary>
                    <DdbContent />
                </DdbErrorBoundary>
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
    
    return <div className={`view-card ${view}`}>
        <View />
    </div>
}


interface DdbErrorBoundaryState {
    error?: Error
}


class DdbErrorBoundary extends Component<PropsWithChildren<{ }>, DdbErrorBoundaryState> {
    override state: DdbErrorBoundaryState = { error: null }
    
    
    static getDerivedStateFromError (error: Error) {
        return { error }
    }
    
    
    override render () {
        const { error } = this.state
        
        if (error) {
            const { title, body } = model.format_error(error)
            
            return <Result
                className='global-error-result'
                status='error'
                title={title}
                subTitle={body}
                extra={<Button onClick={() => { this.setState({ error: null }) }}>{t('关闭')}</Button>}
            />
        } else
            return this.props.children
    }
}
