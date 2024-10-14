import { InspectionForm } from './inspectionForm.tsx'
import type { Plan } from './type.ts'

export function EditInspectionModal ({ 
    plan, 
    refresher,
    disabled = false 
}: 
{ 
    plan: Plan 
    refresher: ( ) => void 
    disabled?: boolean
}) {
            
    return <div
        className='edit-inspection-modal'       
    >
        <InspectionForm
            refresh={refresher}
            plan={plan}
            disabled={disabled}
        />
    </div>
}
