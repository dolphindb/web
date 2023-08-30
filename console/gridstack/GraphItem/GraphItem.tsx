import { CloseOutlined } from '@ant-design/icons'
import { useState } from 'react'

export function GraphItem  ({ item, el, grid }) {
    const [click_active, set_click_active] = useState(false)
    
    // grid-stack-item-content 类名不能删除，gridstack 库是通过
    return <div className={`grid-stack-item-content ${click_active ? 'grid-stack-item-active' : ''}`} onClick={() => set_click_active(true)}>
        <div className='delete-graph' onClick={() => { grid.removeWidget(el.el) }}><CloseOutlined /></div>
        <div className='graph-content'>
            <div className='graph-hint'>点击填充数据源</div>
        </div>
     </div>
}
