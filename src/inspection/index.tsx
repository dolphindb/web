import './index.sass'

import { useRoutes } from 'react-router-dom'

import { ReportDetailPage } from '@/inspection/pages/ReportDetailPage.tsx'
import { EditInspectionPage } from '@/inspection/pages/EditInspectionPage.tsx'
import { AddInspectionPage } from '@/inspection/pages/AddInspectionPage.tsx'
import { InspectionListPage } from '@/inspection/pages/InspectionListPage.tsx'
import { wrapWithGuard } from '@/inspection/components/InspectionGuard.tsx'

export const Inspection = () => {    
    const routes = useRoutes([
        {
            index: true,
            element: <InspectionListPage />
        },
        {
            path: 'report/:reportId',
            element: <ReportDetailPage />
        },
        {
            path: 'plan/:planId',
            element: <EditInspectionPage />
        },
        {
            path: 'plan/new',
            element: <AddInspectionPage />
        }
    ])
    
    return wrapWithGuard(routes)
}
