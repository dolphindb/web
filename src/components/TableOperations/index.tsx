import { EllipsisOutlined } from '@ant-design/icons'
import './index.scss'
import { Button, Popover, Space } from 'antd'
import { toArray } from 'lodash'

const VISIBLE_ITEM_NUM = 4

export function TableOperations (props: React.HTMLAttributes<HTMLDivElement>) {
    
    const { children, ...others } = props
    const child_nodes = toArray(children).filter(Boolean)
    
    const ellipsis = child_nodes.length > VISIBLE_ITEM_NUM
    
    const visible_items = ellipsis ? child_nodes.slice(0, VISIBLE_ITEM_NUM - 1) : children
    
    return <div className='table-operations' {...others}>
        {visible_items}
        {ellipsis && <Popover 
            trigger='hover'
            key='operation-popover'
            overlayInnerStyle={{ maxHeight: 400, overflow: 'auto' }}
            arrow={false}
            placement='bottom' 
            content={<Space direction='vertical'>
                {child_nodes.slice(VISIBLE_ITEM_NUM - 1)}            
            </Space>
        }>
            <EllipsisOutlined className='more-operations'/>
        </Popover>}
    </div>
}
