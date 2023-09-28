import { type AxisType, type ILineType, type IStackStrategy, type Position } from './ChartFormFields/type.js'

export interface AxisConfig { 
    name: string
    type: AxisType
    // 时间轴与类目轴特有
    col_name: string
    position?: Position
    offset?: number
    // 对数轴特有
    log_base?: number
}

export interface ISeriesConfig {
    type: string
    col_name: string
    name: string
    yAxisIndex: number
    mark_point?: Array<'max' | 'min'>
    mark_line?: string[]
    line_type: ILineType
    // 柱状图是否堆叠
    stack?: string
    stack_strategy?: IStackStrategy
    
    // 颜色
    color?: string
    
    // OHLC 特殊列
    open?: string
    high?: string
    low?: string
    close?: string
    value?: string
    limit?: string
    
}

export interface IChartConfig {
    title?: string
    title_size?: number
    // 缩略轴
    x_datazoom: boolean
    y_datazoom: boolean
    // 网格线
    with_split_line: boolean
    with_tooltip: boolean
    with_legend: boolean
    // 是否增加数据过滤选择
    with_data_filter: boolean
    xAxis: AxisConfig
    yAxis: AxisConfig[]
    series: ISeriesConfig[]
}

export interface ITableConfig { 
    title?: string
    title_size?: number
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


export interface IDescriptionsConfig { 
    title?: string
    title_size?: number
    label_col: string
    value_col: string
    column_num?: number
    value_colors: Array<{
        col: string
        color: string
    }>
}
