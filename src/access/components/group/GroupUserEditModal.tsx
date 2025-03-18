import NiceModal, { useModal } from '@ebay/nice-modal-react'
import useSWR, { useSWRConfig } from 'swr'
import { t } from '@i18n'

import { access } from '@/access/model.ts'
import { model } from '@model'
import { use_users } from '@/access/hooks/use-users.ts'
import { TransferModal } from '@/access/components/access/TransferModal.tsx'

export const GroupUserEditModal = NiceModal.create(({ groupname }: { groupname: string }) => {
    const { mutate } = useSWRConfig()
    const { data: users = [ ], isLoading: users_loading } = use_users()
    const { data: group_users = [ ], isLoading: group_users_loading, mutate: mutate_group_users } = useSWR(['group/users', groupname], 
        async () => access.get_users_by_group(groupname))
    const modal = useModal()
        
    if (users_loading || group_users_loading)
        return null
    
    return <TransferModal
            visible={modal.visible}
            on_cancel={modal.hide}
            on_remove={modal.remove}
            title={t('组 {{group}} 成员管理', { group: groupname })}
            confirm_title={t('确认对组 {{group}} 进行以下改动吗？', { group: groupname })}
            data_source={users.map(user => ({
                key: user,
                title: user
            }))}
            original_keys={group_users}
            titles={[t('非组成员'), t('组成员')]}
            search_placeholder={t('请输入想查找的用户')}
            filter_items={items => items.filter(item => item !== 'admin')}
            on_save={async (delete_users, add_users) => {
                await Promise.all([
                    delete_users.length && access.delete_group_member(delete_users, groupname),
                    add_users.length && access.add_group_member(add_users, groupname)
                ].filter(Boolean))
                
                model.message.success(t('组成员修改成功'))
                await mutate_group_users()
                await mutate(key => Array.isArray(key) && key[0] === 'groups/access')
            }}
            
        />
})
