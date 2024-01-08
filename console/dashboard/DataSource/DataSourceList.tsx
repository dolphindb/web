import { type MutableRefObject, type ReactNode, createElement, useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Form, Input, Modal, Radio, Tree } from 'antd'
import { CopyOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { WidgetChartType, dashboard } from '../model.js'
import { create_data_source, data_sources, delete_data_source, rename_data_source, type DataSource, type DataSourcePropertyType, copy_data_source, paste_data_source } from './date-source.js'
import { t } from '../../../i18n/index.js'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { DataSourceType } from '../type.js'


interface PropsType {
    loading: Boolean
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
    on_select: (keys: string[]) => void
}

interface MenuItemType {
    key: string
    icon: ReactNode
    title: ReactNode
}

interface ICreateDataSourceModalProps { 
    on_after_create: (new_data_source: DataSource) => void
}

export const CreateDataSourceModal = NiceModal.create((props: ICreateDataSourceModalProps) => {
    const { on_after_create } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_create = useCallback(async () => {
        try {
            const { name, type } = await form.validateFields()
            const new_data_source = create_data_source(name, type)
            on_after_create(new_data_source)
            modal.hide()
        } catch (error) {
            dashboard.message.error(error.message)
        }
     }, [on_after_create])
    
    return <Modal
        destroyOnClose
        open={modal.visible}
        maskClosable={false}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={on_create}
        title={t('创建数据源')}
    >
        <Form form={form}  labelCol={{ span: 6 }} labelAlign='left'>
            <Form.Item label={t('名称')} name='name' rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder={t('请输入数据源的名称')} />
            </Form.Item>
            <Form.Item label={t('数据类型')} name='type' initialValue={DataSourceType.TABLE} required>
                <Radio.Group>
                    <Radio value={DataSourceType.TABLE}>{t('表格')}</Radio>
                    <Radio value={DataSourceType.MATRIX}>{t('矩阵')}</Radio>
                </Radio.Group>
            </Form.Item>
        </Form>
    </Modal>
})

export function DataSourceList ({
    loading,
    current_data_source,
    no_save_flag,
    save_confirm,
    handle_save,
    change_current_data_source,
    change_current_data_source_property,
    on_select
}: PropsType) {
    
    const [current_select, set_current_select] = useState(current_data_source?.id || '')
    const [new_name, set_new_name] = useState('')
    const [menu_items, set_menu_items] = useState(
        data_sources.map((data_source: DataSource): MenuItemType => {
            return {
                key: String(data_source.id),
                icon: createElement(DatabaseOutlined),
                title: data_source.name
            }
        })
    )
    
    const { widget } = dashboard.use(['widget'])
    
    
    const checkable = useMemo(() => widget ? widget.type === WidgetChartType.COMPOSITE_GRAPH : false, [ widget ])
    
    const tree_ref = useRef(null)
    
    // const { visible: add_visible, open: add_open, close: add_close } = use_modal()
    
    // 监听 ctrl v事件，复制组件
    useEffect(() => { 
        async function paste_handler (event) {
            try {
                if (await paste_data_source(event)) {
                    set_menu_items(
                        data_sources.map((data_source: DataSource): MenuItemType => {
                            return {
                                key: String(data_source.id),
                                icon: createElement(DatabaseOutlined),
                                title: data_source.name
                            }
                        })
                    )
                    const id = data_sources[0].id
                    change_current_data_source(id)
                    set_current_select(id)
                }
            } catch (error) {
                dashboard.message.error(error.message)
            }
        }
        
        window.addEventListener('paste', paste_handler)
        return () => { window.removeEventListener('paste', paste_handler) }
    }, [ ])
    
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
    
    const on_after_create = useCallback((new_data_source: DataSource) => { 
        set_menu_items([
            {
                key: new_data_source.id,
                icon: createElement(DatabaseOutlined),
                title: new_data_source.name
            },
            ...menu_items
        ])
        set_current_select(new_data_source.id)
        change_current_data_source(new_data_source.id)
    }, [ menu_items ])
    
    return <>
            <div className='config-data-source-list'>
                <div className='data-source-list-top'>
                    <div
                        className='data-source-list-top-item'
                        onClick={async () => {
                            if (loading)
                                return
                            if (no_save_flag.current && (await save_confirm()))  
                                await handle_save()
                            no_save_flag.current = false
                            NiceModal.show(CreateDataSourceModal, { on_after_create })
                        }}
                    >
                        <FileOutlined className='data-source-list-top-item-icon' />
                        {t('新建')}
                    </div>
                    <div
                        className='data-source-list-top-item'
                        onClick={() => {
                            if (loading)
                                return
                            if (current_data_source)
                                rename_data_source_handler(menu_items, current_select, current_data_source.name)
                        }}
                    >
                        <EditOutlined className='data-source-list-top-item-icon' />
                        {t('重命名')}
                    </div>
                    <div
                        className='data-source-list-top-item'
                        onClick={() => {
                            if (loading)
                                return
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
                        {t('删除')}
                    </div>
                    <div
                        className='data-source-list-top-item'
                        onClick={async () => {
                            if (!current_data_source)
                                return
                            if (no_save_flag.current && (await save_confirm()))
                                await handle_save()
                            no_save_flag.current = false
                            copy_data_source(current_data_source.id)
                        }}
                    >
                        <CopyOutlined className='variable-list-top-item-icon' />
                        {t('复制')}
                    </div>
                </div>
                { current_data_source && <div className='data-source-list-bottom'>
                    {data_sources.length && 
                        <Tree
                            checkable={checkable}
                            defaultCheckedKeys={widget?.source_id ?? [ ]}
                            ref={tree_ref}
                            showIcon
                            height={450}
                            blockNode
                            selectedKeys={[current_select]}
                            className='data-source-list-bottom-menu'
                            onCheck={keys => {
                                console.log(data_sources, 'data_sources')
                                console.log(keys, 'keys')
                                if (Array.isArray(keys))
                                    on_select(keys.map(key => String(key))) 
                                else
                                    on_select([ ])
                            }}
                            onSelect={async key => {
                                if (loading)
                                    return
                                if (key.length) {
                                    if (no_save_flag.current && (await save_confirm()))
                                        await handle_save()
                                    no_save_flag.current = false
                                    change_current_data_source(String(key[0]))
                                    set_current_select(String(key[0]))
                                    !checkable && on_select([String(key[0])])
                                }
                            }}
                            treeData={menu_items}
                        />
                    }
                </div> }
            </div>
        </>
}
