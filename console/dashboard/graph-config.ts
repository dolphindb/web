import { JSXComponent } from '@formily/core'
import DBTable, { DBTableConfigForm } from './Charts/Table.js'
import Chart, { ChartConfigForm } from './Charts/Chart.js'
import { OHLC } from './Charts/OHLC/index.js'
import { WidgetChartType } from './model.js'

type GraphConfig =  { 
    [key in WidgetChartType]: {
        component: JSXComponent
        config: JSXComponent
    }
}

// @ts-ignore
export const graph_config: GraphConfig =  { 
    [WidgetChartType.TABLE]: {
        component: DBTable,
        config:  DBTableConfigForm
    },
    [WidgetChartType.LINE]: {
        component: Chart,
        config: ChartConfigForm
    },
    [WidgetChartType.BAR]: {
        component: Chart,
        config: ChartConfigForm
    },
    [WidgetChartType.OHLC]: {
        component: OHLC,
        config: ChartConfigForm
    }
}
