import { type JSXComponent } from '@formily/core'
import { OHLC, OhlcConfigForm } from './Charts/OHLC/index.js'
import { RichText } from './Charts/RichText/index.js'
import { WidgetChartType } from './model.js'
import { Chart, ChartConfigForm } from './Charts/Chart/index.js'
import { DBTable, DBTableConfigForm } from './Charts/Table/index.js'
import { DBDescriptions, DBDescriptionsForm } from './Charts/Descriptions/index.js'
import { Pie, PieConfigForm } from './Charts/PIE/index.js'
import { OrderBook, OrderConfigForm } from './Charts/OrderBook/index.js'
import { DashboardEditor as Editor, EditorConfigForm } from './Charts/DashboardEditor/index.js'
import { Gauge, GaugeConfigForm } from './Charts/Gauge/index.js'
import { Variables, VariablesConfigForm } from './Charts/Variables/index.js'
import { Scatter, ScatterConfigForm } from './Charts/Scatter/index.js'

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
    [WidgetChartType.MIX]: {
        component: Chart,
        config: ChartConfigForm
    },
    [WidgetChartType.BAR]: {
        component: Chart,
        config: ChartConfigForm
    },
    [WidgetChartType.ORDER]: {
        component: OrderBook,
        config: OrderConfigForm
    },
    [WidgetChartType.OHLC]: {
        component: OHLC,
        config: OhlcConfigForm
    },
    [WidgetChartType.TEXT]: {
        component: RichText,
    },
    [WidgetChartType.DESCRIPTIONS]: {
        component: DBDescriptions,
        config: DBDescriptionsForm
    },
    [WidgetChartType.PIE]: {
        component: Pie,
        config: PieConfigForm
    },
    [WidgetChartType.EDITOR]: {
        component: Editor,
        config: EditorConfigForm
    },
    [WidgetChartType.GAUGE]: {
        component: Gauge,
        config: GaugeConfigForm
    },
    [WidgetChartType.VARIABLE]: {
        component: Variables,
        config: VariablesConfigForm
    },
    [WidgetChartType.SCATTER]: {
        component: Scatter,
        config: ScatterConfigForm
    }
}
