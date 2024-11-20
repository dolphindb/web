import './index.sass'

import { useRoutes } from 'react-router-dom'

import { ReportDetailPage } from '@/inspection/pages/reportDetailPage.tsx'
import { EditInspectionPage } from '@/inspection/pages/editInspectionPage.tsx'
import { AddInspectionPage } from '@/inspection/pages/addInspectionPage.tsx'
import { InspectionListPage } from '@/inspection/pages/inspectionListPage.tsx'
import { wrapWithGuard } from '@/inspection/components/inspectionGuard.tsx'

export function Inspection () {
    return useRoutes([
        {
            index: true,
            element: wrapWithGuard(InspectionListPage),
        },
        {
            path: 'report/:reportId',
            element: wrapWithGuard(ReportDetailPage)
        },
        {
            path: 'plan/:planId',
            element: wrapWithGuard(EditInspectionPage)
        },
        {
            path: 'plan/new',
            element: wrapWithGuard(AddInspectionPage)
        }
    ])
}
