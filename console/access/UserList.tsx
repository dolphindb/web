import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { Button, Form, Input, Modal, Select, Switch, Table,  Popconfirm, Tooltip, type TableColumnType } from 'antd'
import { CheckCircleFilled, CheckCircleOutlined, CloseCircleFilled, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { access } from './model.js'
import { model } from '../model.js'
import { use_modal } from 'react-object-model/modal'

export function UserList () {
    
    const { users, groups, current } = access.use(['users', 'groups', 'current'])
    
    const [users_info, set_users_info] = useState([ ])
    
    const [filtered_users, set_filtered_users] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_users, set_selected_users] = useState([ ])
    
    const [current_user, set_current_user] = useState('')
    
    const [add_user_form] = Form.useForm()
    
    const [reset_password_form] = Form.useForm()
    
    let creator = use_modal()
    let editor = use_modal()
    let deletor = use_modal()
    
    useEffect(() => {
        (async () => {
            set_users_info((await access.get_user_access(users)))
        })()
    }, [users])
    
    
    useEffect(() => {
        set_filtered_users(
            users_info.filter(
                ({ userId }) => userId.toLowerCase().includes(search_key.toLowerCase())))
    }, [users_info, search_key])
    
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(() => (
        [
            {
                title: t('用户名'),
                dataIndex: 'user_name',
                key: 'user_name',
                width: 200
            },
            {
                title: t('是否管理员'),
                dataIndex: 'is_admin',
                key: 'is_admin',
                width: 200,
                filters: [
                    {
                        text: t('管理员'),
                        value: true
                    },
                    { 
                        text: t('非管理员'),
                        value: false
                    }
                ],
                filterMultiple: false,
                onFilter: (is_admin: boolean, record) => 
                                users_info.find(({ userId }) => 
                                    userId === record.user_name).isAdmin === is_admin
            },
            {
                title: t('组'),
                dataIndex: 'groups',
                key: 'groups',
                width: 'auto',
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: 100
            }
        ]
    ), [users_info ])
    
    const rows = useMemo(() => (
        filtered_users.map(user_access => ({
            key: user_access.userId,
            user_name: user_access.userId,
            is_admin: user_access.isAdmin ? 
                                <CheckCircleFilled className='green'/> 
                                    : 
                                <CloseCircleFilled className='red'/>,
            groups:  <Select
                        mode='tags'
                        className='group-select'
                        // allowClear
                        placeholder={t('请选择想要添加的组')}
                        defaultValue={user_access.groups ? user_access.groups.split(',') : [ ]}
                        onDeselect={async group => {
                            try {
                                await access.delete_group_member(user_access.userId, group)
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        }}
                        onSelect={async group => {
                            try {
                                await access.add_group_member(user_access.userId, group)
                            } catch (error) {
                                model.show_error({ error })
                                throw error
                            }
                        }}
                        options={groups.map(group => ({ label: group, value: group }))}
                    />,
            actions: <div className='actions'>
                <Button type='primary' 
                        onClick={() => { 
                            access.set({ current: { role: 'user', name: user_access.userId, preview: false } }) 
                        }}>
                    {t('权限管理')}
                </Button>
                <Button type='primary'
                        onClick={() => { 
                            access.set({ current: { role: 'user', name: user_access.userId, preview: true } }) 
                        }}>
                    {t('查看权限')}
                </Button>
                <Button type='primary' onClick={() => {
                    editor.open()
                    set_current_user(user_access.userId)
                }}>
                    {t('重置密码')}
                </Button>
                <Popconfirm
                    title={t('删除用户')}
                    description={t('确认删除用户 {{user}} 吗', { user: user_access.userId })}
                    onConfirm={async () => {
                                    try {
                                        await access.delete_users([user_access.userId])
                                        model.message.success(t('用户删除成功'))
                                        await access.get_user_list()
                                    } catch (error) {
                                        model.show_error({ error })
                                    } 
                                }}
                >
                    <Button type='primary' danger>
                        {t('删除')}
                    </Button>
                </Popconfirm>
            </div>
        }))
    ), [filtered_users, groups])
    
    return <>
        <Modal 
            className='add-user-modal'
            open={creator.visible}
            onCancel={() => { 
                add_user_form.resetFields()
                creator.close()
            }}
            destroyOnClose
            title={t('新建用户')}
            onOk={async () => {
                try {
                    const { username, password, confirm_password, is_admin, groups } = await add_user_form.validateFields()
                    await access.create_user({ 
                        userId: username,
                        password: password,
                        groupIds: groups,
                        isAdmin: is_admin 
                    })
                    model.message.success(t('用户创建成功'))
                    creator.close()
                    add_user_form.resetFields()
                    await access.get_user_list()
                } catch (error) {
                    model.show_error({ error })
                    throw error
                }
                
            }}
            
            >
            <Form
                name='basic'
                labelCol={{ span: 4 }}
        
                labelAlign='right'
                form={add_user_form}
                autoComplete='off'
            >
                <Form.Item
                    label={t('用户名')}
                    name='username'
                    rules={[{ required: true, message: '请输入用户名!' }]}
                    >
                        <Input />
                </Form.Item>
                
                <Form.Item
                    label={t('密码')}
                    name='password'
                    rules={[{ required: true, message: '请输入密码!' }]}
                    >
                    <Input.Password />
                </Form.Item>
                
                <Form.Item
                    label={t('确认密码')}
                    name='confirm_password'
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        { 
                            required: true, 
                            message: '请再次输入密码!',
                        },
                        ({ getFieldValue }) => ({
                            async validator (_, value) {
                              if (!value || getFieldValue('password') === value)
                                  return Promise.resolve()
                              
                              return Promise.reject(new Error('两次输入密码需要保持一致!'))
                            },
                          }),
                    ]}
                    >
                    <Input.Password />
                </Form.Item>
                
                <Form.Item
                    label={t('是否管理员')}
                    name='is_admin'
                    initialValue={false}
                    >
                    <Switch/>
                </Form.Item>
                
                <Form.Item
                    label={t('组')}
                    name='groups'
                    >
                    <Select
                            mode='multiple'
                            className='group-select'
                            // allowClear
                            placeholder={t('请选择想要添加的组')}
                            // onChange={handleChange}
                            options={groups.map(group => ({ label: group, value: group }))}
                    />
                </Form.Item>
                    
            </Form>
        </Modal>
        
        <Modal
            className='delete-user-modal'
            open={deletor.visible}
            onCancel={deletor.close}
            onOk={async () => {
                try {
                    await access.delete_users(users)
                    model.message.success(t('用户删除成功'))
                    deletor.close()
                    await access.get_user_list()
                } catch (error) {
                    model.show_error({ error })
                }
            }
            }
            title={<Tooltip title={selected_users.map(name => <p key={name}>{name}</p>)}>
                        {t('确认删除选中的 {{num}} 个用户吗？', { num: selected_users.length })}
                </Tooltip>}
        />
        
        <Modal
            className='edit-user-modal'
            open={editor.visible}
            onOk={async () => {
                try {
                    const { password } = await reset_password_form.validateFields()
                    await access.reset_password(current_user, password)
                    reset_password_form.resetFields()
                    model.message.success(t('密码修改成功'))
                    editor.close()
                } catch (error) {
                    model.show_error({ error })
                }
            }}
            title={t('重置用户 {{user}} 密码', { user: current_user })}
            onCancel={() => {
                reset_password_form.resetFields()
                editor.close()
            }}>
            <Form
                name='basic'
                form={reset_password_form}
                labelCol={{ span: 4 }}
                labelAlign='right'
                autoComplete='off'
            >
                <Form.Item
                    label={t('新密码')}
                    name='password'
                    rules={[{ required: true, message: '请输入密码!' }]}
                    >
                    <Input.Password />
                </Form.Item>
                
                <Form.Item
                    label={t('确认密码')}
                    name='confirm_password'
                    dependencies={['password']}
                    hasFeedback
                    rules={[
                        { 
                            required: true, 
                            message: '请再次输入密码!',
                        },
                        ({ getFieldValue }) => ({
                            async validator (_, value) {
                              if (!value || getFieldValue('password') === value)
                                  return Promise.resolve()
                              
                              return Promise.reject(new Error('两次输入密码需要保持一致!'))
                            },
                          }),
                    ]}
                    >
                    <Input.Password />
                </Form.Item>
            </Form>
        </Modal>
        
        <div className='header'>
            <div className='actions'>
                <Button type='primary' onClick={creator.open}>
                    {t('新建用户')}
                </Button>
                <Button type='primary' danger onClick={deletor.open}>
                    {t('批量删除')}
                </Button>
            </div>
            <Input  
                className='search'
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => { set_search_key(e.target.value) }} 
                placeholder={t('请输入想要搜索的用户')} 
                     />
        </div>
        <Table 
            rowSelection={{
                selectedRowKeys: selected_users,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_users(selectedRowKeys)
                }
            }}
            columns={cols}
            dataSource={rows}
            />
    </>
}
