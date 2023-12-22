import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal } from 'antd'
import { t } from '../../i18n/index.js'

export const BatchAddNodesModal = NiceModal.create(() => {
    const modal = useModal()
    return <Modal 
            open={modal.visible}
            onCancel={modal.hide}
            afterClose={modal.remove}
            title={t('批量新增节点')}>d</Modal>
})
