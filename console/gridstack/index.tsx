import { GridStack, GridStackNode } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import {  createRef, useEffect, useRef, useState } from 'react'

import './index.sass'
import { SelectSider } from './SelectSider/SelectSider.js'
import { GraphItem } from './GraphItem/GraphItem.js'



export function GridDashBoard () {
    const [items, setItems] = useState([ ])
    const refs = useRef({ })
    const gridRefs = useRef<GridStack>()
    const lock = useRef(false)
    if (Object.keys(refs.current).length !== items.length)
        items.forEach(({ id }) => {
            refs.current[id] = refs.current[id] || createRef()
        })
    useEffect(() => {
        gridRefs.current = gridRefs.current || GridStack.init({
            float: true,
            cellHeight: '75px',
            minRow: 1,
            row: 12,
            margin: 0,
            class: 'test',
            draggable: { scroll: false },
            resizable: { handles: 'n,e,se,s,w' },
            acceptWidgets: true,
        }, 'controlled')
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
        let res = gridRefs.current.on('added', function (event: Event, news: GridStackNode[]) {
            // 加锁，防止因更新 state 导致的无限循环
            if (lock.current)
                return
            // 去除移入的新 widget
            gridRefs.current.removeWidget(news[0].el)
            setItems( item => {  return [...item, { id: `${new Date()}`, type: news[0].el.dataset.type, x: news[0].x, y: news[0].y, h: news[0].h, w: news[0].w }] })
        })
    }, [ ])
    
    
    return <div className='dashboard-main'>
        <SelectSider/>
        <div className='dashboard-canvas'>
            <div className='grid-stack controlled'>
                {items.map((item, i) => {
                    return <div ref={refs.current[item.id]} key={item.id} className='grid-stack-item' gs-id={item.id} gs-w={item.w} gs-h={item.h} gs-x={item.x} gs-y={item.y}>
                        <GraphItem item={item}/>
                    </div>
                })}
            </div>
        </div>
    </div>
}
