import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Tooltip } from 'antd'

import { t } from '@i18n/index.js'

import { useSWRConfig } from 'swr'

import { access } from '@/access/model.js'
import { model } from '@/model.js'

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
    const { mutate } = useSWRConfig()
    return <Modal
        className='delete-user-modal'
        open={modal.visible}
        onCancel={modal.hide}
        okButtonProps={{ type: 'primary', danger: true }}
        onOk={async () => {
            await Promise.all(selected_groups.map(async group => access.delete_group(group)))
            model.message.success(t('组删除成功'))
            reset_selected_groups()
            modal.hide()
            await mutate('groups')
        }}
        title={<Tooltip>{t('确认删除选中的 {{num}} 个组吗？', { num: selected_groups.length })}</Tooltip>}
    />
})
