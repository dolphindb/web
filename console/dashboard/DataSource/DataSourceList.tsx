import { type MutableRefObject, type ReactNode, createElement, useEffect, useRef, useState } from 'react'
import { Input, Tree } from 'antd'
import { DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { dashboard } from '../model.js'
import { create_data_source, data_sources, delete_data_source, rename_data_source, type DataSource, type DataSourcePropertyType } from './date-source.js'


type PropsType = {
    current_data_source: DataSource
    no_save_flag: MutableRefObject<boolean>
    save_confirm: () => {
        destroy: () => void
        update: (configUpdate: any) => void
    } & {
        then<T>(resolve: (confirmed: boolean) => T, reject: VoidFunction): Promise<T>
    }
    handle_save: () => Promise<void>
    change_current_data_source: (key: string) => void
    change_current_data_source_property: (key: string, value: DataSourcePropertyType, save_confirm?: boolean) => void
}

type MenuItemType = {
    key: string
    icon: ReactNode
    title: ReactNode
}

export function DataSourceList ({
    current_data_source,
    no_save_flag,
    save_confirm,
    handle_save,
    change_current_data_source,
    change_current_data_source_property
}: PropsType) {
    const [current_select, set_current_select] = useState(current_data_source?.id || '')
    const [menu_items, set_menu_items] = useState(
        data_sources.map((data_source: DataSource): MenuItemType => {
            return {
                key: String(data_source.id),
                icon: createElement(DatabaseOutlined),
                title: data_source.name
            }
        })
    )
    
    const tree_ref = useRef(null)
    
    useEffect(() => {
        set_current_select(current_data_source?.id)
        tree_ref.current?.scrollTo({ key: current_data_source.id })
    }, [ current_data_source ])
    
    function rename_data_source_handler (menu_items: MenuItemType[], select_key: string, old_name: string) {
        if (!menu_items.length)
            return
        const tmp_menu_item = menu_items.find(menu_item => menu_item.key === select_key)
        function handler (event) {
            let new_name = event.target.value
            try {
                rename_data_source(select_key, new_name)
                change_current_data_source_property('name', new_name, false)
            } catch (error) {
                dashboard.message.error(error.message)
                new_name = old_name
            } finally {
                tmp_menu_item.title = new_name
                set_menu_items([...menu_items])
            }
        }
        tmp_menu_item.title = (
            <Input size='small' autoFocus className='bottom-menu-rename-input' defaultValue={old_name} onBlur={handler} onPressEnter={handler} />
        )
        set_menu_items([...menu_items])
    }
    
    return <>
            <div className='config-data-source-list'>
                <div className='data-source-list-top'>
                    <div
                        className='data-source-list-top-item'
                        onClick={async () => {
                            if (no_save_flag.current && (await save_confirm()))
                                await handle_save()
                            no_save_flag.current = false
                            const { id, name } = create_data_source()
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
                            change_current_data_source(id)
                            rename_data_source_handler(new_menu_items, id, name)
                        }}
                    >
                        <FileOutlined className='data-source-list-top-item-icon' />
                        新建
                    </div>
                    <div
                        className='data-source-list-top-item'
                        onClick={() => {
                            if (current_data_source)
                                rename_data_source_handler(menu_items, current_select, current_data_source.name)
                        }}
                    >
                        <EditOutlined className='data-source-list-top-item-icon' />
                        重命名
                    </div>
                    <div
                        className='data-source-list-top-item'
                        onClick={() => {
                            const delete_index = delete_data_source(current_data_source.id)
                            if (delete_index >= 0) {
                                menu_items.splice(delete_index, 1)
                                set_menu_items([...menu_items])
                                if (!data_sources.length)
                                    change_current_data_source('')
                                else {
                                    const index = delete_index === 0 ? 0 : delete_index - 1
                                    change_current_data_source(data_sources[index].id)
                                    set_current_select(data_sources[index].id)
                                }
                            }
                        }}
                    >
                        <DeleteOutlined className='data-source-list-top-item-icon' />
                        删除
                    </div>
                </div>
                { current_data_source ? <div className='data-source-list-bottom'>
                    {data_sources.length ? (
                        <Tree
                            ref={tree_ref}
                            showIcon
                            height={450}
                            blockNode
                            selectedKeys={[current_select]}
                            className='data-source-list-bottom-menu'
                            onSelect={async key => {
                                if (key.length) {
                                    if (no_save_flag.current && (await save_confirm()))
                                        await handle_save()
                                    no_save_flag.current = false
                                    change_current_data_source(String(key[0]))
                                    set_current_select(String(key[0]))
                                }
                            }}
                            treeData={menu_items}
                        />
                    ) : (
                        <></>
                    )}
                </div> : <></> }
            </div>
        </>
}
