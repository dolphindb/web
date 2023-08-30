import { CloseOutlined } from '@ant-design/icons'

export function GraphItem  ({ item, el, grid, actived, click_handler }) {
    // grid-stack-item-content 类名不能删除，gridstack 库是通过
    return <div 
                className={`grid-stack-item-content ${actived ? 'grid-stack-item-active' : ''}`} 
                onClick={e => {
                    e.stopPropagation()
                    click_handler(item.id)
                }}
            >
        <div className='delete-graph' onClick={() => { grid.removeWidget(el.el) }}><CloseOutlined /></div>
        <div className='graph-content'>
            <div className='graph-hint'>点击填充数据源</div>
        </div>
        <div className='drag-icon' />
     </div>
}
