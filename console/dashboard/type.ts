import { AxisType, ILineType, Position } from './ChartFormFields/type.js'

export interface AxisConfig { 
    name: string
    type: AxisType
    // 时间轴与泪目轴特有
    col_name: string
    position?: Position
    offset?: number
    // 对数轴特有
    log_base?: number
}

export interface ISeriesConfig {
    col_name: string
    name: string
    yAxisIndex: number
    mark_point?: Array<'max' | 'min'>
    mark_line?: string[]
    line_type: ILineType
    // OHLC 特殊列
    open?: string
    high?: string
    low?: string
    close?: string
}

export interface IChartConfig {
    title?: string
    x_datazoom: boolean
    y_datazoom: boolean
    with_split_line: boolean
    with_tooltip: boolean
    with_legend: boolean
    xAxis: AxisConfig
    yAxis: AxisConfig[]
    series: ISeriesConfig[]
}

export interface ITableConfig { 
    title?: string
    bordered: boolean
    show_cols: string[]
    col_mappings: { 
        original_col: string
        mapping_name: string
    }[]
    pagination: {
        show: boolean
        pagesize: number
    }
    value_format?: {
        cols: string[]
        decimal_places: number
    }
    need_select_cols: boolean
}


export interface ITextConfig {
    value: string
}
