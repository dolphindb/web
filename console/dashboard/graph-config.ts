import { JSXComponent } from '@formily/core'
import { GraphType } from './graph-types.js'
import DBTable, { DBTableConfigForm } from './Charts/Table.js'





type GraphConfig =  { 
    [key in GraphType]: {
        component: JSXComponent
        config_form_fields: JSXComponent
    }
}


// @ts-ignore
export const graph_config: GraphConfig =  { 
    [GraphType.TABLE]: {
        component: DBTable,
        config_form_fields:  DBTableConfigForm
    }
}
