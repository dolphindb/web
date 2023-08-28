import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import { createElement, createRef, useEffect, useRef, useState } from 'react'

import './index.sass'
import { SelectSider } from './SelectSider/SelectSider.js'

const Item = ({ id }) => <div>{id}</div>

export function GridDashBoard () {
    const [graph_items, set_graph_items] = useState([{ id: 0, name: '折线图' }, { id: 1, name: '柱状图' }, { id: 2, name: '饼图' }, { id: 3, name: '散点图' }, { id: 4, name: '表格' }])
    
    const [items, setItems] = useState([ { id: 'items-1' } ])
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
            
            if (lock.current)
                return
            gridRefs.current.removeWidget(news[0].el)
            setItems( item => {  return [...item, { id: `items-${item.length + 1}` }] })
        })
    }, [ ])
    
    
    return <div className='dashboard-main'>
        <SelectSider graph_items={graph_items}/>
        <div className='dashboard-canvas'>
            <div className='grid-stack controlled'>
                {items.map((item, i) => {
                    return <div ref={refs.current[item.id]} key={item.id} className='grid-stack-item'>
                        <div className='grid-stack-item-content'> {item.id} </div>
                    </div>
                })}
            </div>
        </div>
    </div>
}
