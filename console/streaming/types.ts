export type Context = 'page' | 'webview' | 'window' | 'embed'

export interface ErrorType {
    appear: boolean
    msg: string
}
export interface ConfigType {
    url?: string
    table: string
    username: string
    password: string
}
export interface LineConfigType extends ConfigType {
    time_variable: string
    properties: Array<string>
    duration: number
    height?: number
    width?: number
}

export interface TableConfigType extends ConfigType {
    properties: Array<string>
    column?: number
    layout?: 'vertical' | 'horizontal'
}

export interface HeatMapConfigType extends ConfigType {
    properties: string[]
    max?: number
    min?: number
    sort?: 'ASC' | 'DESC'
    column?: number
}

export interface SortBarConfigType extends ConfigType {
    properties: string[]
    sort?: 'ASC' | 'DESC'
    animationDuration?: number
    height?: number
    width?: number
}

export interface KLineConfigType extends ConfigType {
    time_variable: string
    duration: number
    opening_price_variable: string
    closing_price_variable: string
    maximum_price_variable: string
    minimum_price_variable: string
    height?: number
    width?: number
}

export interface ScatterConfigType extends ConfigType {
    x_variable: string
    y_variable: string
    x_type?: 'TIMESTAMP' | 'NUMBER' | 'STRING'
    y_type?: 'NUMBER' | 'STRING'
    size_variable?: string
    color_variable?: string
    height?: number
    width?: number
}

// 定义折线图节点类型（必须要包含一个time属性）
export type LineNodeType = {
    time: number
    [key: string]: number | string
}
// 定义K线图节点类型
export type KLineNodeType = {
    time: number
    opening_price: number
    closing_price: number
    maximum_price: number
    minimum_price: number
}
