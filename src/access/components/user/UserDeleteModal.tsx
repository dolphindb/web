import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { t } from '@i18n/index.js'

import { useSWRConfig } from 'swr'

import { access } from '@/access/model.js'
import { model } from '@/model.js'


export const UserDeleteModal = NiceModal.create(({ selected_users, reset_selected }: { selected_users: string[], reset_selected: () => void }) => {
    const modal = useModal()
    
    const { mutate } = useSWRConfig()
    
    return <Modal
            className='delete-user-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            okButtonProps={{ type: 'primary', danger: true }}
            onOk={async () => {
                await Promise.all(selected_users.map(async user => access.delete_user(user)))
                model.message.success(t('用户删除成功'))
                reset_selected()
                modal.hide()
                mutate('users')
            }}
            title={<Tooltip>{t('确认删除选中的 {{num}} 个用户吗？', { num: selected_users.length })}</Tooltip>}
        />
})
