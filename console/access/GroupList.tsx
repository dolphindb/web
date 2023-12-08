import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { Button, Form, Input, Modal, Table,  Popconfirm, Tooltip, type TableColumnType, Transfer, Select, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { access } from './model.js'
import { model } from '../model.js'
import { use_modal } from 'react-object-model/hooks.js'

export function GroupList () {
    
    const { users, groups, current } = access.use(['users', 'groups', 'current'])
    
    const [groups_info, set_groups_info] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_groups, set_selected_groups] = useState([ ])
    
    const [target_users, set_target_users] = useState<string[]>([ ])
    
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    
    const [add_group_form] = Form.useForm()
    
    let creator = use_modal()
    let editor = use_modal()
    let deletor = use_modal()
    
    useEffect(() => {
        model.execute(async () => { set_groups_info((await access.get_group_access(groups))) })    
    } 
    , [groups])  
    
    function tagRender (props) {
        const { label, closable, onClose } = props
        function onPreventMouseDown (event: React.MouseEvent<HTMLSpanElement>) {
          event.preventDefault()
          event.stopPropagation()
        }
        return <Tag
            color='cyan'
            onMouseDown={onPreventMouseDown}
            closable={closable}
            onClose={onClose}
            style={{ marginRight: 3 }}
          >
            {label}
          </Tag>
    }
    
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
                // // width: 800,
                // // ellipsis: {
                // //     showTitle: false,
                // // },
                // // render: group_users => { 
                // //     const users_arr = group_users.split(',')
                // //     return <div>
                       
                //         {/* <span>{users_arr.length > max_num_of_users ? 
                //                 <div>
                //                     <span>{users_arr.slice(0, max_num_of_users).join(',') + '...'}</span>
                //                     <Tooltip title={users_arr.slice(max_num_of_users).join(',')}>
                //                         <span className='blue'>
                //                             {'+' + (users_arr.length - max_num_of_users)}
                //                         </span>
                //                     </Tooltip>
                //                 </div>
                //                                     : 
                //                 users
                //             }</span> */}
                // // </div> 
                // },
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
            title={t('组 {{group}} 成员管理', { group: current?.name })}
            onOk={async () => model.execute(async () => {
                const origin_users = await access.get_users_by_group(current?.name)
                const delete_users = origin_users.filter(u => !target_users.includes(u))
                const add_users = target_users.filter((u: string) => !origin_users.includes(u))
                if (delete_users.length || add_users.length) {
                    await Promise.all([access.delete_group_member(delete_users, current?.name),
                        access.add_group_member(add_users, current?.name)                    
                    ])
                    model.message.success(t('成员修改成功'))
                }
                editor.close()
                set_selected_users([ ])
                set_target_users([ ])
                await access.get_group_list()
            })}
            
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
                <Button danger icon={<DeleteOutlined />} onClick={deletor.open}>
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
                users:  <Select
                    mode='tags'
                    className='group-select'
                    // allowClear
                    tagRender={tagRender}
                    key={group.users}
                    placeholder={t('请选择想要添加的用户')}
                    defaultValue={group.users.split(',')}
                    onDeselect={async user => model.execute(async () => { await access.delete_group_member(user, group.groupName) })}
                    onSelect={async user => model.execute(async () => { await access.add_group_member(user, group.groupName) })}
                    options={users.map(user => ({ label: user, value: user }))}
                />,
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
