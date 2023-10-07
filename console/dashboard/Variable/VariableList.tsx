import { type MutableRefObject, type ReactNode, createElement, useEffect, useRef, useState } from 'react'
import { Input, Tree } from 'antd'
import { DeleteOutlined, EditOutlined, FileOutlined, ToolOutlined } from '@ant-design/icons'

import { dashboard } from '../model.js'
import { create_variable, delete_variable, rename_variable, type Variable, type VariablePropertyType, variables } from './variable.js'


type PropsType = {
    current_variable: Variable
    no_save_flag: MutableRefObject<boolean>
    save_confirm: () => {
        destroy: () => void
        update: (configUpdate: any) => void
    } & {
        then<T>(resolve: (confirmed: boolean) => T, reject: VoidFunction): Promise<T>
    }
    handle_save: () => Promise<void>
    change_current_variable: (key: string) => void
    change_current_variable_property: (key: string, value: VariablePropertyType, save_confirm?: boolean) => void
}

type MenuItemType = {
    key: string
    icon: ReactNode
    title: ReactNode
}

export function VariableList ({
    current_variable,
    no_save_flag,
    save_confirm,
    handle_save,
    change_current_variable,
    change_current_variable_property
}: PropsType) {
    const { variable_infos } = variables.use(['variable_infos'])
    const [current_select, set_current_select] = useState(current_variable?.id || '')
    const [menu_items, set_menu_items] = useState(
        variable_infos.map((variable_info: { id: string, name: string }): MenuItemType => (
            {
                key: variable_info.id,
                icon: createElement(ToolOutlined),
                title: variable_info.name
            }
        ))
    )
    
    const tree_ref = useRef(null)
    
    useEffect(() => {
        set_current_select(current_variable?.id)
        tree_ref.current?.scrollTo({ key: current_variable.id })
    }, [ current_variable ])
    
    function rename_variable_handler (menu_items: MenuItemType[], select_key: string, old_name: string) {
        if (!menu_items.length)
            return
        const tmp_menu_item = menu_items.find(menu_item => menu_item.key === select_key)
        function handler (event) {
            let new_name = event.target.value
            try {
                rename_variable(select_key, new_name)
                change_current_variable_property('name', new_name, old_name !== new_name)
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
            <div className='config-variable-list'>
                <div className='variable-list-top'>
                    <div
                        className='variable-list-top-item'
                        onClick={async () => {
                            if (no_save_flag.current && (await save_confirm()))
                                await handle_save()
                            no_save_flag.current = false
                            const { id, name } = create_variable()
                            const new_menu_items = [
                                {
                                    key: id,
                                    icon: createElement(ToolOutlined),
                                    title: name
                                },
                                ...menu_items
                            ]
                            set_menu_items(new_menu_items)
                            set_current_select(id)
                            change_current_variable(id)
                            rename_variable_handler(new_menu_items, id, name)
                        }}
                    >
                        <FileOutlined className='variable-list-top-item-icon' />
                        新建
                    </div>
                    <div
                        className='variable-list-top-item'
                        onClick={() => {
                            if (current_variable)
                                rename_variable_handler(menu_items, current_select, current_variable.name)
                        }}
                    >
                        <EditOutlined className='variable-list-top-item-icon' />
                        重命名
                    </div>
                    <div
                        className='variable-list-top-item'
                        onClick={() => {
                            const delete_index = delete_variable(current_variable.id)
                            if (delete_index >= 0) {
                                menu_items.splice(delete_index, 1)
                                set_menu_items([...menu_items])
                                if (!variable_infos.length)
                                    change_current_variable('')
                                else {
                                    const index = delete_index === 0 ? 0 : delete_index - 1
                                    change_current_variable(variable_infos[index].id)
                                    set_current_select(variable_infos[index].id)
                                }
                            }
                        }}
                    >
                        <DeleteOutlined className='variable-list-top-item-icon' />
                        删除
                    </div>
                </div>
                { current_variable ? <div className='variable-list-bottom'>
                    {variable_infos.length ? (
                        <Tree
                            ref={tree_ref}
                            showIcon
                            height={450}
                            blockNode
                            selectedKeys={[current_select]}
                            className='variable-list-bottom-menu'
                            onSelect={async key => {
                                if (key.length) {
                                    if (no_save_flag.current && (await save_confirm()))
                                        await handle_save()
                                    no_save_flag.current = false
                                    change_current_variable(String(key[0]))
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
