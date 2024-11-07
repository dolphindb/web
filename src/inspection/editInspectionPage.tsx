import { useParams, useSearchParams } from 'react-router-dom'

import useSWR from 'swr'

import { InspectionForm } from './inspectionForm.tsx'
import { inspection } from './model.tsx'

export function EditInspectionPage () {
    
    const [searchParams] = useSearchParams()
    
    const disabled = searchParams.get('disabled') === '1'
    const { planId } = useParams()
    
    const { data: plan } = useSWR(
        ['get_plan', planId], 
        async () => inspection.get_plan(planId),
    )
    
    return <div
        className='edit-inspection'       
    >
        <InspectionForm plan={plan} disabled={disabled} />
    </div>
}
