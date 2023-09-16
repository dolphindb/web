import 'gridstack/dist/gridstack.css'
import 'gridstack/dist/gridstack-extra.css'
import './index.sass'


import { createRef, useEffect, useRef, useState } from 'react'

import { GridStack, type GridStackNode, type GridStackElement, type GridStackWidget } from 'gridstack'

import { ConfigProvider, theme } from 'antd'

import { genid } from 'xshell/utils.browser.js'


import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Navigation } from './Navigation/Navigation.js'
import { Widget, WidgetType } from './model.js'


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
    const [widgets, set_widgets] = useState<Widget[]>([ ])
    
    const [active_widget_id, set_active_widget_id] = useState('')
    
    /** div ref, 创建 GridStack 时绑定的 div element */
    let rdiv = useRef<HTMLDivElement>()
    
    /** grid ref, 保存 GridStack.init 创建的 gridstack 实例 */
    let rgrid = useRef<GridStack>()
    
    
    /** widgets ref，是一个 Map<widget.id, ref GridStackElement>， 存放 id -> widget ref (GridStackElement) 的映射，
        这个 ref 用于指向在 DOM 中表示该 widget 的元素 */
    let { current: map } = useRef(new Map<string, React.MutableRefObject<HTMLDivElement>>())
    
    // 给每个 widget 创建对应的 ref
    if (map.size !== widgets.length) {
        map.clear()
        for (const { id } of widgets)
            map.set(id, createRef())
    }
    
    // 编辑、预览状态切换
    const [editing, set_editing] = useState(true)
    
    const [, rerender] = useState({ })
    
    
    // 初始化 GridStack 并配置事件监听器
    useEffect(() => {
        let grid = rgrid.current = GridStack.init({
            acceptWidgets: true,
            float: true,
            column: maxcols,
            row: maxrows,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        
        grid.cellHeight(Math.floor(grid.el.clientHeight / maxrows))
        
        // 响应用户从外部添加新 widget 到 GridStack 的事件
        grid.on('dropped', (event: Event, old_widget: GridStackNode, widget: GridStackNode) => {
            // old_widget 为 undefined
            
            console.log('dropped', event, widget)
            
            set_widgets(widgets => [
                ...widgets, 
                { ...widget, id: String(genid()), type: widget.el.dataset.type as keyof typeof WidgetType }
            ])
            
            grid.removeWidget(widget.el)
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        grid.on('change', (event: Event, items: GridStackNode[]) => {
            for (let node of items) 
                set_widgets(widgets => {
                    let type: keyof typeof WidgetType = 'LINE'
                    let widget_arr = widgets.filter(item => {
                        if (node.id === item.id) 
                            type = item.type
                        return node.id !== item.id
                    })
                    return [...widget_arr, { id: node.id, type, x: node.x, y: node.y, h: node.h, w: node.w }]
                })
        })
        
        // todo: throttle?
        window.addEventListener('resize', () => {
            grid.cellHeight(Math.floor(grid.el.clientHeight / maxrows))
        })
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        return () => {
            console.log('destroy')
            grid.destroy()
            rgrid.current = null
        }
    }, [ ])
    
    
    // widget 变化时通过 GridStack.makeWidget 将画布中已有的 dom 节点交给 GridStack 管理 
    useEffect(() => {
        if (widgets.length !== map.size) {
            console.log('widgets.length !== map.size')
            rerender({ })
            return
        }
        
        let { current: grid } = rgrid
        
        grid.batchUpdate(true)
        
        grid.removeAll(false)
        
        for (const widget of widgets)
            // 返回 GridItemHTMLElement 类型 (就是在 dom 节点上加了 gridstackNode: GridStackNode 属性)，好像也没什么用
            grid.makeWidget(map.get(widget.id).current)
        
        grid.batchUpdate(false)
    }, [widgets])
    
    
    return <ConfigProvider theme={{ hashed: false, token: { borderRadius: 0, motion: false }, algorithm: theme.darkAlgorithm }}>
        <div className='dashboard'>
            <div className='dashboard-header'>
                <Navigation
                    editing={editing}
                    change_editing={(editing: boolean) => {
                        let { current: grid } = rgrid
                        set_editing(editing)
                        grid.enableMove(editing)
                        grid.enableResize(editing)
                    }}/>
            </div>
            <div className='dashboard-main'>
                <SelectSider hidden={editing}/>
                
                {/* 画布区域 (dashboard-canvas) 包含实际的 GridStack 网格和 widgets。每个 widget 都有一个 GraphItem 组件表示，并且每次点击都会更改 active_widget_id */}
                <div className='dashboard-canvas' onClick={() => { set_active_widget_id('') }}>
                    <div className='grid-stack' ref={rdiv} style={{ backgroundSize: `${100 / maxcols}% ${100 / maxrows}%` }} >
                        {widgets.map((widget, i) =>
                            <div 
                                className='grid-stack-item'
                                key={widget.id}
                                
                                // 保存 dom 节点，在 widgets 更新时将 ref 给传给 react `<div>` 获取 dom
                                ref={map.get(widget.id)}
                                
                                gs-id={widget.id} 
                                gs-w={widget.w} 
                                gs-h={widget.h} 
                                gs-x={widget.x} 
                                gs-y={widget.y} 
                                
                                onClick={ event => {
                                    event.stopPropagation()
                                    set_active_widget_id(widget.id)
                                }}
                            >
                                <GraphItem
                                    widget={widget}
                                    actived={active_widget_id === widget.id}
                                    set_widgets={set_widgets}
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                <SettingsPanel hidden={editing}/>
            </div>
        </div>
    </ConfigProvider>
}


// gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
// 目前本项目仅支持仅支持 <= 12
const maxcols = 12
const maxrows = 12
