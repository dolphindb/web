import 'gridstack/dist/gridstack.css'
import 'gridstack/dist/gridstack-extra.css'
import './index.sass'


import { useEffect, useRef } from 'react'

import { ConfigProvider, theme } from 'antd'


import { dashboard } from './model.js'

import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Navigation } from './Navigation/Navigation.js'


/** 基于 GridStack.js 开发的拖拽图表可视化面板  
    https://gridstackjs.com/
    https://github.com/gridstack/gridstack.js/tree/master/doc
    
    GridStack.init 创建实例保存到 rgrid  
    所有的 widgets 配置保存在 widgets state 中  
    通过 map 保存 dom 节点，在 widgets 配置更新时将 ref 给传给 react `<div>` 获取 dom  
    通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理  
    通过 GridStack.on('dropped', ...) 监听用户从外部添加拖拽 widget 到 GridStack 的事件  
    通过 GridStack.on('change', ...) 响应 GridStack 中 widget 的位置或尺寸变化的事件 */
export function DashBoard () {
    const { widgets, editing } = dashboard.use(['widgets', 'editing'])
    
    /** div ref, 创建 GridStack 时绑定的 div element */
    let rdiv = useRef<HTMLDivElement>()
    
    
    useEffect(() => {
        dashboard.init()
        
        return () => { dashboard.dispose() }
    }, [ ])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理 
    useEffect(() => {
        dashboard.render_widgets()
    }, [widgets])
    
    
    return <ConfigProvider theme={{ hashed: false, token: { borderRadius: 0, motion: false }, algorithm: theme.darkAlgorithm }}>
        <div className='dashboard'>
            <div className='dashboard-header'>
                <Navigation />
            </div>
            <div className='dashboard-main'>
                <SelectSider hidden={editing}/>
                
                {/* 画布区域 (dashboard-canvas) 包含实际的 GridStack 网格和 widgets。每个 widget 都有一个 GraphItem 组件表示，并且每次点击都会更改 active_widget_id */}
                <div className='dashboard-canvas' onClick={() => { dashboard.set({ widget: null }) }}>
                    <div className='grid-stack' ref={rdiv} style={{ backgroundSize: `${100 / dashboard.maxcols}% ${100 / dashboard.maxrows}%` }} >
                        {widgets.map(widget =>
                            <div 
                                className='grid-stack-item'
                                key={widget.id}
                                
                                // 保存 dom 节点，在 widgets 更新时将 ref 给传给 react `<div>` 获取 dom
                                ref={widget.ref}
                                
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
                
                <SettingsPanel hidden={editing}/>
            </div>
        </div>
    </ConfigProvider>
}


