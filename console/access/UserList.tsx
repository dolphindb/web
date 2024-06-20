import './index.sass'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { CheckCircleFilled, DeleteOutlined, MinusCircleFilled, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag, Tooltip, Transfer, type TableColumnType } from 'antd'

import { use_modal } from 'react-object-model/hooks.js'

import NiceModal from '@ebay/nice-modal-react'

import { t, language } from '../../i18n/index.js'

import { model } from '../model.js'

import { access } from './model.js'
import { UserCreateModal } from './components/user/UserCreateModal.js'
import { UserDeleteModal } from './components/user/UserDeleteModal.js'
import { ResetPasswordModal } from './components/user/ResetPasswordModal.js'
import { UserGroupEditModal } from './components/user/UserGroupEditModal.js'

export function UserList () {
    const { users } = access.use(['users'])
    
    const [users_info, set_users_info] = useState([ ])
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_users, set_selected_users] = useState([ ])
    
    const reset_selected = useCallback(() => { set_selected_users([ ]) }, [ ])
    
    useEffect(() => {
        (async () => {
            set_users_info(await access.get_user_access(users))
        })()
    }, [users])
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: t('用户名'),
                dataIndex: 'user_name',
                key: 'user_name',
                width: 200
            },
            {
                title: t('是否管理员'),
                align: 'center',
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
                onFilter: (is_admin: boolean, record) => users_info.find(({ userId }) => userId === record.user_name).isAdmin === is_admin
            },
            {
                title: t('所属组'),
                dataIndex: 'groups',
                key: 'groups'
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: 360
            }
        ],
        [users_info]
    )
    
    return <>
        <div className='header'>
            <div className='actions'>
                <Button type='primary' icon={<PlusOutlined />} onClick={async () => NiceModal.show(UserCreateModal)}>
                    {t('新建用户')}
                </Button>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        if (selected_users.length)
                            NiceModal.show(UserDeleteModal, { selected_users, reset_selected })
                    }}
                >
                    {t('批量删除')}
                </Button>
                <Button
                    type='default'
                    icon={<ReloadOutlined />}
                    onClick={async () => {
                        await access.get_user_list()
                        set_users_info(await access.get_user_access(users))
                        model.message.success(t('刷新成功'))
                    }}
                >
                    {t('刷新')}
                </Button>
                <Input
                    className='search'
                    value={search_key}
                    prefix={<SearchOutlined />}
                    onChange={e => {
                        set_search_key(e.target.value)
                    }}
                    placeholder={t('请输入想要搜索的用户')}
                />
            </div>
        </div>
        <Table
            rowSelection={{
                selectedRowKeys: selected_users,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_users(selectedRowKeys)
                }
            }}
            pagination={{ hideOnSinglePage: true, size: 'small' }}
            columns={cols}
            dataSource={users_info
                .filter(({ userId }) => userId.toLowerCase().includes(search_key.toLowerCase()))
                .map(current_user => ({
                    key: current_user.userId,
                    user_name: current_user.userId,
                    is_admin: current_user.isAdmin ? <CheckCircleFilled className='green' /> : <MinusCircleFilled className='gray' />,
                    groups: (
                        <div>
                            {current_user.groups &&
                                current_user.groups.split(',').map((group: string) => <Tag color='cyan' key={group}>
                                    {group}
                                </Tag>)}
                        </div>
                    ),
                    actions: (
                        <div className='actions'>
                            <Button
                                type='link'
                                onClick={() => {
                                    access.set({ current: { role: 'user', name: current_user.userId, view: 'preview' } })
                                }}
                            >
                                {t('查看权限')}
                            </Button>
                            
                            <Button
                                type='link'
                                onClick={() => {
                                    access.set({ current: { role: 'user', name: current_user.userId, view: 'manage' } })
                                }}
                            >
                                {t('设置权限')}
                            </Button>
                            
                            <Button
                                type='link'
                                onClick={async () => {
                                    access.set({ current: { name: current_user.userId } })
                                    await NiceModal.show(UserGroupEditModal, { userId: current_user.userId, set_users_info })
                                }}
                            >
                                {t('设置用户组')}
                            </Button>
                            
                            <Button
                                type='link'
                                onClick={async () => {
                                    access.set({ current: { name: current_user.userId } })
                                    await NiceModal.show(ResetPasswordModal)
                                }}
                            >
                                {t('设置密码')}
                            </Button>
                            
                            <Popconfirm
                                title={t('删除用户')}
                                description={t('确认删除用户 {{user}} 吗', { user: current_user.userId })}
                                onConfirm={async () => {
                                    await access.delete_user(current_user.userId)
                                    model.message.success(t('用户删除成功'))
                                    await access.get_user_list()
                                }}
                            >
                                <Button type='link' danger disabled={current_user.userId === localStorage.getItem('ddb.username')}>
                                    {t('删除')}
                                </Button>
                            </Popconfirm>
                        </div>
                    )
                }))}
        />
    </>
}
