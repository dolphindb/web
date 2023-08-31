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
const tmpcol = 10, tmprow = 10
export function GridDashBoard () {
    const [items, setItems] = useState([ ])
    const [all_widgets, set_all_widgets] = useState([ ])
    const [active_widgets_id, set_active_widgets_id] = useState('')
    
    const refs = useRef({ })
    const gridRefs = useRef<GridStack>()
    const lock = useRef(false)
    
    const change_active_widgets = useCallback(function (widgets_id: string) { 
        set_active_widgets_id(widgets_id)
    }, [ ])
    
    if (Object.keys(refs.current).length !== items.length)
        items.forEach(({ id }) => {
            refs.current[id] = refs.current[id] || createRef()
        })
        
    useEffect(() => {
        gridRefs.current = gridRefs.current || GridStack.init({
            acceptWidgets: true,
            float: true,
            column: tmpcol,
            row: tmprow,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        
        lock.current = true
        
        gridRefs.current.batchUpdate()
        gridRefs.current.removeAll(false)
        items.forEach(({ id }) => gridRefs.current.makeWidget(refs.current[id].current))
        gridRefs.current.batchUpdate(false)
        
        lock.current = false
        
    }, [ items ])
    
    useEffect(() => {
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        
        gridRefs.current.on('added', function (event: Event, news: GridStackNode[]) {
            // 加锁，防止因更新 state 导致的无限循环
            if (lock.current) {
                set_all_widgets(() => [...news] )
                return
            }
            // 去除移入的新 widget
            gridRefs.current.removeWidget(news[0].el)
            setItems( item => [...item, { id: `${new Date()}`, type: news[0].el.dataset.type, x: news[0].x, y: news[0].y, h: news[0].h, w: news[0].w }])
        })
        
        window.addEventListener('resize', function () {
            gridRefs.current.cellHeight(Math.floor(gridRefs.current.el.clientHeight / tmprow))
        })
    }, [ ])
    
    return <div className='dashboard'>
        <div className='dashboard-header'>
            <Navigation />
        </div>
        <div className='dashboard-main'>
            <SelectSider/>
            <div className='dashboard-canvas' onClick={() => { change_active_widgets('') }}>
                <div className='grid-stack' style={{ backgroundSize: `${100 / tmpcol}% ${100 / tmprow}%` }} >
                    {items.map((item, i) => {
                        return <div 
                                    ref={refs.current[item.id]} 
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
                            <GraphItem item={item} el={all_widgets[i]} grid={gridRefs.current} actived={active_widgets_id === item.id}/>
                        </div>
                    })}
                </div>
            </div>
            <SettingsPanel />
        </div>
    </div>
}
