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
    /** 数据源列名 */
    col_names: string[]
    /** 外层包了 Form.List，此字段需传入 field.name */
    name_path?: NamePath
    /** 外层包了 Form.List，此字段表示 Form.List 的 name  */
    list_name?: string
    /** 需要隐藏的表单项 */
    hidden_fields?: string[]
    need_col_name?: boolean
    /** 初始值 */
    initial_values?: {
        type?: AxisType
        name?: string
        col_name?: string
        time_format?: ITimeFormat
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
    MILLISECOND = 'HH:mm:ss.SSS',
    
    DAY_MINUTE = 'MM-DD HH:mm',
    
    DATE = 'YYYY-MM-DD',
    DATE_HOUR = 'YYYY-MM-DD HH',
    DATE_MINUTE = 'YYYY-MM-DD HH:mm',
    DATE_SECOND = 'YYYY-MM-DD HH:mm:ss',
    
    DATE_MILLISECOND = 'YYYY-MM-DD HH:mm:ss.SSS'
   
}


export enum ChartField { 
    LEGEND = 'legend',
    TOOLTIP = 'tooltip',
    SPLIT_LINE = 'split_line',
    DATA_ZOOM = 'data_zoom'
}


export enum ThresholdType { 
    ABSOLUTE,
    PERCENTAGE
}


export enum ThresholdShowType { 
    NONE,
    FILLED_REGION,
    LINE
}
