import NiceModal, { useModal } from '@ebay/nice-modal-react'
import useSWR, { useSWRConfig } from 'swr'
import { t } from '@i18n/index.ts'

import { access } from '@/access/model.ts'
import { model } from '@/model.ts'
import { TransferModal } from '@/access/components/access/TransferModal.tsx'


export const UserGroupEditModal = NiceModal.create(({ name }: { name: string }) => {
    const { mutate } = useSWRConfig()
    const { data: groups = [ ], isLoading: groups_loading } = useSWR('groups', async () => access.get_group_list())
    const { data: userGroups, isLoading: user_groups_loading, mutate: mutate_user_groups } = useSWR(['user/groups', name], 
        async () => access.get_user_access([name]))
    
    const original_groups = userGroups?.[0].groups.split(',').filter(Boolean) ?? [ ]
    
    const modal = useModal()
    
    if (groups_loading || user_groups_loading)
        return null
    
    return <TransferModal
            visible={modal.visible}
            on_cancel={modal.hide}
            on_remove={modal.remove}
            title={t('用户 {{user}} 所属组管理', { user: name })}
            confirm_title={t('确认对用户 {{user}} 进行以下改动吗？', { user: name })}
            data_source={groups.map(group => ({
                key: group,
                title: group
            }))}
            original_keys={original_groups}
            titles={[t('未所属组'), t('所属组')]}
            search_placeholder={t('请输入想查找的组')}
            on_save={async (delete_groups, add_groups) => {
                await Promise.all([
                    delete_groups.length && access.delete_group_member(name, delete_groups),
                    add_groups.length && access.add_group_member(name, add_groups)
                ].filter(Boolean))
                
                model.message.success(t('用户所属组修改成功'))
                await mutate_user_groups()
                await mutate(key => Array.isArray(key) && key[0] === 'users/access')
            }}
        />
})
