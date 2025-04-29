import type { FormInstance } from 'antd'

import { WidgetChartType, type Widget } from './model.ts'
import type { DataSource } from './DataSource/date-source.ts'

import { OHLC, OhlcConfigForm } from './Charts/OHLC/index.tsx'
import { RichText } from './Charts/RichText/index.tsx'
import { Chart, ChartConfigForm } from './Charts/Chart/index.tsx'
import { DBTable, DBTableConfigForm } from './Charts/Table/index.tsx'
import { DBDescriptions, DBDescriptionsForm } from './Charts/Descriptions/index.tsx'
import { Pie, PieConfigForm } from './Charts/Pie/index.tsx'
import { Radar, RadarConfigForm } from './Charts/Radar/index.tsx'
import { OrderBook, OrderConfigForm } from './Charts/OrderBook/index.tsx'
import { DashboardEditor as Editor, EditorConfigForm } from './Charts/DashboardEditor/index.tsx'
import { Gauge, GaugeConfigForm } from './Charts/Gauge/index.tsx'
import { Variables } from './Charts/Variables/index.tsx'
import { HeatMap, HeatMapConfigForm } from './Charts/HeatMap/index.tsx'
import { BasicFormFields } from './ChartFormFields/BasicFormFields.tsx'
import { CompositeChart } from './Charts/CompositeGraph/index.tsx'
import { CompositeChartConfig } from './Charts/CompositeGraph/CompositeChartConfig.tsx'
import { Configuration, ConfigurationConfig } from './Charts/Configuration/index.tsx'


export const graphs: {
    [key in WidgetChartType]?: {
        component: React.FC<GraphComponentProps>
        config?: React.FC<GraphConfigProps>
    }
} =  {
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
    [WidgetChartType.RADAR]: {
        component: Radar,
        config: RadarConfigForm
    },
    [WidgetChartType.VARIABLE]: {
        component: Variables,
        config: BasicFormFields
    },
    [WidgetChartType.SCATTER]: {
        component: Chart,
        config: ChartConfigForm
    },
    [WidgetChartType.HEATMAP]: {
        component: HeatMap,
        config: HeatMapConfigForm
    },
    [WidgetChartType.COMPOSITE_GRAPH]: {
        component: CompositeChart,
        config: CompositeChartConfig
    },
    [WidgetChartType.CONFIGURATION]: {
        component: Configuration,
        config: ConfigurationConfig
    }
}


export interface GraphComponentProps <TData = any> {
    widget: Widget
    data_source: DataSource<TData>
}


export interface GraphConfigProps <TFields = any, TData = any> {
    widget: Widget
    data_source: DataSource<TData>
    form: FormInstance<TFields>
}

