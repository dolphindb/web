import { JSXComponent } from '@formily/core'
import OHLC, { OhlcConfigForm } from './Charts/OHLC/index.js'
import { RichText } from './Charts/RichText/index.js'
import { WidgetChartType } from './model.js'
import Chart, { ChartConfigForm } from './Charts/Chart/index.js'
import { DBTable, DBTableConfigForm } from './Charts/Table/index.js'

type GraphConfig =  { 
    [key in WidgetChartType]: {
        component: JSXComponent
        config?: JSXComponent
    }
}

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
        config: OhlcConfigForm
    },
    [WidgetChartType.TEXT]: {
        component: RichText,
    }
}
