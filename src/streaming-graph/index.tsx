import 'reactflow/dist/style.css'
import './index.sass'

import { useRoutes } from 'react-router'

import { Detail } from './Detail.tsx'

import { JobTable } from './JobTable.tsx'


export function StreamingGraph () {
    return useRoutes([
        {
            index: true,
            element: <JobTable />,
        },
        {
            path: ':id',
            element: <Detail />
        }
    ])
}
