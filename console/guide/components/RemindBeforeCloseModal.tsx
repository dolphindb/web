import NiceModal from '@ebay/nice-modal-react'
import { Modal } from 'antd'

export const RemindBeforeCloseModal = NiceModal.create(() => { 
    return <Modal>
        离开此界面您当前的更改将会丢失，确定要离开吗？
    </Modal>
})
