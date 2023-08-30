import { GridStack, GridStackNode } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import 'gridstack/dist/gridstack-extra.min.css'
import {  createRef, useEffect, useRef, useState } from 'react'

import './index.sass'
import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'
import { SettingsPanel } from './SettingsPanel/SettingsPanel.js'

// gridstack仅支持12列以下的，大于12列需要手动添加css代码，详见gridstack的readme.md
// 目前本项目仅支持仅支持tmpcol<=12
const tmpcol = 10, tmprow = 10
export function GridDashBoard () {
    const [items, setItems] = useState([ ])
    const refs = useRef({ })
    const dashboardCanvasRef = useRef(null)
    /** 画布上所有的 widgets */
    const [all_widgets, set_all_widgets] = useState([ ])
    
    const gridRefs = useRef<GridStack>()
    const lock = useRef(false)
    if (Object.keys(refs.current).length !== items.length)
        items.forEach(({ id }) => {
            refs.current[id] = refs.current[id] || createRef()
        })
    useEffect(() => {
        gridRefs.current = gridRefs.current || GridStack.init({
            acceptWidgets: true,
            float: true,
            cellHeight: `${Math.floor(dashboardCanvasRef.current.clientHeight / tmprow)}`,
            column: tmpcol,
            row: tmprow,
            margin: 0,
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
        })
        lock.current = true
        const grid = gridRefs.current
        grid.batchUpdate()
        grid.removeAll(false)
        
        items.forEach(({ id }) => grid.makeWidget(refs.current[id].current))
        
        grid.batchUpdate(false)
        lock.current = false
        
    }, [ items ])
    
    useEffect(() => {
        GridStack.setupDragIn('.dashboard-graph-item', { helper: 'clone' })
        gridRefs.current.on('added', function (event: Event, news: GridStackNode[]) {
            // 加锁，防止因更新 state 导致的无限循环
            if (lock.current) {
                set_all_widgets(() => { return [...news] })
                return
            }
            // 去除移入的新 widget
            gridRefs.current.removeWidget(news[0].el)
            setItems( item => {  return [...item, { id: `${new Date()}`, type: news[0].el.dataset.type, x: news[0].x, y: news[0].y, h: news[0].h, w: news[0].w }] })
        })
        window.addEventListener('resize', function () {
            gridRefs.current.cellHeight(Math.floor(dashboardCanvasRef.current.clientHeight / tmprow))
        })
    }, [ ])
    
    
    return <div className='dashboard-main'>
        <SelectSider/>
        <div className='dashboard-canvas' ref={dashboardCanvasRef}>
            <div className='grid-stack' style={{ backgroundSize: `${100 / tmpcol}% ${100 / tmprow}%` }}>
                {items.map((item, i) => {
                    return <div ref={refs.current[item.id]} key={item.id} className='grid-stack-item' gs-id={item.id} gs-w={item.w} gs-h={item.h} gs-x={item.x} gs-y={item.y}>
                        <GraphItem item={item} el={all_widgets[i]} grid={gridRefs.current}/>
                    </div>
                })}
            </div>
        </div>
        <SettingsPanel />
    </div>
}
