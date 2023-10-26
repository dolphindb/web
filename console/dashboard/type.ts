import { type ITimeFormat, type AxisType, type ILineType, type Position } from './ChartFormFields/type.js'

export interface AxisConfig { 
    name: string
    type: AxisType
    // 时间轴与类目轴特有
    col_name: string
    time_format?: string
    
    with_zero?: boolean
    
    
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
    end_label?: boolean
    
    symbol?: string
    symbol_size?: number
    
    // 颜色
    color?: string
    
    // OHLC 特殊列
    open?: string
    close?: string
    highest?: string
    lowest?: string
    kcolor?: string
    kcolor0?: string
    
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

export interface IColProperty { 
    col: string
    width?: number
    threshold?: number
    show: boolean
    color?: string
    background_color?: string
    with_value_format: boolean
    decimal_places?: number
    display_name?: string
    time_format?: ITimeFormat
    is_thousandth_place?: boolean
    align?: 'left' | 'center' | 'right'
    sort?: boolean
}
export interface ITableConfig {
    title?: string
    title_size?: number
    bordered: boolean
    col_properties: IColProperty[]
    pagination: {
        show: boolean
        pagesize: number
    }
    need_select_cols: boolean
    is_reverse?: boolean
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
    
    label_font_size?: number
    value_font_size?: number
    
    with_select?: boolean
    
    col_properties: Array<{
        name: string
        color: string
        threshold?: number
        decimal_places?: number
        is_thousandth_place?: boolean
        time_format?: string
    }>
    
}


export interface IOrderBookConfig {
    time_rate: number
    market_data_files_num: number
}


export interface IEditorConfig {
    title: string
    code: string
    button_text: string
}


export interface IGaugeConfig {
    title?: string
    max: number
    min: number
    title_size?: number
    
    axis_setting: Array<{
        threshold: number
        color: string
    }>
    
    data_setting: Array<{
        col: string
        name: string
        color: string
        title: {
            level: number
            vertical: number
        }
        
        value: {
            level: number
            vertical: number
        }
    }>
}

