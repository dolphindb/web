import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Transfer } from 'antd'

import { useEffect, useState } from 'react'

import { t } from '@i18n/index.js'

import { access } from '@/access/model.js'


import { GroupUserConfirmModal } from './GroupUserConfirmModal.js'

export const GroupUserEditModal = NiceModal.create(({ groupname }: { groupname: string }) => {

    const { users } = access.use(['users'])
    
    const modal = useModal() 
    
    const [target_users, set_target_users] = useState<string[]>([ ])
    
    const [selected_users, set_selected_users] = useState<string[]>([ ])
    
    useEffect(() => {
        (async () => {
            set_target_users(
                (await access.get_users_by_group(groupname))
                    .filter(name => name !== 'admin'))
        })()
    }, [groupname])
    
    return <Modal
            className='edit-group-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            title={<div>{t('组 {{group}} 成员管理', { group: groupname })}</div>}
            onOk={async () => {
                await NiceModal.show(GroupUserConfirmModal, {
                    name: groupname,
                    edit_close: modal.hide,
                    target_users,
                    set_target_users,
                    set_selected_users,
                })
            }}
            okText={t('预览修改')}
        >
            <Transfer
                dataSource={users.map(user => ({
                    key: user,
                    title: user
                }))}
                titles={[t('非组成员'), t('组成员')]}
                showSearch
                locale={{ itemUnit: t('个'), itemsUnit: t('个'), searchPlaceholder: t('请输入想查找的用户') }}
                filterOption={(val, user) => user.title.includes(val)}
                targetKeys={target_users}
                selectedKeys={selected_users}
                onChange={keys => { set_target_users(keys as string[]) }}
                onSelectChange={(s, t) => {
                    set_selected_users([...s, ...t] as string[])
                }}
                render={item => item.title}
            />
        </Modal>
})
