import type { NamePath } from 'antd/lib/form/interface'

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

export enum MarkPresetType { 
    MAX = 'max',
    MIN = 'min',
    AVERAGE = 'average'
}

export interface IAxisItem { 
    name_path?: NamePath
    col_names: string[]
    list_name?: string
    col?: boolean
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
    position?: Position
    offset?: number
}


export enum ILineType { 
    SOLID = 'solid',
    DASHED = 'dashed',
    DOTTED = 'dotted'
}


export enum ITimeFormat { 
    HOUR = 'HH',
    MINUTE = 'HH:mm',
    SECOND = 'HH:mm:ss',
    
    DATE = 'YYYY-MM-DD',
    DATE_HOUR = 'YYYY-MM-DD HH时',
    DATE_MINUTE = 'YYYY-MM-DD HH:mm',
    DATE_SECOND = 'YYYY-MM-DD HH:mm:ss',
   
}