import 'gridstack/dist/gridstack.css'
import 'gridstack/dist/gridstack-extra.css'
import './index.sass'


import { createRef, useCallback, useEffect, useRef, useState } from 'react'

import { GridStack, GridStackNode } from 'gridstack'

import { ConfigProvider, theme } from 'antd'

import { genid } from 'xshell/utils.browser.js'


import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Navigation } from './Navigation/Navigation.js'
import { widget_nodes } from './storage/widget_node.js'


// gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
// 目前本项目仅支持仅支持 tmpcol <= 12
const tmpcol = 12, tmprow = 12

export function DashBoard () {
    const [widget_options, set_widget_options] = useState([ ...widget_nodes ])
    const [all_widgets, set_all_widgets] = useState([ ])
    const [active_widget_id, set_active_widget_id] = useState('')
    
    const rwidgets = useRef({ })
    const rgrid = useRef<GridStack>()
    const rlock = useRef(false)
    
    // 编辑、预览状态切换
    const [editing, set_editing] = useState(true)
    
    const change_editing = (editing: boolean) => {
        set_editing(editing)
        rgrid.current.enableMove(editing)
        rgrid.current.enableResize(editing)
    }
    
    const change_active_widgets = useCallback((widgets_id: string) => {
        set_active_widget_id(widgets_id)
    }, [ ])
    
    // 给每个表项生成对应的 ref
    if (Object.keys(rwidgets.current).length !== widget_options.length)
        widget_options.forEach(({ id }) => {
            rwidgets.current[id] = rwidgets.current[id] || createRef()
        })
    
    useEffect(() => {
        rgrid.current = rgrid.current || GridStack.init({
            acceptWidgets: true,
            float: true,
            column: tmpcol,
            row: tmprow,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        
        rlock.current = true
        
        rgrid.current.batchUpdate()
        rgrid.current.removeAll(false)
        widget_options.forEach(({ id }) => rgrid.current.makeWidget(rwidgets.current[id].current))
        rgrid.current.batchUpdate(false)
        
        rlock.current = false
        
    }, [ widget_options ])
    
    
    useEffect(() => {
        rgrid.current.cellHeight(Math.floor(rgrid.current.el.clientHeight / tmprow))
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        // 响应用户从外部添加新 widget 到 GridStack 的事件
        rgrid.current.on('added', function (event: Event, news: GridStackNode[]) {
            // 加锁，防止因更新 state 导致的无限循环
            if (rlock.current) {
                set_all_widgets(() => [...news])
                return
            }
            // 当用户从外部移入新 dom 时，执行下列代码
            // 去除移入的新 widget
            rgrid.current.removeWidget(news[0].el)
            set_widget_options( item => [...item, { id: String(genid()), type: news[0].el.dataset.type, x: news[0].x, y: news[0].y, h: news[0].h, w: news[0].w }])
        })
        
        window.addEventListener('resize', function () {
            rgrid.current.cellHeight(Math.floor(rgrid.current.el.clientHeight / tmprow))
        })
        
        // 响应 GridStack 中 widget 的位置或尺寸变化的事件
        rgrid.current.on('change', (event: Event, items: GridStackNode[]) => {
            for (let node of items) 
                set_widget_options(arr => {
                    let type = ''
                    let widget_arr = arr.filter(item => {
                        if (node.id === item.id) 
                            type = item.type
                        return node.id !== item.id
                    })
                    return [...widget_arr, { id: node.id, type, x: node.x, y: node.y, h: node.h, w: node.w }]
                })
        })
    }, [ ])
    
    
    return <ConfigProvider theme={{ hashed: false, token: { borderRadius: 0, motion: false }, algorithm: theme.darkAlgorithm }}>
        <div className='dashboard'>
            <div className='dashboard-header'>
                <Navigation editing={editing} change_editing={change_editing}/>
            </div>
            <div className='dashboard-main'>
                <SelectSider hidden={editing}/>
                
                {/* 画布区域 (dashboard-canvas) 包含实际的 GridStack 网格和 widgets。每个 widget 都有一个 GraphItem 组件表示，并且每次点击都会更改 active_widget_id */}
                <div className='dashboard-canvas' onClick={() => { change_active_widgets('') }}>
                    <div className='grid-stack' style={{ backgroundSize: `${100 / tmpcol}% ${100 / tmprow}%` }} >
                        {widget_options.map((item, i) =>
                            <div 
                                ref={rwidgets.current[item.id]} 
                                key={item.id} 
                                className='grid-stack-item' 
                                gs-id={item.id} 
                                gs-w={item.w} 
                                gs-h={item.h} 
                                gs-x={item.x} 
                                gs-y={item.y} 
                                onClick={e => {
                                    e.stopPropagation()
                                    change_active_widgets(item.id)
                                }}
                            >
                                <GraphItem item={item} el={all_widgets[i]} grid={rgrid.current} actived={active_widget_id === item.id}/>
                            </div>
                        )}
                    </div>
                </div>
                <SettingsPanel hidden={editing}/>
            </div>
        </div>
    </ConfigProvider>
}
