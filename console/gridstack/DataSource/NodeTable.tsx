import { createElement } from 'react'

import { Menu } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

const node_items: MenuProps['items'] = [
    {
        key: '1',
        icon: createElement(DatabaseOutlined),
        label: '节点1'
    },
    {
        key: '2',
        icon: createElement(DatabaseOutlined),
        label: '节点2'
    }
]

export function NodeTable () {
    return <>
        <div className='data-source-config-nodetable'>
            <div className='data-source-config-nodetable-top'>
                <div className='data-source-config-nodetable-top-item'>
                    <FileOutlined className='data-source-config-nodetable-top-item-icon'/>
                    新建
                </div>
                <div className='data-source-config-nodetable-top-item'>
                    <EditOutlined className='data-source-config-nodetable-top-item-icon'/>
                    重命名
                </div>
                <div className='data-source-config-nodetable-top-item'>
                    <DeleteOutlined className='data-source-config-nodetable-top-item-icon'/>
                    删除
                </div>
            </div>
            <div className='data-source-config-nodetable-bottom'>
                <Menu
                    mode='inline'
                    defaultSelectedKeys={['1']}
                    className='data-source-config-nodetable-bottom-menu'
                    items={node_items}
                />
            </div>
        </div>
    </>
}
