import { useRoutes } from 'react-router'

import { StreamingGraphDetail } from './StreamingGraphDetail.tsx'

import { JobTable } from './JobTable.tsx'


export function StreamingGraph () {
    return useRoutes([
        {
            index: true,
            element: <JobTable />,
        },
        {
            path: ':id',
            element: <StreamingGraphDetail />
        }
    ])
}
