import NiceModal, { useModal } from '@ebay/nice-modal-react'
import useSWR, { useSWRConfig } from 'swr'
import { t } from '@i18n/index.ts'

import { access } from '@/access/model.ts'
import { model } from '@/model.ts'
import { TransferModal } from '@/access/components/access/TransferModal.tsx'

export const UserGroupEditModal = NiceModal.create(({ name }: { name: string }) => {
    const { mutate } = useSWRConfig()
    const { data: groups = [ ], isLoading: groupsLoading } = useSWR('groups', async () => access.get_group_list())
    const { data: userGroups, isLoading: userGroupsLoading, mutate: mutateUserGroups } = useSWR(['user/groups', name], 
        async () => access.get_user_access([name]))
    
    const originalGroups = userGroups?.[0].groups.split(',').filter(Boolean) ?? [ ]
    
    const modal = useModal()
    
    if (groupsLoading || userGroupsLoading)
        return null
    
    return <TransferModal
            visible={modal.visible}
            onCancel={modal.hide}
            onRemove={modal.remove}
            title={t('用户 {{user}} 所属组管理', { user: name })}
            confirmTitle={t('确认对用户 {{user}} 进行以下改动吗？', { user: name })}
            dataSource={groups.map(group => ({
                key: group,
                title: group
            }))}
            originalKeys={originalGroups}
            titles={[t('未所属组'), t('所属组')]}
            searchPlaceholder={t('请输入想查找的组')}
            onSave={async (deleteGroups, addGroups) => {
                await Promise.all([
                    deleteGroups.length && access.delete_group_member(name, deleteGroups),
                    addGroups.length && access.add_group_member(name, addGroups)
                ].filter(Boolean))
                
                model.message.success(t('用户所属组修改成功'))
                await mutateUserGroups()
                await mutate(key => Array.isArray(key) && key[0] === 'users/access')
            }}
        />
})
