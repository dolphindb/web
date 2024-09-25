import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal } from 'antd'

import { useState } from 'react'

import { InspectionForm } from './inspectionForm.tsx'
import type { Plan } from './type.ts'

export const EditInspectionModal = NiceModal.create((
{ 
    plan, 
    mutate_plans,
    disabled = false 
}: 
{ 
    plan: Plan 
    mutate_plans: ( ) => void 
    disabled?: boolean
}) => {
        
    const modal = useModal()   
    
    const [view_only, set_view_only] = useState(disabled)
    
    return <Modal
        className='edit-inspection-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={view_only ? t('查看巡检计划') : t('修改巡检计划')}
        okText={t('确定')}
        cancelText={t('取消')}
    >
        <InspectionForm
            close={modal.hide} 
            refresh={mutate_plans}
            plan={plan}
            view_only={view_only}
            set_view_only={set_view_only}
        />
    </Modal>
})
