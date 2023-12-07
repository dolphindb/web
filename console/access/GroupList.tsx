import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Table, Tag, Tooltip, Transfer, type TableColumnType } from 'antd'

import { t } from '../../i18n/index.js'
import { use_modal } from 'react-object-model/modal'
import { model } from '../model.js'
import { access } from './model.js'

export function GroupList () {
    
    const { users, groups, current } = access.use(['users', 'groups', 'current'])
    
    const [groups_info, set_groups_info] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_groups, set_selected_groups] = useState([ ])
    
    const [origin_users, set_origin_users] = useState<string[]>([ ])
    
    const [target_users, set_target_users] = useState<string[]>([ ])
    
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    
    const [add_group_form] = Form.useForm()
    
    let creator = use_modal()
    let editor = use_modal()
    let deletor = use_modal()
    let confior = use_modal()
    
    useEffect(() => {
        model.execute(async () => { set_groups_info((await access.get_group_access(groups))) })    
    } 
    , [groups])  
    
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
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: 400
            }
        ]
    ), [ ])
    
    
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
            onOk={async () => model.execute(async () => {
                const { group_name, users } = await add_group_form.validateFields()
                    await access.create_group(group_name, users ?? [ ])
                    model.message.success(t('组创建成功'))
                    creator.close()
                    set_selected_users([ ])
                    set_target_users([ ])
                    add_group_form.resetFields()
                    await access.get_group_list()
            })}
            
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
                    rules={[{ required: true, message: t('请输入组名') }]}
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
                        showSearch
                        locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想查找的用户') }}
                        filterOption={(val, user) => user.title.includes(val)}
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
            title={<div>
                {t('组 ')}
                <span className='blue'>{ current?.name }</span>
                {t(' 成员管理')}
                </div> 
            }
            onOk={async () => {
                set_origin_users(await access.get_users_by_group(current?.name))
                confior.open() 
            }}
            okText={t('预览修改')}
            >
            <Transfer
                dataSource={users.map(user => ({
                    key: user,
                    title: user
                }))}
                titles={['组外用户', '组内用户']}
                showSearch
                locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想查找的用户') }}
                filterOption={(val, user) => user.title.includes(val)}
                targetKeys={target_users}
                selectedKeys={selected_users}
                onChange={set_target_users}
                onSelectChange={(s, t) => { set_selected_users([...s, ...t]) }}
                render={item => item.title}
                />
        </Modal>
        
        <Modal 
            className='edit-confirm-modal'
            open={confior.visible}
            onCancel={confior.close}
            destroyOnClose
            title={<div>
                {t('确认对组 ')}
                <span className='blue'>{current?.name}</span>
                {t(' 进行以下改动吗')}
            </div> 
            }
            onOk={async () => model.execute(async () => {
               
                const delete_users = origin_users.filter(u => !target_users.includes(u)).filter(group => group !== '')
                const add_users = target_users.filter((u: string) => !origin_users.includes(u)).filter(group => group !== '')
                if (delete_users.length || add_users.length) {
                    await Promise.all([
                    ...delete_users.length ? [access.delete_group_member(delete_users, current?.name )] : [ ],
                    ...add_users.length ?  [access.add_group_member(add_users, current?.name )] : [ ]                    
                    ])
                    model.message.success(t('组内用户修改成功'))
                }
                editor.close()
                confior.close()
                set_selected_users([ ])
                set_target_users([ ])
                await access.get_group_list()
            })}
            
            >
            <div>
                <h4>{t('原组内用户:')}</h4>
                {origin_users.map(group => 
                    <Tag color='cyan'>{group}</Tag>)}
                <h4>{t('移入用户:')}</h4>
                {target_users.filter((u: string) => !origin_users.includes(u)).filter(group => group !== '').map(group => 
                    <Tag color='green'>{group}</Tag>)}
                <h4>{t('移出用户:')}</h4>
                {origin_users.filter(u => !target_users.includes(u)).filter(group => group !== '').map(group => 
                    <Tag color='red'>{group}</Tag>)}
            </div>
        </Modal>
        
        <Modal
            className='delete-user-modal'
            open={deletor.visible}
            onCancel={deletor.close}
            onOk={async () => model.execute(async () => {
                await Promise.all(selected_groups.map(async group => access.delete_group(group)))
                model.message.success(t('组删除成功'))
                set_selected_groups([ ])
                deletor.close()
                await access.get_group_list()
            })
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
                <Button danger icon={<DeleteOutlined />} onClick={() => {
                    if (selected_groups.length)
                        deletor.open()
                }}>
                    {t('批量删除')}
                </Button>
                <Input  
                    className='search'
                    value={search_key}
                    prefix={<SearchOutlined />}
                    onChange={e => { set_search_key(e.target.value) }} 
                    placeholder={t('请输入想要搜索的组')} 
                />
            </div>
            <Button 
                type='default'
                icon={<ReloadOutlined />}
                onClick={async () => model.execute(async () => access.get_group_list())} >{t('刷新')}</Button>
        </div>
        <Table 
            rowSelection={{
                selectedRowKeys: selected_groups,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_groups(selectedRowKeys)
                }
            }}
            columns={cols}
            dataSource={ groups_info.filter(
                ({ groupName }) => groupName.toLowerCase().includes(search_key.toLowerCase())).map(group => ({
                key: group.groupName,
                group_name: group.groupName,
                users:  <div>
                        {
                        group.users && group.users.split(',').map((user: string) => <Tag color='cyan'>{user}</Tag>) 
                        }
                    </div>,
                actions: <div className='actions'>
                    <Button type='link' 
                            onClick={async () => model.execute(async () => { 
                                access.set({ current: { name: group.groupName } })
                                editor.open()
                                set_target_users(await access.get_users_by_group(group.groupName))
                            })}>
                        {t('成员管理')}
                    </Button>
                    <Button type='link' 
                            onClick={() => { 
                                access.set({ current: { role: 'group', name: group.groupName, view: 'manage' } }) 
                            }}>
                        {t('权限管理')}
                    </Button>
                    <Button type='link'
                            onClick={() => { 
                                access.set({ current: { role: 'group', name: group.groupName, view: 'preview' } }) 
                            }}>
                        {t('查看权限')}
                    </Button>
                    <Popconfirm
                        title={t('删除组')}
                        description={t('确认删除组 {{group}} 吗', { group: group.groupName })}
                        onConfirm={async () => model.execute(async () => {
                            await access.delete_group(group.groupName)
                            model.message.success(t('组删除成功'))
                            await access.get_group_list()
                        })}
                    >
                        <Button type='link' danger>
                            {t('删除')}
                        </Button>
                    </Popconfirm>
                </div>
            }))}
            tableLayout='fixed'
            // scroll={{ x: '100%' }}
            />
    </>
}
