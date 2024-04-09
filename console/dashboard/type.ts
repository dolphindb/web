import type { DdbType } from 'dolphindb'

import { type ITimeFormat, type AxisType, type ILineType, type Position, type ThresholdType, type ThresholdShowType } from './ChartFormFields/type.js'

export interface AxisConfig { 
    name: string
    fontsize?: number
    type: AxisType
    // 时间轴与类目轴特有
    col_name: string
    time_format?: string
    
    with_zero?: boolean
    
    data?: any[]
    
    
    position?: Position
    offset?: number
    // 对数轴特有
    log_base?: number
    
    range?: string[]
    max?: any
    min?: any
    
    interval?: number
}


export interface ISeriesConfig {
    type: string
    col_name: string
    name: string
    yAxisIndex: number
    mark_point?: Array<'max' | 'min'>
    mark_line?: string[]
    line_type?: ILineType
    // 线宽，仅折线图有
    line_width?: number
    /** 是否填充下方面积，仅折线图有 */
    is_filled?: boolean
    opacity?: number
    
    // 柱状图是否堆叠
    stack?: string
    end_label?: boolean
    end_label_formatter?: string
    data_source_id: string
    x_col_name: string
    
    
    
    // 阈值与配色
    threshold?: {
        value?: number
        low_color?: string
        high_color?: string
    }
    
    /** 热力图特有 */
    min?: number
    with_label?: boolean
    in_range?: {
        color: {
            low: string
            high: string
        }
    }
    
    
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
    
    // 雷达图 特殊列
    max?: number
}

export interface IThresholdConfig { 
    axis: number
    /** 0 代表 X 轴，1 代表 Y 轴 */
    axis_type: 0 | 1
    type: ThresholdType
    show_type: ThresholdShowType
    line_type?: ILineType
    line_width?: number
    values: Array<{
        color: string
        value: number
    }>
}

export interface IChartConfig {
    title?: string
    title_size?: number
    // 缩略轴
    x_datazoom: boolean
    y_datazoom: boolean
    animation?: boolean
    // 复合图支持此选项，自动画图模式
    automatic_mode?: boolean
    x_col_types: DdbType[]
    
    
    splitLine: {
        show: boolean
        lineStyle: {
            type: ILineType
            color: string
            width: number
        }
    }
    tooltip: {
        show: boolean
    }
    legend?: {
        show: boolean
        type: 'scroll' | 'plain'
        itemGap: number
        textStyle: {
            fontSize: number
            color: string
        }
        top: number | string
        bottom: number | string
        right: number | string
        left: number | string
    }
    // 是否增加数据过滤选择
    with_data_filter: boolean
    xAxis: AxisConfig
    yAxis: AxisConfig[]
    labels?: ISeriesConfig[]
    series: ISeriesConfig[]
    thresholds: IThresholdConfig[]
}

export interface IHeatMapChartConfig extends Omit<IChartConfig, 'yAxis'> { 
    yAxis: AxisConfig
}
export interface IColProperty { 
    col: string
    width?: number
    threshold?: number
    show: boolean
    color?: string
    background_color?: string
    font_size?: number
    with_value_format: boolean
    decimal_places?: number
    display_name?: string
    time_format?: ITimeFormat
    is_thousandth_place?: boolean
    align?: 'left' | 'center' | 'right'
    sorter?: boolean
    // multiple?: number
    
    header_style?: any
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
        high_to_threshold_color?: string
        low_to_threshold_color?: string
        decimal_places?: number
        is_thousandth_place?: boolean
        time_format?: string
    }>
    
}


export interface IOrderBookConfig extends Pick<IChartConfig, 'title' | 'title_size' | 'legend' | 'tooltip' | 'splitLine' > {
    time_rate: number
    market_data_files_num: number
    bar_color: string
    line_color: string
    with_tooltip: boolean
    with_split_line: boolean
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
    label_size?: number
    value_size?: number
    animation?: boolean
    split_number?: number
    value_precision?: number
    
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


export interface MatrixData {
    data: number[][]
    row_labels: string[]
    col_labels: string[]
}

export enum VariableMode { 
    SELECT = 'select',
    MULTI_SELECT = 'multi_select',
    TEXT = 'text',
    DATE = 'date'
}


export enum DashboardMode { 
    EDITING,
    PREVIEW
}
