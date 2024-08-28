import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal } from 'antd'

import { InspectionForm } from './inspectionForm.tsx'

export const addInspectionModal = NiceModal.create(() => {
        
    const modal = useModal()   
    return <Modal
        className='add-inspection-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('添加巡检计划')}
        okText={t('确定')}
        cancelText={t('取消')}
    >
        <InspectionForm/>
    </Modal>
})
