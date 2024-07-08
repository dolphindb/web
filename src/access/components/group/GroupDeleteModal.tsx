import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { access } from '../../model.js'
import { model } from '../../../model.js'
import { t } from '../../../../i18n/index.js'

export const GroupDeleteModal = NiceModal.create((
    {
        selected_groups,
        reset_selected_groups
    }:
        {
            selected_groups: string[]
            reset_selected_groups: () => void
        }
) => {
    const modal = useModal()
    
    return <Modal
        className='delete-user-modal'
        open={modal.visible}
        onCancel={modal.hide}
        onOk={async () => {
            await Promise.all(selected_groups.map(async group => access.delete_group(group)))
            model.message.success(t('组删除成功'))
            reset_selected_groups()
            modal.hide()
            await access.get_group_list()
        }}
        title={<Tooltip>{t('确认删除选中的 {{num}} 个组吗？', { num: selected_groups.length })}</Tooltip>}
    />
})
