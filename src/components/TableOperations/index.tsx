import { EllipsisOutlined } from '@ant-design/icons'
import './index.scss'
import { Popover, Space } from 'antd'
import { toArray } from 'lodash'

interface IProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 最多展示的表单操作项，不传则展示全部 */
    max_show_count?: number
}

export function TableOperations (props: IProps) {
    
    const { max_show_count, children, ...others } = props
    const child_nodes = toArray(children).filter(Boolean)
    
    const ellipsis = max_show_count ?  child_nodes.length > max_show_count : false
    
    const visible_items = ellipsis ? child_nodes.slice(0, max_show_count) : children
    
    return <div className='table-operations' {...others}>
        {visible_items}
        {ellipsis && <Popover 
            trigger='hover'
            key='operation-popover'
            overlayInnerStyle={{ maxHeight: 400, overflow: 'auto' }}
            arrow={false}
            placement='bottom' 
            content={<Space direction='vertical'>
                {child_nodes.slice(max_show_count)}            
            </Space>
        }>
            <EllipsisOutlined className='more-operations'/>
        </Popover>}
    </div>
}
