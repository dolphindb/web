import { useState } from 'react'
import './index.sass'
import { SelectSider } from './SelectSider/SelectSider.js'


export function GridDashBoard () {
    const [graph_items, set_graph_items] = useState([{ id: 0, name: '折线图' }, { id: 1, name: '柱状图' }, { id: 2, name: '饼图' }, { id: 3, name: '散点图' }, { id: 4, name: '表格' }])
    return <div className='dashboard-main'>
        <SelectSider graph_items={graph_items}/>
    </div>
}
