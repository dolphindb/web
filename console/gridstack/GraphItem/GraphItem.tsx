import { CloseOutlined } from '@ant-design/icons'

import { GraphTypeName } from '../graph-types.js'
import { DataSource } from '../DataSource/DataSource.js'

type PropsType = {
    
}

export function GraphItem  ({ item, el, grid, actived }) {
    // grid-stack-item-content 类名不能删除，gridstack 库是通过该类名去获取改 DOM 实现拖动
    return <div 
                className={`grid-stack-item-content ${actived ? 'grid-stack-item-active' : ''}`} 
            >
        <div className='delete-graph' onClick={() => { grid.removeWidget(el.el) }}>
            <CloseOutlined className='delete-graph-icon'/>
        </div>
        <div className='graph-content'>
            <div className='title'>{GraphTypeName[item.type]}</div>
            <DataSource trigger_index='graph'/>
        </div>
        <div className='drag-icon' />
     </div>
}
