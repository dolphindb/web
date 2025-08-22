import 'reactflow/dist/style.css'
import './index.sass'

import { useRoutes } from 'react-router'

import { List } from './List.tsx'
import { Graph } from './Graph.tsx'


export function StreamingGraph () {
    return useRoutes([
        {
            index: true,
            element: <List />,
        },
        {
            path: ':name/',
            element: <Graph />
        }
    ])
}
