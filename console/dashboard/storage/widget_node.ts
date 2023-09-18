import { dataType } from './date-source-node'
import { GraphType } from '../graph-types'

export interface AxisConfig { 
    name: string
    type: 'category' | 'time' | 'value' | 'log'
    col_name: string
}

export interface ISeriesConfig {
    col_name: string
    name: string
}

export interface IChartConfig {
    title?: string
    x_datazoom: boolean
    y_datazoom: boolean
    with_tooltip: boolean
    with_legend: boolean
    xAxis: AxisConfig
    yAxis: AxisConfig[]
    series: ISeriesConfig[]
}

export type WidgetOption = {
    id: string
    /** 图表类型 */
    type: string
    /** 横轴坐标 */
    x: number
    /** 纵轴坐标 */
    y: number
    /** 宽度 */
    w: number
    /** 高度 */
    h: number
    /** 数据源 id */
    source_id?: string
    /** 更新图表方法 */
    update_graph?: (data: dataType) => void
    /** 图表配置 */
    config?: IChartConfig
}


export const widget_nodes: WidgetOption[] = [ ]
