import { createElement, useState } from 'react'

import { Tree } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { create_data_source_node, delete_data_source_node, type dataSourceNodeType, find_data_source_node_index } from '../storage/date-source-node.js'

type PropsType = { 
    data_source_nodes: dataSourceNodeType[]
    change_current_data_source_node: (key: string | number) => void
    current_data_source_node: dataSourceNodeType
}

export function NodeTable ({ data_source_nodes, change_current_data_source_node, current_data_source_node }: PropsType ) {
    const [current_select, set_current_select] = useState(String(current_data_source_node?.id) || '')
    const [menu_items, set_menu_items] = useState(data_source_nodes.map(
        (data_source_node: dataSourceNodeType) => {
            return {
                key: String(data_source_node.id),
                icon: createElement(DatabaseOutlined),
                title: data_source_node.name
            } 
        
    }))
    
    const create_data_source_node_handler = () => {
        create_data_source_node()
        set_menu_items([
            {
                key: String(data_source_nodes[0].id),
                icon: createElement(DatabaseOutlined),
                title: data_source_nodes[0].name
            },
            ...menu_items
        ])
        change_current_data_source_node(String(data_source_nodes[0].id))
        set_current_select(String(data_source_nodes[0].id))
    }
    
    const delete_data_source_node_handler = () => {
        const delete_index = delete_data_source_node(current_data_source_node.id)
        menu_items.splice(delete_index, 1)
        set_menu_items([...menu_items])
        if (!data_source_nodes.length) 
            change_current_data_source_node(-1)
         else if (delete_index === 0) {
            change_current_data_source_node(data_source_nodes[0].id)
            set_current_select(String(data_source_nodes[0].id))
        } else {
            change_current_data_source_node(data_source_nodes[delete_index - 1].id)
            set_current_select(String(data_source_nodes[delete_index - 1].id))
        }
    }
    
    return <>
        <div className='data-source-config-nodetable'>
            <div className='data-source-config-nodetable-top'>
                <div className='data-source-config-nodetable-top-item' onClick={create_data_source_node_handler}>
                    <FileOutlined className='data-source-config-nodetable-top-item-icon'/>
                    新建
                </div>
                <div className='data-source-config-nodetable-top-item'>
                    <EditOutlined className='data-source-config-nodetable-top-item-icon'/>
                    重命名
                </div>
                <div className='data-source-config-nodetable-top-item' onClick={delete_data_source_node_handler}>
                    <DeleteOutlined className='data-source-config-nodetable-top-item-icon'/>
                    删除
                </div>
            </div>
            <div className='data-source-config-nodetable-bottom'>
                {data_source_nodes.length
                    ? <Tree
                        showIcon
                        height={450}
                        blockNode
                        selectedKeys={[current_select]}
                        className='data-source-config-nodetable-bottom-menu'
                        onSelect={key => { 
                            change_current_data_source_node(String(key[0])) 
                            set_current_select(String(key[0]))
                        }}
                        treeData={menu_items}
                    />
                    : <></>
                }
            </div>
        </div>
    </>
}
