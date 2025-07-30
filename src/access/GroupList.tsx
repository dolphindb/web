import './index.sass'

import { useCallback, useMemo, useState } from 'react'

import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Typography, type TableColumnType } from 'antd'


import NiceModal from '@ebay/nice-modal-react'

import { t, language } from '@i18n'

import useSWR from 'swr'

import { model } from '@model'

import { TableOperations } from '@/components/TableOperations/index.tsx'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { DDBTag } from '@/components/tags/index.tsx'

import { RefreshButton } from '@/components/RefreshButton/index.tsx'

import { access } from './model.ts'
import { GroupCreateModal } from './components/group/GroupCreateModal.tsx'
import { GroupUserEditModal } from './components/group/GroupUserEditModal.tsx'
import { use_groups } from './hooks/use-groups.ts'

export function GroupList () {
    
    const { data: groups, mutate: mutate_groups } = use_groups()
    
    const { data: groups_info, mutate: mutate_groups_info } = useSWR(
        ['groups/access', groups], 
        async ([, groups]) => {
            if (groups)
                return access.get_group_access(groups)
        }
    )
    
    const [search_key, set_search_key] = useState('')
    
    const [selected_groups, set_selected_groups] = useState([ ])
    
    
    const reset_selected_groups = useCallback(() => { set_selected_groups([ ]) }, [ ])
    
    
    const cols: TableColumnType<Record<string, any>>[] = useMemo(
        () => [
            {
                title: t('组名'),
                dataIndex: 'group_name',
                key: 'group_name',
                width: 200
            },
            {
                title: t('组成员'),
                dataIndex: 'users',
                key: 'users'
            },
            {
                title: t('操作'),
                dataIndex: 'actions',
                key: 'actions',
                width: language === 'zh' ? 300 : 400
            }
        ],
        [ ]
    )
    
    return <>
       {groups_info && <DDBTable
            title={t('组管理')}
            big_title
            rowSelection={{
                selectedRowKeys: selected_groups,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_groups(selectedRowKeys)
                }
            }}
            pagination={{ hideOnSinglePage: true, size: 'small' }}
            columns={cols}
            filter_form={<Input
                className='search'
                value={search_key}
                prefix={<SearchOutlined />}
                onChange={e => {
                    set_search_key(e.target.value)
                }}
                placeholder={t('请输入想要搜索的组')}
            />}
            buttons={<>
                <Button type='primary' icon={<PlusOutlined />} onClick={async () => NiceModal.show(GroupCreateModal)}>
                    {t('新建组')}
                </Button>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={!selected_groups.length}
                    onClick={() => {
                        model.modal.confirm({
                            title: t('确认删除选中的 {{num}} 个组吗？', { num: selected_groups.length }),
                            okButtonProps: { danger: true },
                            onOk: async () => {
                                await Promise.all(selected_groups.map(async group => access.delete_group(group)))
                                model.message.success(t('组删除成功'))
                                reset_selected_groups()
                                mutate_groups()
                            }
                        })
                    }}
                >
                    {t('批量删除')}
                </Button>
                <RefreshButton  
                    onClick={async () => {
                    await mutate_groups()
                    await mutate_groups_info()
                    model.message.success(t('刷新成功'))
                }} />
            </>}
            dataSource={groups_info
                .filter(({ groupName }) => groupName.toLowerCase().includes(search_key.toLowerCase()))
                .map(group => ({
                    key: group.groupName,
                    group_name: group.groupName,
                    users: (
                        <div>
                            {group.users &&
                                group.users.split(',').filter(name => name !== 'admin').map((user: string) => <DDBTag key={user}>
                                    {user}
                                </DDBTag>)}
                        </div>
                    ),
                    actions: (
                        <TableOperations>
                            <Typography.Link
                                onClick={() => {
                                    model.goto(`/access/group/${group.groupName}`)
                                }}
                            >
                                {t('查看权限')}
                            </Typography.Link>
                            
                            <Typography.Link
                            
                                onClick={() => {
                                    model.goto(`/access/group/${group.groupName}/edit`)
                                }}
                            >
                                {t('设置权限')}
                            </Typography.Link>
                            
                            <Typography.Link
                             
                                onClick={async () => {
                                    NiceModal.show(GroupUserEditModal, { groupname: group.groupName })
                                }}
                            >
                                {t('管理成员')}
                            </Typography.Link>
                            
                            <Popconfirm
                                title={t('删除组')}
                                description={t('确认删除组 {{group}} 吗', { group: group.groupName })}
                                okButtonProps={{ danger: true, type: 'primary' }}
                                onConfirm={async () => {
                                    await access.delete_group(group.groupName)
                                    model.message.success(t('组删除成功'))
                                    await mutate_groups()
                                }}
                            >
                                <Typography.Link type='danger'>
                                    {t('删除')}
                                </Typography.Link>
                            </Popconfirm>
                        </TableOperations>
                    )
                }))}
            tableLayout='fixed'
        />}
    </>
}
