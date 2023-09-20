export interface AxisConfig { 
    name: string
    type: 'category' | 'time' | 'value' | 'log'
    col_name: string
    position?: 'left' | 'right'
    offset?: number
}

export interface ISeriesConfig {
    col_name: string
    name: string
    yAxisIndex: number
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
}
