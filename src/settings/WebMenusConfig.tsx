import { useState, useRef, useEffect } from 'react'

import { Button, Form, Input, Popconfirm, type FormInstance } from 'antd'
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, AppstoreOutlined
} from '@ant-design/icons'

import { required } from 'xshell/utils.browser.js'

import { t } from '@i18n'

import { model } from '@model'

import { config, type WebMenuItem } from '@/config/model.ts'


export function WebMenusConfig () {
    const { menus } = config.use(['menus'])
    
    const [editing_index, set_editing_index] = useState<number | null>(null)
    
    const rform = useRef<FormInstance>(undefined)
    const rform_container = useRef<HTMLDivElement>(undefined)
    
    // 当 editing_index 变化时（点击添加或编辑），自动滚动到表单位置并聚焦
    useEffect(() => {
        if (editing_index === null)
            return
        
        setTimeout(() => {
            rform_container.current?.scrollIntoView({ behavior: 'instant', block: 'center' })
            rform.current?.getFieldInstance('title')?.focus()
        }, 100)
    }, [editing_index])
    
    
    async function save_menus (menus_: WebMenuItem[]) {
        if (menus_.length)
            config.set_config('webMenus', JSON.stringify(menus_))
        else
            config.delete_config('webMenus')
        
        config.set({ menus: menus_ })
        
        await config.save_configs()
        
        model.message.success(t('保存成功'))
    }
    
    
    return <div className='web-menus-config'>
        <div className='menu-header'>
            <div className='menu-header-title'>{t('自定义侧边菜单配置')}</div>
            <Button type='primary' icon={<PlusOutlined />} onClick={() => {
                set_editing_index(-1)
                rform.current?.resetFields()
            }}>
                {t('添加菜单项')}
            </Button>
        </div>
        
        <div className='menu-list'>
            {menus.length === 0 ?
                <div className='empty-text'>
                    {t('暂无配置，点击上方按钮添加')}
                </div>
            :
                menus.map((item, index) => 
                    <div key={index} className='menu-item'>
                        <div className='menu-item-content'>
                            <div className='menu-item-icon'>
                                <AppstoreOutlined />
                            </div>
                            <div className='menu-item-info'>
                                <div className='menu-item-title'>
                                    {item.title}
                                </div>
                                <div className='menu-item-description'>
                                    <a href={item.url} target='_blank' rel='noopener noreferrer'>
                                        {item.url}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className='menu-item-actions'>
                            <Button
                                type='link'
                                icon={<EditOutlined />}
                                onClick={() => {
                                    set_editing_index(index)
                                    
                                    setTimeout(() => {
                                        rform.current?.setFieldsValue(menus[index])
                                    }, 300)
                                }}
                            >
                                {t('编辑')}
                            </Button>
                            
                            <Button
                                type='link'
                                disabled={index === 0}
                                icon={<ArrowUpOutlined />}
                                onClick={() => {
                                    const new_menus = [...menus]
                                    ;[new_menus[index - 1], new_menus[index]] = [new_menus[index], new_menus[index - 1]]
                                    save_menus(new_menus)
                                }}
                            />
                            
                            <Button
                                type='link'
                                disabled={index === menus.length - 1}
                                icon={<ArrowDownOutlined />}
                                onClick={() => {
                                    const new_menus = [...menus]
                                    ;[new_menus[index], new_menus[index + 1]] = [new_menus[index + 1], new_menus[index]]
                                    save_menus(new_menus)
                                }}
                            />
                            
                            <Popconfirm
                                title={t('确认删除此菜单项？')}
                                onConfirm={() => save_menus(menus.filter((_, i) => i !== index))}
                            >
                                <Button type='link' danger icon={<DeleteOutlined />}>
                                    {t('删除')}
                                </Button>
                            </Popconfirm>
                        </div>
                    </div>)
            }
        </div>
        
        {editing_index !== null && <div className='menu-form' ref={rform_container}>
            <div className='menu-form-title'>
                {editing_index === -1 ? t('添加菜单项') : t('编辑菜单项')}
            </div>
            <Form
                ref={rform}
                layout='inline'
                onFinish={async (values) => {
                    await save_menus(
                        editing_index === -1
                            ? [...menus, values]
                            : menus.map((item, i) => i === editing_index ? values : item))
                    
                    set_editing_index(null)
                }}
            >
                <Form.Item name='title' className='field-title' label={t('菜单标题')} {...required}>
                    <Input placeholder={t('请输入菜单标题')} />
                </Form.Item>
                
                <Form.Item name='url' className='field-url' label={t('链接地址')} {...required}>
                    <Input placeholder={t('请输入链接地址，如 /xxx/xxx 或 https://dolphindb.cn')} />
                </Form.Item>
                
                <Form.Item>
                    <Button type='primary' htmlType='submit'>
                        {t('保存')}
                    </Button>
                    
                    <Button className='btn-cancel' onClick={() => set_editing_index(null)}>
                        {t('取消')}
                    </Button>
                </Form.Item>
            </Form>
        </div> }
    </div>
}
