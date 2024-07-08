import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { access } from '../../model.js'
import { model } from '../../../model.js'
import { t } from '../../../../i18n/index.js'

export const UserDeleteModal = NiceModal.create(({ selected_users, reset_selected }: { selected_users: string[], reset_selected: () => void }) => {
    const modal = useModal()
    
    return <Modal
            className='delete-user-modal'
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            onOk={async () => {
                await Promise.all(selected_users.map(async user => access.delete_user(user)))
                model.message.success(t('用户删除成功'))
                reset_selected()
                modal.hide()
                await access.get_user_list()
            }}
            title={<Tooltip>{t('确认删除选中的 {{num}} 个用户吗？', { num: selected_users.length })}</Tooltip>}
        />
})
