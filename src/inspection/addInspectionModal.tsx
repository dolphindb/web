import { InspectionForm } from './inspectionForm.tsx'

export function addInspectionPage ({ refresh }: { refresh: ( ) => void }) {

    return <div
        className='add-inspection-modal'       
    >
        <InspectionForm refresh={refresh}/>
    </div>
}
