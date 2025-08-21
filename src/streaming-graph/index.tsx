import 'reactflow/dist/style.css'
import './index.sass'

import { useRoutes } from 'react-router'

import { Table } from './Table.tsx'
import { Graph } from './Graph.tsx'


export function StreamingGraph () {
    return useRoutes([
        {
            index: true,
            element: <Table />,
        },
        {
            path: ':name/',
            element: <Graph />
        }
    ])
}
