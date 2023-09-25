import { type JSXComponent } from '@formily/core'
import { OHLC, OhlcConfigForm } from './Charts/OHLC/index.js'
import { RichText } from './Charts/RichText/index.js'
import { WidgetChartType } from './model.js'
import { Chart, ChartConfigForm } from './Charts/Chart/index.js'
import { DBTable, DBTableConfigForm } from './Charts/Table/index.js'
import { DBDescriptions, DBDescriptionsForm } from './Charts/Descriptions/index.js'
import { Candlestick, CandleConfigForm } from './Charts/Candlestick/index.js'
import { Pie, PieConfigForm } from './Charts/PIE/index.js'

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
    [WidgetChartType.OHLC]: {
        component: OHLC,
        config: OhlcConfigForm
    },
    [WidgetChartType.CANDLE]: {
        component: Candlestick,
        config: CandleConfigForm
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
}
