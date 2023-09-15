import { MutableRefObject, ReactNode, createElement, useEffect, useRef, useState } from 'react'

import { Input, Tree, App } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { create_data_source_node,
         delete_data_source_node, 
         rename_data_source_node, 
         type dataSourceNodeType, 
         dataSourceNodePropertyType, 
    } from '../storage/date-source-node.js'
    
import { data_source_nodes } from '../storage/date-source-node.js'

type PropsType = { 
    current_data_source_node: dataSourceNodeType
    no_save_flag: MutableRefObject<boolean>
    save_confirm: () => {
            destroy: () => void
            update: (configUpdate: any) => void
        } & {
            then<T>(resolve: (confirmed: boolean) => T, reject: VoidFunction): Promise<T>
    }
    handle_save: () => Promise<void>
    change_current_data_source_node: (key: string) => void
    change_current_data_source_node_property: (key: string, value: dataSourceNodePropertyType, save_confirm?: boolean) => void
}

type MenuItemType = {
    key: string
    icon: ReactNode
    title: ReactNode
}

export function NodeTable ({ 
    current_data_source_node,
    no_save_flag,
    save_confirm,
    handle_save,
    change_current_data_source_node,
    change_current_data_source_node_property
}: PropsType ) {
    const { message } = App.useApp()
    
    const [current_select, set_current_select] = useState(current_data_source_node?.id || '')
    const [menu_items, set_menu_items] = useState(data_source_nodes.map(
        (data_source_node: dataSourceNodeType): MenuItemType => {
            return {
                key: String(data_source_node.id),
                icon: createElement(DatabaseOutlined),
                title: data_source_node.name,
            }   
        }
    ))
    
    const tree_ref = useRef(null)
    
    useEffect(() => {
        tree_ref.current.scrollTo({ key: current_data_source_node.id }) 
    }, [ ])
    
    const rename_data_source_node_handler = (menu_items: MenuItemType[], select_key: string, old_name: string) => {
        if (!menu_items.length)
            return 
        const tmp_menu_item = menu_items.find(menu_item => menu_item.key === select_key)
        tmp_menu_item.title = <Input
            size='small' 
            autoFocus
            className='data-source-config-nodetable-bottom-menu-rename-input'
            defaultValue={old_name}
            onBlur={e => {
                let new_name = e.target.value
                try {
                    rename_data_source_node(select_key, new_name)
                } catch (error) {
                    message.error(error.message)
                    new_name = old_name
                } finally {
                    tmp_menu_item.title = new_name
                    set_menu_items([...menu_items])
                    change_current_data_source_node_property('name', new_name, false)
                }
                
            }}
        />
        set_menu_items([...menu_items])
    }
    
    return <>
        <div className='data-source-config-nodetable'>
            <div className='data-source-config-nodetable-top'>
                <div 
                    className='data-source-config-nodetable-top-item' 
                    onClick={
                        async () => {
                            if (no_save_flag.current && await save_confirm()) 
                                await handle_save()
                            no_save_flag.current = false
                            const { id, name } = create_data_source_node()
                            const new_menu_items = [
                                {
                                    key: id,
                                    icon: createElement(DatabaseOutlined),
                                    title: name
                                },
                                 ...menu_items
                            ]
                            set_menu_items(new_menu_items)
                            set_current_select(id)
                            change_current_data_source_node(id)
                            rename_data_source_node_handler(new_menu_items, id, name)
                        }
                    }
                >
                    <FileOutlined className='data-source-config-nodetable-top-item-icon'/>
                    新建
                </div>
                <div 
                    className='data-source-config-nodetable-top-item' 
                    onClick={
                        () => { rename_data_source_node_handler(menu_items, current_select, current_data_source_node.name) }
                    }
                >
                    <EditOutlined className='data-source-config-nodetable-top-item-icon'/>
                    重命名
                </div>
                <div 
                    className='data-source-config-nodetable-top-item' 
                    onClick={
                        () => {
                            const delete_index = delete_data_source_node(current_data_source_node.id)
                            menu_items.splice(delete_index, 1)
                            set_menu_items([...menu_items])
                            if (!data_source_nodes.length) 
                                change_current_data_source_node('')
                            else {
                                const index = delete_index === 0 ? 0 : delete_index - 1
                                change_current_data_source_node(data_source_nodes[index].id)
                                set_current_select(data_source_nodes[index].id)
                            }
                        }
                    }
                >
                    <DeleteOutlined className='data-source-config-nodetable-top-item-icon'/>
                    删除
                </div>
            </div>
            <div className='data-source-config-nodetable-bottom'>
                {data_source_nodes.length
                    ? <Tree
                        ref={tree_ref}
                        showIcon
                        height={450}
                        blockNode
                        selectedKeys={[current_select]}
                        className='data-source-config-nodetable-bottom-menu'
                        onSelect={async key => { 
                            if (key.length) {
                                if (no_save_flag.current && await save_confirm()) 
                                    await handle_save()
                                no_save_flag.current = false
                                change_current_data_source_node(String(key[0]))
                                set_current_select(String(key[0]))
                            }
                        }}
                        treeData={menu_items}
                    />
                    : <></>
                }
            </div>
        </div>
    </>
}
