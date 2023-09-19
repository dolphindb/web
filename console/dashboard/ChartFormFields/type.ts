import { NamePath } from 'antd/lib/form/interface'

export enum AxisType { 
    CATEGORY = 'category',
    LOG = 'log',
    VALUE = 'value',
    TIME = 'time'
}

export enum Position { 
    RIGHT = 'right',
    LEFT = 'left'
}

export interface IAxisItem { 
    name_path?: NamePath
    col_names: string[]
    list_name?: string
    initial_values?: {
        type?: AxisType
        name?: string
        col_name?: string
    }
}

export interface IYAxisItemValue { 
    type?: AxisType
    name?: string
    col_name?: string
    position?: 'left' | 'right'
    offset?: number
}
