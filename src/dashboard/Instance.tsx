import { useEffect, useRef } from 'react'

import { App, ConfigProvider, Spin } from 'antd'

import { useParams } from 'react-router'

import { delay } from 'xshell/utils.browser.js'

import { t } from '@i18n'

import { model } from '@model'

import { dark } from '@theme'

import { get_shared_dashboards, paste_widget } from './utils.ts'

import { Sider } from './Sider.tsx'
import { GraphItem } from './GraphItem/GraphItem.tsx'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.tsx'
import { Header } from './Header.tsx'
import { DashboardPermission, dashboard } from './model.ts'
import { DASHBOARD_SHARED_SEARCH_KEY } from './constant.ts'



export function DashboardInstancePage () {
    const { loading } = dashboard.use(['loading'])
    const { id } = useParams()
    
    return <ConfigProvider theme={dark}>
        <App className='app'>
            <Spin spinning={loading} delay={500} size='large'>
                <DashboardInstance id={id}/>
            </Spin>
        </App>
    </ConfigProvider>
}

function DashboardInstance ({ id }: { id: string }) {
    const { widgets, widget, config, editing } = dashboard.use(['widgets', 'widget', 'config', 'editing'])
    
    /** div ref, 用于创建 GridStack  */
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    // App 组件通过 Context 提供上下文方法调用，因而 useApp 需要作为子组件才能使用
    Object.assign(dashboard, App.useApp())
    
    // 监听 ctrl v 事件，复制组件
    useEffect(() => { 
        window.addEventListener('paste', paste_widget)
        return () => { window.removeEventListener('paste', paste_widget) }
    }, [ ])
    
    useEffect(() => {
        dashboard.init(rdiv.current)
        return () => { dashboard.dispose() }
    }, [ ])
    
    
    useEffect(() => {
        (async () => {
            const dashboard_id = Number(id)
            if (dashboard_id) 
                try {
                    const config = await dashboard.get_dashboard_config(dashboard_id)
                    dashboard.set({ config })
                    await dashboard.render_with_config(config)
                } catch (error) {
                    model.message.error(t('dashboard 不存在'))
                    const shared_ids = get_shared_dashboards()
                    // 如果是分享的 dashboard 被删除, 切到下一个分享的 dashboard, 修改 search
                    if (shared_ids.includes(id) && shared_ids.length > 1) {
                        // 0.5s 后跳转，让用户看到报错
                        await delay(500)
                        model.goto(`${model.assets_root}dashboard/${shared_ids[1]}/`, {
                            queries: {
                                [DASHBOARD_SHARED_SEARCH_KEY]: shared_ids.filter(item => item !== id).join(',')
                            }
                        })
                    } else
                        dashboard.return_to_overview()   
                }
        })()
    }, [id])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理
    useEffect(() => {
        dashboard.render_widgets()
    }, [widgets])
    
    const page_count = config?.data?.canvas?.page_count ?? 1
    
    useEffect(() => {
        dashboard.update_css_for_element_height(page_count)
    }, [page_count])
    
    useEffect(() => {
        if (dashboard.editing) {
            if (config?.permission === DashboardPermission.view) 
                dashboard.on_preview()
            dashboard.set({ save_confirm: true })
        }
    }, [config, editing])
    
    
    return <div className='dashboard' >
        <div className='dashboard-header'>
            <Header />
        </div>
        <div className='dashboard-main'>
            <Sider visible={editing}/>
            
            {/* 画布区域 (dashboard-canvas) 包含实际的 GridStack 网格和 widgets。每个 widget 都有一个 GraphItem 组件表示，并且每次点击都会更改 dashboard.widget */}
            <div className='dashboard-canvas' onClick={() => { dashboard.set({ widget: null }) }}>
                <div className='grid-stack' ref={rdiv} style={{ backgroundSize: `${100 / dashboard.maxcols}% ${100 / dashboard.maxrows}%` }} >
                    {widgets.map(widget =>
                        <div 
                            className='grid-stack-item'
                            key={widget.id}
                            
                            // 保存 dom 节点，在 widgets 更新时将 ref 给传给 react `<div>` 获取 dom
                            ref={widget.ref as any}
                            
                            gs-id={widget.id}
                            gs-w={widget.w}
                            gs-h={widget.h}
                            gs-x={widget.x}
                            gs-y={widget.y}
                            
                            onClick={ event => {
                                event.stopPropagation()
                                dashboard.set({ widget })
                            }}
                        >
                            <GraphItem widget={widget} />
                        </div>
                    )}
                </div>
            </div>
            
            <SettingsPanel hidden={!editing || widget?.type === 'TEXT'}/>
        </div>
    </div>
}
