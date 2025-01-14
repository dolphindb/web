import NiceModal, { useModal } from '@ebay/nice-modal-react'
import useSWR, { useSWRConfig } from 'swr'
import { t } from '@i18n/index.ts'

import { access } from '@/access/model.ts'
import { model } from '@/model.ts'
import { use_users } from '@/access/hooks/use-users.ts'
import { TransferModal } from '@/access/components/access/TransferModal.tsx'

export const GroupUserEditModal = NiceModal.create(({ groupname }: { groupname: string }) => {
    const { mutate } = useSWRConfig()
    const { data: users = [ ], isLoading: usersLoading } = use_users()
    const { data: groupUsers = [ ], isLoading: groupUsersLoading, mutate: mutateGroupUsers } = useSWR(['group/users', groupname], 
        async () => access.get_users_by_group(groupname))
    const modal = useModal()
        
    if (usersLoading || groupUsersLoading)
        return null
    
    return <TransferModal
            visible={modal.visible}
            onCancel={modal.hide}
            onRemove={modal.remove}
            title={t('组 {{group}} 成员管理', { group: groupname })}
            confirmTitle={t('确认对组 {{group}} 进行以下改动吗？', { group: groupname })}
            dataSource={users.map(user => ({
                key: user,
                title: user
            }))}
            originalKeys={groupUsers}
            titles={[t('非组成员'), t('组成员')]}
            searchPlaceholder={t('请输入想查找的用户')}
            filterItems={items => items.filter(item => item !== 'admin')}
            onSave={async (deleteUsers, addUsers) => {
                await Promise.all([
                    deleteUsers.length && access.delete_group_member(deleteUsers, groupname),
                    addUsers.length && access.add_group_member(addUsers, groupname)
                ].filter(Boolean))
                
                model.message.success(t('组成员修改成功'))
                await mutateGroupUsers()
                await mutate(key => Array.isArray(key) && key[0] === 'groups/access')
            }}
            
        />
})
