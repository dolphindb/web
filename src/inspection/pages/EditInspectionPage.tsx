import { useParams, useSearchParams } from 'react-router'

import useSWR from 'swr'

import { InspectionForm } from '@/inspection/components/InspectionForm.tsx'
import { inspection } from '@/inspection/model.ts'

export function EditInspectionPage () {
    
    const [search_params] = useSearchParams()
    
    const disabled = search_params.get('disabled') === '1'
    const { planId } = useParams()
    
    const { data: plan } = useSWR(
        ['get_plan', planId], 
        async () => inspection.get_plan(planId),
    )
    return <div className='edit-inspection'>
        {plan && <InspectionForm plan={plan} disabled={disabled} />}
    </div>
}
