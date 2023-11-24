import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { Button, Form, Input, Modal, Select, Switch, Table,  Popconfirm, Tooltip, type TableColumnType, Transfer } from 'antd'
import { CheckCircleFilled, CheckCircleOutlined, CloseCircleFilled, CloseCircleOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { access } from './model.js'
import { model } from '../model.js'
import { use_modal } from 'react-object-model/modal'

export function GroupList () {
    
    const { users, groups, current } = access.use(['users', 'groups', 'current'])
    
    const [groups_info, set_groups_info] = useState([ ])
    
    const [filtered_groups, set_filtered_groups] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_groups, set_selected_groups] = useState([ ])
    
    const [target_users, set_target_users] = useState<string[]>([ ])
    
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    
    const [current_group, set_current_group] = useState('')
    
    const [add_group_form] = Form.useForm()
    
    let creator = use_modal()
    let editor = use_modal()
    let deletor = use_modal()
    
    useEffect(() => {
        (async () => {
            set_groups_info((await access.get_group_access(groups)))
        })()
    }, [groups])
    
    useEffect(() => {
        set_filtered_groups(
            groups_info.filter(
                ({ groupName }) => groupName.toLowerCase().includes(search_key.toLowerCase())))
    }, [groups_info, search_key])
    
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [
            {
                title: t('组名'),
                dataIndex: 'group_name',
                key: 'group_name',
                width: 200
            },
            {
                title: t('组内用户'),
                dataIndex: 'users',
                key: 'users',
                width: 'auto',
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: 100
            }
        ]
    ), [ ])
    
    const rows = useMemo(() => (
        filtered_groups.map(group => ({
            key: group.groupName,
            group_name: group.groupName,
            users:  group.users,
            actions: <div className='actions'>
                <Button type='link' 
                        onClick={async () => { 
                            editor.open()
                            
                            set_current_group(group.groupName)
                            set_target_users(await access.get_users_by_group(group.groupName))
                        }}>
                    {t('成员管理')}
                </Button>
                <Button type='link' 
                        onClick={() => { 
                            access.set({ current: { role: 'group', name: group.groupName, preview: false } }) 
                        }}>
                    {t('权限管理')}
                </Button>
                <Button type='link'
                        onClick={() => { 
                            access.set({ current: { role: 'group', name: group.groupName, preview: true } }) 
                        }}>
                    {t('查看权限')}
                </Button>
                <Popconfirm
                    title={t('删除组')}
                    description={t('确认删除组 {{group}} 吗', { group: group.groupName })}
                    onConfirm={async () => {
                                    try {
                                        await access.delete_group(group.groupName)
                                        model.message.success(t('组删除成功'))
                                        await access.get_group_list()
                                    } catch (error) {
                                        model.show_error({ error })
                                    } 
                                }}
                >
                    <Button type='link' danger>
                        {t('删除')}
                    </Button>
                </Popconfirm>
            </div>
        }))
    ), [filtered_groups, groups])
    
    return <>
        <Modal 
            className='add-group-modal'
            open={creator.visible}
            onCancel={() => { 
                add_group_form.resetFields()
                creator.close()
            }}
            destroyOnClose
            title={t('新建组')}
            onOk={async () => {
                try {
                    const { group_name, users } = await add_group_form.validateFields()
                    await access.create_group(group_name, users ?? [ ])
                    model.message.success(t('组创建成功'))
                    creator.close()
                    set_selected_users([ ])
                    set_target_users([ ])
                    set_current_group('')
                    add_group_form.resetFields()
                    await access.get_group_list()
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
                
            }}
            
            >
            <Form
                name='basic'
                labelCol={{ span: 3 }}
        
                labelAlign='right'
                form={add_group_form}
                autoComplete='off'
            >
                <Form.Item
                    label={t('组名')}
                    name='group_name'
                    rules={[{ required: true, message: '请输入组名!' }]}
                    >
                        <Input />
                </Form.Item>
                <Form.Item
                    label={t('成员')}
                    name='users'
                    >
                    <Transfer
                        dataSource={users.map(user => ({
                            key: user,
                            title: user
                        }))}
                        titles={['组外用户', '组内用户']}
                        targetKeys={target_users}
                        selectedKeys={selected_users}
                        onChange={set_target_users}
                        onSelectChange={(s, t) => { set_selected_users([...s, ...t]) }}
                        render={item => item.title}
                        />
                </Form.Item>
                    
            </Form>
        </Modal>
        
        <Modal 
            className='edit-group-modal'
            open={editor.visible}
            onCancel={editor.close}
            destroyOnClose
            title={t('组 {{group}} 成员管理', { group: current_group })}
            onOk={async () => {
                    try {
                        const origin_users = await access.get_users_by_group(current_group)
                        const delete_users = origin_users.filter(u => !target_users.includes(u))
                        const add_users = target_users.filter((u: string) => !origin_users.includes(u))
                        if (delete_users.length || add_users.length) {
                            await Promise.all([access.delete_group_member(delete_users, current_group),
                                access.add_group_member(add_users, current_group)                    
                            ])
                            model.message.success(t('成员修改成功'))
                        }
                        editor.close()
                        set_selected_users([ ])
                        set_target_users([ ])
                        set_current_group('')
                        await access.get_group_list()
                    } catch (error) {
                        model.show_error({ error })
                        throw error
                    }
            }}
            
            >
            <Transfer
                dataSource={users.map(user => ({
                    key: user,
                    title: user
                }))}
                titles={['组外用户', '组内用户']}
                targetKeys={target_users}
                selectedKeys={selected_users}
                onChange={set_target_users}
                onSelectChange={(s, t) => { set_selected_users([...s, ...t]) }}
                render={item => item.title}
                />
        </Modal>
        
        <Modal
            className='delete-user-modal'
            open={deletor.visible}
            onCancel={deletor.close}
            onOk={async () => {
                try {
                    await Promise.all(selected_groups.map(async group => access.delete_group(group)))
                    model.message.success(t('组删除成功'))
                    deletor.close()
                    await access.get_group_list()
                } catch (error) {
                    model.show_error({ error })
                }
            }
            }
            title={<Tooltip title={selected_groups.map(name => <p key={name}>{name}</p>)}>
                        {t('确认删除选中的 {{num}} 个组吗？', { num: selected_groups.length })}
                </Tooltip>}
        />
        
        
        <div className='header'>
            <div className='actions'>
                <Button type='primary' icon={<PlusOutlined />} onClick={creator.open}>
                    {t('新建组')}
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={deletor.open}>
                    {t('批量删除')}
                </Button>
            </div>
            <Input  
                className='search'
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => { set_search_key(e.target.value) }} 
                placeholder={t('请输入想要搜索的组')} 
                     />
        </div>
        <Table 
            rowSelection={{
                selectedRowKeys: selected_groups,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_groups(selectedRowKeys)
                }
            }}
            columns={cols}
            dataSource={rows}
            />
    </>
}
