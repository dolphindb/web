import { type MutableRefObject, type ReactNode, createElement, useEffect, useRef, useState } from 'react'
import { Input, Modal, Tree } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, FileOutlined, ToolOutlined } from '@ant-design/icons'
import { use_modal } from 'react-object-model/hooks.js'

import { dashboard } from '../model.js'

import { t } from '../../../i18n/index.js'

import { create_variable, delete_variable, rename_variable, type Variable, type VariablePropertyType, variables, copy_variables, paste_variables } from './variable.js'


interface PropsType {
    current_variable: Variable
    no_save_flag: MutableRefObject<boolean>
    loading: boolean
    save_confirm: () => {
        destroy: () => void
        update: (configUpdate: any) => void
    } & {
        then<T>(resolve: (confirmed: boolean) => T, reject: VoidFunction): Promise<T>
    }
    handle_save: () => Promise<void>
    change_current_variable: (key: string) => void
    change_current_variable_property: (key: string[], value: VariablePropertyType[], save_confirm?: boolean) => void
}

interface MenuItemType {
    key: string
    icon: ReactNode
    title: ReactNode
}

export function VariableList ({
    current_variable,
    no_save_flag,
    loading,
    save_confirm,
    handle_save,
    change_current_variable,
    change_current_variable_property
}: PropsType) {
    const { variable_infos } = variables
    const [current_select, set_current_select] = useState(current_variable?.id || '')
    const [new_name, set_new_name] = useState('')
    const [menu_items, set_menu_items] = useState(
        variable_infos.map((variable_info: { id: string, name: string }): MenuItemType => (
            {
                key: variable_info.id,
                icon: createElement(ToolOutlined),
                title: variable_info.name
            }
        ))
    )
    
    const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    
    const tree_ref = useRef(null)
    
    // 监听 ctrl v事件，复制组件
    useEffect(() => { 
        async function paste_handler (event) {
            try {
                if (await paste_variables(event)) {
                    set_menu_items(
                        variables.variable_infos.map((variable_info: { id: string, name: string }): MenuItemType => (
                            {
                                key: variable_info.id,
                                icon: createElement(ToolOutlined),
                                title: variable_info.name
                            }
                        ))
                    )
                    const id = variables.variable_infos[0]?.id
                    if (id) {
                        change_current_variable(id)
                        set_current_select(id)
                    }
                }    
            } catch (error) {
                dashboard.message.error(error.message)
            }
        }
        
        window.addEventListener('paste', paste_handler)
        return () => { window.removeEventListener('paste', paste_handler) }
    }, [ ])
    
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
                change_current_variable_property(['name'], [new_name], old_name !== new_name)
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
            <Modal
                style={{ top: '200px' }}
                open={add_visible}
                maskClosable={false}
                onCancel={() => {
                    add_close()
                    set_new_name('')
                }}
                onOk={() => {
                    try {
                        const id = create_variable(new_name)
                        const new_menu_items = [
                            {
                                key: id,
                                icon: createElement(ToolOutlined),
                                title: new_name
                            },
                            ...menu_items
                        ]
                        set_menu_items(new_menu_items)
                        set_current_select(id)
                        set_new_name('')
                        change_current_variable(id)
                        add_close()
                    } catch (error) {
                        dashboard.message.error(error.message)
                    }
                }}
                closeIcon={false}
                title={t('新变量')}>
                <Input 
                    value={new_name}
                    placeholder={t('请输入新变量的名称')}
                    onChange={event => { set_new_name(event.target.value) }}
                />
            </Modal>
            <div className='variable-list'>
                <div className='top'>
                    <div
                        className='top-item'
                        onClick={async () => {
                            if (loading)
                                return
                            if (no_save_flag.current && (await save_confirm()))
                                await handle_save()
                            no_save_flag.current = false
                            add_open()
                        }}
                    >
                        <FileOutlined className='top-item-icon' />
                        {t('新建')}
                    </div>
                    <div
                        className='top-item'
                        onClick={() => {
                            if (loading)
                                return
                            if (current_variable)
                                rename_variable_handler(menu_items, current_select, current_variable.name)
                        }}
                    >
                        <EditOutlined className='top-item-icon' />
                        {t('重命名')}
                    </div>
                    <div
                        className='top-item'
                        onClick={() => {
                            if (loading)
                                return
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
                        <DeleteOutlined className='top-item-icon' />
                        {t('删除')}
                    </div>
                    <div
                        className='top-item'
                        onClick={async () => {
                            if (loading)
                                return
                            if (!current_variable)
                                return
                            if (no_save_flag.current && (await save_confirm()))
                                await handle_save()
                            no_save_flag.current = false
                            copy_variables([current_variable.id])
                        }}
                    >
                        <CopyOutlined className='top-item-icon' />
                        {t('复制')}
                    </div>
                </div>
                { current_variable && <div className='bottom'>
                    {variable_infos.length && 
                        <Tree
                            ref={tree_ref}
                            showIcon
                            height={450}
                            blockNode
                            selectedKeys={[current_select]}
                            className='bottom-menu'
                            onSelect={async key => {
                                if (loading)
                                    return
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
                    }
                </div>}
            </div>
        </>
}
