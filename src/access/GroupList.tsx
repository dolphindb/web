import './index.sass'

import { useCallback, useMemo, useState } from 'react'

import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Table, Tag, type TableColumnType } from 'antd'


import NiceModal from '@ebay/nice-modal-react'

import { t, language } from '@i18n/index.ts'

import useSWR from 'swr'

import { model } from '@/model.ts'

import { access } from './model.ts'
import { GroupCreateModal } from './components/group/GroupCreateModal.tsx'
import { GroupDeleteModal } from './components/group/GroupDeleteModal.tsx'
import { GroupUserEditModal } from './components/group/GroupUserEditModal.tsx'
import { use_groups } from './hooks/use-groups.ts'

export function GroupList () {
    
    const { data: groups, mutate: mutateGroups } = use_groups()
    
    const { data: groups_info, mutate: mutateGroupsInfo } = useSWR(
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
        <div className='header'>
            <div className='actions'>
                <Button type='primary' icon={<PlusOutlined />} onClick={async () => NiceModal.show(GroupCreateModal)}>
                    {t('新建组')}
                </Button>
                <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        if (selected_groups.length)
                            NiceModal.show(GroupDeleteModal, { selected_groups, reset_selected_groups })
                    }}
                >
                    {t('批量删除')}
                </Button>
                <Button type='default' icon={<ReloadOutlined />} onClick={async () => {
                    await mutateGroups()
                    await mutateGroupsInfo()
                    model.message.success(t('刷新成功'))
                }}>
                    {t('刷新')}
                </Button>
                <Input
                    className='search'
                    value={search_key}
                    prefix={<SearchOutlined />}
                    onChange={e => {
                        set_search_key(e.target.value)
                    }}
                    placeholder={t('请输入想要搜索的组')}
                />
            </div>
        </div>
        
       {groups_info && <Table
            rowSelection={{
                selectedRowKeys: selected_groups,
                onChange: (selectedRowKeys: React.Key[]) => {
                    set_selected_groups(selectedRowKeys)
                }
            }}
            pagination={{ hideOnSinglePage: true, size: 'small' }}
            columns={cols}
            dataSource={groups_info
                .filter(({ groupName }) => groupName.toLowerCase().includes(search_key.toLowerCase()))
                .map(group => ({
                    key: group.groupName,
                    group_name: group.groupName,
                    users: (
                        <div>
                            {group.users &&
                                group.users.split(',').filter(name => name !== 'admin').map((user: string) => <Tag color='cyan' key={user}>
                                    {user}
                                </Tag>)}
                        </div>
                    ),
                    actions: (
                        <div className='actions'>
                            <Button
                                type='link'
                                onClick={() => {
                                    model.goto(`/access/group/${group.groupName}`)
                                }}
                            >
                                {t('查看权限')}
                            </Button>
                            
                            <Button
                                type='link'
                                onClick={() => {
                                    model.goto(`/access/group/${group.groupName}/edit`)
                                }}
                            >
                                {t('设置权限')}
                            </Button>
                            
                            <Button
                                type='link'
                                onClick={async () => {
                                    NiceModal.show(GroupUserEditModal, { groupname: group.groupName })
                                }}
                            >
                                {t('管理成员')}
                            </Button>
                            
                            <Popconfirm
                                title={t('删除组')}
                                description={t('确认删除组 {{group}} 吗', { group: group.groupName })}
                                onConfirm={async () => {
                                    await access.delete_group(group.groupName)
                                    model.message.success(t('组删除成功'))
                                    mutateGroups()
                                }}
                            >
                                <Button type='link' danger>
                                    {t('删除')}
                                </Button>
                            </Popconfirm>
                        </div>
                    )
                }))}
            tableLayout='fixed'
        />}
    </>
}
