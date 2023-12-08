import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { CheckCircleFilled, DeleteOutlined, MinusCircleFilled, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag, Tooltip, Transfer, type TableColumnType } from 'antd'

import { t } from '../../i18n/index.js'

import { use_modal } from 'react-object-model/hooks.js'
import { model } from '../model.js'
import { access } from './model.js'

export function UserList () {
    
    const { users, groups, current } = access.use(['users', 'groups', 'current'])
    
    const [users_info, set_users_info] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_users, set_selected_users] = useState([ ])
    
    const [origin_groups, set_origin_groups] = useState<string[]>([ ])
    
    const [target_groups, set_target_groups] = useState<string[]>([ ])
    
    const [selected_groups, set_selected_groups] = useState<string[]>([ ])
    
    
    const [add_user_form] = Form.useForm()
    
    const [reset_password_form] = Form.useForm()
    
    let creator = use_modal()
    let editor = use_modal()
    let edit_groupor = use_modal()
    let deletor = use_modal()
    let confior = use_modal()
    
    useEffect(() => {
        model.execute(async () =>  { set_users_info((await access.get_user_access(users))) } )
    }, [users])
    
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
                width: 150,
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
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: 400
            }
        ]
    ), [users_info ])
    
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
            onOk={async () => model.execute(async () => {
                const { username, password, is_admin, groups } = await add_user_form.validateFields()
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
            })}
            
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
            onOk={async () => model.execute(async () => {
                await Promise.all(selected_users.map(async user => access.delete_user(user)))
                model.message.success(t('用户删除成功'))
                set_selected_users([ ])
                deletor.close()
                await access.get_user_list()
            })
            }
            title={<Tooltip title={selected_users.map(name => <p key={name}>{name}</p>)}>
                        {t('确认删除选中的 {{num}} 个用户吗？', { num: selected_users.length })}
                </Tooltip>}
        />
        
        <Modal
            className='edit-user-modal'
            open={editor.visible}
            onOk={async () => model.execute(async () => {
                const { password } = await reset_password_form.validateFields()
                await access.reset_password(current?.name, password)
                reset_password_form.resetFields()
                model.message.success(t('密码修改成功'))
                editor.close()
            })}
            title={<div>
                    {t('重置用户 ')}
                    <span className='blue'>{ current?.name }</span>
                    {t(' 密码')}
                    </div> 
            }
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
        
        <Modal 
            className='edit-user-group-modal'
            open={edit_groupor.visible}
            onCancel={edit_groupor.close}
            destroyOnClose
            title={<div>
                {t('组 ')}
                <span className='blue'>{ current?.name }</span>
                {t(' 成员管理')}
                </div> 
            }
            onOk={async () => {
                set_origin_groups((await access.get_user_access([current?.name]))[0].groups.split(',').filter(group => group !== ''))
                confior.open() }}
            okText={t('预览修改')}
            >
            <Transfer
                dataSource={groups.map(user => ({
                    key: user,
                    title: user
                }))}
                titles={['未所属组', '所属组']}
                showSearch
                locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想查找的组') }}
                filterOption={(val, user) => user.title.includes(val)}
                targetKeys={target_groups}
                selectedKeys={selected_groups}
                onChange={set_target_groups}
                onSelectChange={(s, t) => { set_selected_groups([...s, ...t]) }}
                render={item => item.title}
                />
        </Modal>
        
        <Modal 
            className='edit-confirm-modal'
            open={confior.visible}
            onCancel={confior.close}
            destroyOnClose
            title={<div>
                {t('确认对用户 ')}
                <span className='blue'>{current?.name}</span>
                {t(' 进行以下改动吗')}
            </div> 
            }
            onOk={async () => model.execute(async () => {
                const origin_groups = (await access.get_user_access([current?.name]))[0].groups.split(',').filter(group => group !== '')
                const delete_groups = origin_groups.filter(u => !target_groups.includes(u)).filter(group => group !== '')
                const add_groups = target_groups.filter((u: string) => !origin_groups.includes(u)).filter(group => group !== '')
                if (delete_groups.length || add_groups.length) {
                    await Promise.all([
                    ...delete_groups.length ? [access.delete_group_member(current?.name, delete_groups)] : [ ],
                    ...add_groups.length ?  [access.add_group_member(current?.name, add_groups)] : [ ]                    
                    ])
                    model.message.success(t('用户所属组修改成功'))
                }
                edit_groupor.close()
                confior.close()
                set_selected_groups([ ])
                set_target_groups([ ])
                set_users_info((await access.get_user_access(users)))
            })}
            
            >
            <div>
                <h4>{t('原有组:')}</h4>
                {origin_groups.map(group => 
                    <Tag color='cyan'>{group}</Tag>)}
                <h4>{t('移入组:')}</h4>
                {target_groups.filter((u: string) => !origin_groups.includes(u)).filter(group => group !== '').map(group => 
                    <Tag color='green'>{group}</Tag>)}
                <h4>{t('移出组:')}</h4>
                {origin_groups.filter(u => !target_groups.includes(u)).filter(group => group !== '').map(group => 
                    <Tag color='red'>{group}</Tag>)}
            </div>
        </Modal>
        
        <div className='header'>
            <div className='actions'>
                <Button type='primary' icon={<PlusOutlined/>} onClick={creator.open}>
                    {t('新建用户')}
                </Button>
                <Button danger icon={<DeleteOutlined/>} onClick={() => {
                    if (selected_users.length)
                        deletor.open()
                }}>
                    {t('批量删除')}
                </Button>
                <Input  
                    className='search'
                    value={search_key}
                    prefix={<SearchOutlined />}
                    onChange={e => { set_search_key(e.target.value) }} 
                    placeholder={t('请输入想要搜索的用户')} 
                />
            </div>
            <Button type='default'
                    icon={<ReloadOutlined />}
                    onClick={async () => model.execute(
                        async () => {
                            await access.get_user_list() 
                            set_users_info((await access.get_user_access(users)))
                            model.message.success(t('刷新成功'))
                        })
                    }>{t('刷新')}</Button>
        </div>
        <Table 
            rowSelection={{
                selectedRowKeys: selected_users,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_users(selectedRowKeys)
                }
            }}
            columns={cols}
            dataSource={users_info.filter(
                ({ userId }) => userId.toLowerCase().includes(search_key.toLowerCase())).map(user_access => ({
                    key: user_access.userId,
                    user_name: user_access.userId,
                    is_admin: user_access.isAdmin ? 
                                        <CheckCircleFilled className='green'/> 
                                            : 
                                        <MinusCircleFilled className='gray'/>,
                    groups:  <div>
                                {
                                   user_access.groups && user_access.groups.split(',').map((group: string) => <Tag color='cyan'>{group}</Tag>) 
                                }
                            </div>,
                            // <Select
                            //     mode='tags'
                            //     className='group-select'
                            //     // allowClear
                            //     key={user_access.groups}
                            //     tagRender={tagRender}
                            //     disabled
                            //     placeholder={t('请选择想要添加的组')}
                            //     defaultValue={user_access.groups ? user_access.groups.split(',') : [ ]}
                            //     onDeselect={async group => model.execute(async () => { await access.delete_group_member(user_access.userId, group) })}
                            //     onSelect={async group => model.execute(async () => { await access.add_group_member(user_access.userId, group) })}
                            //     options={groups.map(group => ({ label: group, value: group }))}
                            // />,
                    actions: <div className='actions'>
                        <Button type='link'
                            onClick={async () => {
                                access.set({ current: { name: user_access.userId } })
                                set_target_groups((await access.get_user_access([user_access.userId]))[0].groups.split(','))
                                edit_groupor.open()
                        }}>
                            {t('用户组管理')}
                        </Button>
                        
                        <Button type='link'
                            onClick={() => {
                                access.set({ current: { name: user_access.userId } })
                                editor.open()
                        }}>
                            {t('重置密码')}
                        </Button>
                        
                        <Button type='link'
                                onClick={() => { 
                                    access.set({ current: { role: 'user', name: user_access.userId, view: 'manage' } }) 
                                }}>
                            {t('权限管理')}
                        </Button>
                        
                        <Button type='link'
                                onClick={() => { 
                                    access.set({ current: { role: 'user', name: user_access.userId, view: 'preview' } }) 
                                }}>
                            {t('查看权限')}
                        </Button>
                        
                        <Popconfirm
                            title={t('删除用户')}
                            description={t('确认删除用户 {{user}} 吗', { user: user_access.userId })}
                            onConfirm={async () => model.execute(async () => {
                                await access.delete_user(user_access.userId)
                                model.message.success(t('用户删除成功'))
                                await access.get_user_list()
                            })}
                        >
                            <Button type='link' danger>
                                {t('删除')}
                            </Button>
                        </Popconfirm>
                    </div>
                })
        
        )}
            />
    </>
}
