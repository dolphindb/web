import { useRoutes } from 'react-router'

import { StreamingGraphDetail } from './streamingGraphDetail.tsx'

import { JobTable } from './JobTable.tsx'

export function StreamingGraph () {
  const routes = useRoutes([
    {
      index: true,
      element: <JobTable />
    },
    {
      path: ':id',
      element: <StreamingGraphDetail />
    }
  ])
  
  return routes
}
