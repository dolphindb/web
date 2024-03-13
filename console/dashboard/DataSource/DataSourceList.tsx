import { type MutableRefObject, type ReactNode, createElement, useEffect, useRef, useState, useMemo, useCallback, type Key } from 'react'
import { ConfigProvider, Form, Input, Modal, Radio, Tag, Tree, theme } from 'antd'
import { CopyOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, FileOutlined } from '@ant-design/icons'

import { type Widget, WidgetChartType, dashboard } from '../model.js'
import { create_data_source, data_sources, delete_data_source, rename_data_source, type DataSource, type DataSourcePropertyType, copy_data_source, paste_data_source, get_data_source } from './date-source.js'
import { t } from '../../../i18n/index.js'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { DdbForm } from 'dolphindb'
import { DATA_SOURCE_TYPE_MAP } from '../constant.js'
import { check_name, get_chart_data_type } from '../utils.js'
import { throttle } from 'lodash'


interface PropsType {
    widget: Widget
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
    on_select: (keys: string[] | string) => void
}

interface MenuItemType {
    key: string
    icon: ReactNode
    title: ReactNode
    disabled: boolean
}

interface ICreateDataSourceModalProps { 
    on_after_create: (new_data_source: DataSource) => void
}


function generate_tree_item (data_source: DataSource, widget?: Widget): MenuItemType { 
    return {
        key: String(data_source.id),
        icon: createElement(DatabaseOutlined),
        disabled: widget && get_chart_data_type(widget.type) !== data_source.type,
        title: <div className='data-source-tree-item'>
            {data_source.name}
            <Tag color='blue' bordered={false}>{DATA_SOURCE_TYPE_MAP[data_source.type]}</Tag>
        </div>
    }
}

export const CreateDataSourceModal = NiceModal.create((props: ICreateDataSourceModalProps) => {
    
    const { on_after_create } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_create = useCallback(async () => {
        const { name, type } = await form.validateFields()
        const new_data_source = create_data_source(name, type)
        on_after_create(new_data_source)
        modal.hide()
     }, [on_after_create])
    
    
    return <ConfigProvider theme={{
        hashed: false,
        token: {
            borderRadius: 0,
            motion: false,
            colorBgContainer: 'rgb(40, 40, 40)',
            colorBgElevated: '#555555',
            colorInfoActive: 'rgb(64, 147, 211)'
        },
        algorithm: theme.darkAlgorithm
    }}>
        <Modal
            destroyOnClose
            open={modal.visible}
            maskClosable={false}
            onCancel={modal.hide}
            afterClose={modal.remove}
            onOk={on_create}
            title={t('创建数据源')}
        >
            <Form validateTrigger={['onCompositionEnd']} autoComplete='off' form={form}  labelCol={{ span: 6 }} labelAlign='left'>
                <Form.Item label={t('名称')} name='name'
                    rules={
                        [
                            { required: true, message: '请输入名称' },
                            {
                                validator: async (_, val) => {
                                    if (val.length > 10)
                                        return Promise.reject(new Error(t('数据源名长度不能大于10')))
                                    else if (data_sources.find(data_source => data_source.name === val))
                                        return Promise.reject(new Error(t('已有同名数据源，请修改')))
                                    return Promise.resolve()
                                },
                            }
                        ]
                    }
                >
                    <Input placeholder={t('请输入数据源的名称')} />
                </Form.Item>
                <Form.Item label={t('数据类型')} name='type' initialValue={DdbForm.table} required>
                    <Radio.Group>
                        <Radio value={DdbForm.table}>{DATA_SOURCE_TYPE_MAP[DdbForm.table]}</Radio>
                        <Radio value={DdbForm.matrix}>{DATA_SOURCE_TYPE_MAP[DdbForm.matrix]}</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Modal>
    </ConfigProvider>
})

export function DataSourceList ({
    widget,
    loading,
    current_data_source,
    no_save_flag,
    save_confirm,
    handle_save,
    change_current_data_source,
    change_current_data_source_property,
    on_select
}: PropsType) {
    
    // 当前 check 的 datasource
    const [checked_keys, set_checked_keys] = useState<string[]>(widget?.source_id ?? [ ])
    
    const [menu_items, set_menu_items] = useState<MenuItemType[]>()
    
    useEffect(() => { 
        set_menu_items(data_sources.map(item => generate_tree_item(item, widget)))
    }, [widget])
    
    useEffect(() => { on_select(checked_keys) }, [checked_keys])
    
    const checkable = useMemo(() => widget && WidgetChartType.COMPOSITE_GRAPH === widget.type, [widget])
    
    const tree_ref = useRef(null)
    
    
    // 监听 ctrl v事件，复制组件
    useEffect(() => { 
        async function paste_handler (event) {
            try {
                if (await paste_data_source(event)) { 
                    set_menu_items(data_sources.map(item => generate_tree_item(item, widget)))
                    const id = data_sources[0].id
                    change_current_data_source(id)
                }
            } catch (error) {
                dashboard.message.error(error.message)
            }
        }
        
        window.addEventListener('paste', paste_handler)
        return () => { window.removeEventListener('paste', paste_handler) }
    }, [widget])
    
    useEffect(() => {
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
            generate_tree_item(new_data_source, widget),
            ...menu_items
        ])
        change_current_data_source(new_data_source.id)
    }, [menu_items, widget])
    
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
                                rename_data_source_handler(menu_items, current_data_source.id, current_data_source.name)
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
                                no_save_flag.current = false
                                if (!data_sources.length)
                                    change_current_data_source('')
                                else {
                                    const index = delete_index === 0 ? 0 : delete_index - 1
                                    change_current_data_source(data_sources[index].id)
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
                            checkedKeys={checked_keys}
                            ref={tree_ref}
                            showIcon
                            height={450}
                            blockNode
                            selectedKeys={[current_data_source.id]}
                            className='data-source-list-bottom-menu'
                            onCheck={keys => { set_checked_keys(keys as string[]) }}
                            onSelect={async key => {
                                // 点击树节点触发
                                if (loading)
                                    return
                                const [selected_key] = key ?? [ ] 
                                if (selected_key) {
                                    if (no_save_flag.current && (await save_confirm()))
                                        await handle_save()
                                    no_save_flag.current = false
                                    change_current_data_source(String(selected_key))
                                }
                            }}
                            treeData={menu_items}
                        />
                    }
                </div> }
            </div>
        </>
}
