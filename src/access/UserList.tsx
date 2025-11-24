import './index.sass'

import { useCallback, useMemo, useState } from 'react'

import { CheckCircleFilled, DeleteOutlined, MinusCircleFilled, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Typography, type TableColumnType } from 'antd'

import NiceModal from '@ebay/nice-modal-react'

import useSWR from 'swr'

import { language, t } from '@i18n'

import { model } from '@model'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { TableOperations } from '@components/TableOperations/index.tsx'

import { DDBTag } from '@components/tags/index.tsx'

import { RefreshButton } from '@components/RefreshButton/index.tsx'

import { access } from './model.ts'
import { UserCreateModal } from './components/user/UserCreateModal.tsx'
import { ResetPasswordModal } from './components/user/ResetPasswordModal.tsx'
import { UserGroupEditModal } from './components/user/UserGroupEditModal.tsx'
import { use_users } from './hooks/use-users.ts'

export function UserList () {
    const [search_key, set_search_key] = useState('')
    
    const [selected_users, set_selected_users] = useState([ ])
    
    const reset_selected = useCallback(() => { set_selected_users([ ]) }, [ ])
    
    const { data: users, mutate: mutate_users } = use_users()
    
    const { data: users_access, mutate: mutate_users_access } = useSWR(
        ['users/access', users], 
        async ([, users]) => {
            if (users)
                return access.get_user_access(users)
        }
    )
    
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
                onFilter: (is_admin: boolean, record) => users_access.find(({ userId }) => userId === record.user_name).isAdmin === is_admin
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
                width: language === 'en' ? 500 : 360
            }
        ],
        [users_access]
    )
    
    return <DDBTable
        buttons={
        <>
            <Button type='primary' icon={<PlusOutlined />} onClick={async () => NiceModal.show(UserCreateModal)}>
                {t('新建用户')}
            </Button>
            <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selected_users?.length}
                onClick={() => {
                    model.modal.confirm({
                        title: t('确认删除选中的 {{num}} 个用户吗？', { num: selected_users.length }),
                        okButtonProps: { danger: true },
                        onOk: async () => {
                            await Promise.all(selected_users.map(async user => access.delete_user(user)))
                            model.message.success(t('用户删除成功'))
                            reset_selected()
                            mutate_users()
                        }
                    })
                }}
            >
                {t('批量删除')}
            </Button>
            <RefreshButton
                onClick={async () => {
                    await mutate_users()
                    await mutate_users_access()
                    model.message.success(t('刷新成功'))
                }}
             />
        </>
        }
        filter_form={<Input
            className='search'
            value={search_key}
            prefix={<SearchOutlined />}
            onChange={e => {
                set_search_key(e.target.value)
            }}
            placeholder={t('请输入想要搜索的用户')}
        />}
        title={t('用户管理')}
        big_title
        rowSelection={{
            selectedRowKeys: selected_users,
            onChange: (selectedRowKeys: React.Key[]) => {
                set_selected_users(selectedRowKeys)
            }
        }}
        pagination={{ hideOnSinglePage: true, size: 'small' }}
        columns={cols}
        dataSource={users_access
            ?.filter(({ userId }) => userId.toLowerCase().includes(search_key.toLowerCase()))
            .map(current_user => ({
                key: current_user.userId,
                user_name: current_user.userId,
                is_admin: current_user.isAdmin ? <CheckCircleFilled className='green' /> : <MinusCircleFilled className='gray' />,
                groups: (
                    <div>
                        {current_user.groups &&
                            current_user.groups.split(',').map((group: string) => <DDBTag key={group}>
                                {group}
                            </DDBTag>)}
                    </div>
                ),
                actions: (
                    <TableOperations className='actions'>
                        <Typography.Link
                            onClick={() => { model.goto(`/access/user/${current_user.userId}`) }}
                        >
                            {t('查看权限')}
                        </Typography.Link>
                        
                        <Typography.Link
                            onClick={() => { model.goto(`/access/user/${current_user.userId}/edit`) }}
                        >
                            {t('设置权限')}
                        </Typography.Link>
                        
                        <Typography.Link
                            onClick={async () => 
                                NiceModal.show(UserGroupEditModal, { name: current_user.userId })
                            }
                        >
                            {t('设置用户组')}
                        </Typography.Link>
                        
                        <Typography.Link
                            onClick={async () =>
                                NiceModal.show(ResetPasswordModal, { name: current_user.userId })
                            }
                        >
                            {t('设置密码')}
                        </Typography.Link>
                        
                        <Popconfirm
                            title={t('删除用户')}
                            description={t('确认删除用户 {{user}} 吗', { user: current_user.userId })}
                            okButtonProps={{ type: 'primary', danger: true }}
                            onConfirm={async () => {
                                await access.delete_user(current_user.userId)
                                model.message.success(t('用户删除成功'))
                                mutate_users()
                            }}
                        >
                            <Typography.Link type='danger' disabled={current_user.userId === localStorage.getItem('ddb.username')}>
                                {t('删除')}
                            </Typography.Link>
                        </Popconfirm>
                    </TableOperations>
                )
            }))}
    />
}
