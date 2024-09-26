import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal } from 'antd'

import { useState } from 'react'

import { InspectionForm } from './inspectionForm.tsx'
import type { Plan } from './type.ts'

export function EditInspectionModal ({ 
    plan, 
    mutate_plans,
    disabled = false 
}: 
{ 
    plan: Plan 
    mutate_plans: ( ) => void 
    disabled?: boolean
}) {
            
    return <div
        className='edit-inspection-modal'       
    >
        <InspectionForm
            refresh={mutate_plans}
            plan={plan}
            disabled={disabled}
        />
    </div>
}
