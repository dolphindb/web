import { JSXComponent } from '@formily/core'
import { GraphType } from './graph-types.js'
import DBTable, { DBTableConfigForm } from './Charts/Table.js'
import Chart, { ChartConfigForm } from './Charts/Chart.js'

type GraphConfig =  { 
    [key in GraphType]: {
        component: JSXComponent
        config: JSXComponent
    }
}

export const graph_config: GraphConfig =  { 
    [GraphType.TABLE]: {
        component: DBTable,
        config:  DBTableConfigForm
    },
    [GraphType.LINE]: {
        component: Chart,
        config: ChartConfigForm
    },
    [GraphType.BAR]: {
        component: Chart,
        config: ChartConfigForm
    }
}
