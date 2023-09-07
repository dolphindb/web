import { createElement } from 'react'

import { Menu } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { type dataSourceNodeType } from '../storage/date-source-node.js'

type PropsType = { 
    data_source_nodes: dataSourceNodeType[]
    change_current_data_source_node: (key: string) => void
}

export function NodeTable ({ data_source_nodes, change_current_data_source_node }: PropsType ) {    
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
                    defaultSelectedKeys={[String(data_source_nodes[0].id)]}
                    className='data-source-config-nodetable-bottom-menu'
                    onClick={({ key }) => { change_current_data_source_node(key) }}
                    items={data_source_nodes.map(
                        (data_source_node: dataSourceNodeType) => { 
                            return {
                                key: data_source_node.id,
                                icon: createElement(DatabaseOutlined),
                                label: data_source_node.name
                            } 
                        })
                    }
                />
            </div>
        </div>
    </>
}
