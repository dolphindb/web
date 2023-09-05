import { GridStack, GridStackNode } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import {  createRef, useCallback, useEffect, useRef, useState } from 'react'

import './index.sass'
import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'
import { Navigation } from './Navigation/Navigation.js'

// gridstack 仅支持 12 列以下的，大于 12 列需要手动添加 css 代码，详见 gridstack 的 readme.md
// 目前本项目仅支持仅支持 tmpcol<=12
const tmpcol = 5, tmprow = 5
export function GridDashBoard () {
    const [widget_options, set_widget_options] = useState([ ])
    const [all_widgets, set_all_widgets] = useState([ ])
    const [active_widget_id, set_active_widget_id] = useState('')
    
    const widget_refs = useRef({ })
    const grid_refs = useRef<GridStack>()
    const lock = useRef(false)
    /** 编辑、预览状态切换 */
    const [editing, set_editing] = useState(true)
    
    const change_editing = (is_eiting: boolean) => {
        set_editing(is_eiting)
        grid_refs.current.enableMove(is_eiting)
        grid_refs.current.enableResize(is_eiting)
    }
    
    const change_active_widgets = useCallback(function (widgets_id: string) { 
        set_active_widget_id(widgets_id)
    }, [ ])
    
    // 给每个表项生成对应的 ref
    if (Object.keys(widget_refs.current).length !== widget_options.length)
        widget_options.forEach(({ id }) => {
            widget_refs.current[id] = widget_refs.current[id] || createRef()
        })
        
    useEffect(() => {
        grid_refs.current = grid_refs.current || GridStack.init({
            acceptWidgets: true,
            float: true,
            column: tmpcol,
            row: tmprow,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        
        lock.current = true
        
        grid_refs.current.batchUpdate()
        grid_refs.current.removeAll(false)
        widget_options.forEach(({ id }) => grid_refs.current.makeWidget(widget_refs.current[id].current))
        grid_refs.current.batchUpdate(false)
        
        lock.current = false
        
    }, [ widget_options ])
    
    useEffect(() => {
        grid_refs.current.cellHeight(Math.floor(grid_refs.current.el.clientHeight / tmprow))
        
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        grid_refs.current.on('added', function (event: Event, news: GridStackNode[]) {
            // 加锁，防止因更新 state 导致的无限循环
            if (lock.current) {
                set_all_widgets(() => [...news] )
                return
            }
            // 当用户从外部移入新 dom 时，执行下列代码
            // 去除移入的新 widget
            grid_refs.current.removeWidget(news[0].el)
            set_widget_options( item => [...item, { id: `${new Date()}`, type: news[0].el.dataset.type, x: news[0].x, y: news[0].y, h: news[0].h, w: news[0].w }])
        })
        
        window.addEventListener('resize', function () {
            grid_refs.current.cellHeight(Math.floor(grid_refs.current.el.clientHeight / tmprow))
        })
    }, [ ])
    
    return <div className='dashboard'>
        <div className='dashboard-header'>
            <Navigation editing={editing} change_editing={change_editing}/>
        </div>
        <div className='dashboard-main'>
            <SelectSider hidden={editing}/>
            <div className='dashboard-canvas' onClick={() => { change_active_widgets('') }}>
                <div className='grid-stack' style={{ backgroundSize: `${100 / tmpcol}% ${100 / tmprow}%` }} >
                    {widget_options.map((item, i) => {
                        return <div 
                                    ref={widget_refs.current[item.id]} 
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
                            <GraphItem item={item} el={all_widgets[i]} grid={grid_refs.current} actived={active_widget_id === item.id}/>
                        </div>
                    })}
                </div>
            </div>
            <SettingsPanel hidden={editing}/>
        </div>
    </div>
}
