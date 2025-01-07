import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Transfer } from 'antd'

import { useState } from 'react'

import useSWR from 'swr'

import { t } from '@i18n/index.js'

import { access } from '@/access/model.js'

import { UserGroupConfirmModal } from './UserGroupConfirmModal.js'

export const UserGroupEditModal = NiceModal.create(({ name }: { name: string }) => {
    const { groups } = access.use(['users', 'groups'])
        
    const [target_groups, set_target_groups] = useState<string[]>([ ])
    
    const [selected_groups, set_selected_groups] = useState<string[]>([ ])
    
    const modal = useModal() 
    
    useSWR(['user/groups', name], async () => access.get_user_access([name]), {
        onSuccess: data => {
            set_target_groups(data[0].groups.split(','))
        }
    })
    
    return <Modal
            className='edit-user-group-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            title={<div>{t('用户 {{user}} 所属组管理', { user: name })}</div>}
            onOk={async () => {
                NiceModal.show(UserGroupConfirmModal, {
                    edit_close: modal.hide,
                    target_groups,
                    set_target_groups,
                    set_selected_groups
                })
            }}
            okText={t('预览修改')}
        >
            <Transfer
                dataSource={groups.map(user => ({
                    key: user,
                    title: user
                }))}
                titles={[t('未所属组'), t('所属组')]}
                showSearch
                locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想查找的组') }}
                filterOption={(val, user) => user.title.includes(val)}
                targetKeys={target_groups}
                selectedKeys={selected_groups}
                onChange={keys => { set_target_groups(keys as string[]) }}
                onSelectChange={(s, t) => {
                    set_selected_groups([...s, ...t] as string[])
                }}
                render={item => item.title}
            />
        </Modal>
})
