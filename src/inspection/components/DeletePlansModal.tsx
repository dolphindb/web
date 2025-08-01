import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal } from 'antd'
import { t } from '@i18n'

import { model } from '@model'
 
import { inspection } from '@/inspection/model.ts'

export const DeletePlansModal = NiceModal.create(({ 
    ids,
    refresher,
    set_current_page
}: {
    ids: string[]
    refresher: () => void
    set_current_page: (page: number) => void
}) => {
    const modal = useModal()
    
    return <Modal
        className='delete-plans-modal'
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        okButtonProps={{ danger: true, type: 'primary' }}
        okText={t('删除')}
        onOk={async () => {
            await inspection.delete_plans(ids)
            model.message.success(t('批量删除成功'))
            set_current_page(1)
            refresher()
            modal.hide()
        }}
        title={t('确认删除选中的 {{num}} 个巡检方案吗？', { num: ids.length })}
    />
})
