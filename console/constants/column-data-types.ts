import { type SelectProps } from 'antd'
import { type DdbType } from 'dolphindb/browser.js'

export type DDBColumnTypeNames = Uppercase<keyof typeof DdbType>

/** 数据表的列数据类型 */
export const DDB_COLUMN_DATA_TYPES: DDBColumnTypeNames[] = [
    'BOOL',
    'CHAR',
    'SHORT',
    'INT',
    'LONG',
    'DATE',
    'MONTH',
    'TIME',
    'MINUTE',
    'SECOND',
    'DATETIME',
    'TIMESTAMP',
    'NANOTIME',
    'NANOTIMESTAMP',
    'FLOAT',
    'DOUBLE',
    'SYMBOL',
    'STRING',
    'UUID',
    'DATEHOUR',
    'IPADDR',
    'INT128',
    'BLOB',
    'COMPLEX',
    'POINT',
    
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]

export const SUPPORT_ARRAY_VECTOR_TYPES: DDBColumnTypeNames[] = [
    'BOOL',
    'CHAR',
    'SHORT',
    'INT',
    'LONG',
    'DATE',
    'MONTH',
    'TIME',
    'MINUTE',
    'SECOND',
    'DATETIME',
    'TIMESTAMP',
    'NANOTIME',
    'NANOTIMESTAMP',
    'DATEHOUR',
    'FLOAT',
    'DOUBLE',
    'IPADDR',
    'UUID',
    'INT128',
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]

/** 支持排序的列类型 */
export const SUPPORT_SORT_COLUMN_TYPES: DDBColumnTypeNames[] = [
    'CHAR',
    'SHORT',
    'INT',
    'LONG',
    'DATE',
    'MONTH',
    'TIME',
    'MINUTE',
    'SECOND',
    'DATETIME',
    'TIMESTAMP',
    'NANOTIME',
    'NANOTIMESTAMP',
    'STRING',
    'SYMBOL',
    
    'DECIMAL32',
    'DECIMAL64',
    'DECIMAL128',
]

export const DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS: SelectProps['options'] =
    DDB_COLUMN_DATA_TYPES.map(type => ({
        label: type,
        value: type,
    }))
