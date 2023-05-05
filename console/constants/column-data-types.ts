import { SelectProps } from 'antd'
import { DdbType } from 'dolphindb/browser.js'

export type DDBTypeNames = Uppercase<keyof typeof DdbType>

/**
 * 数据表的列数据类型
 */
export const DDB_COLUMN_DATA_TYPES: DDBTypeNames[] = [
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
    'IPADDR',
    'INT128',
    'BLOB',
    'COMPLEX',
    'POINT',
]

/**
 * 支持排序的列类型
 */
export const SUPPORT_SORT_COLUMN_TYPES: DDBTypeNames[] = [
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
    'NANOTIME',
    'NANOTIMESTAMP',
    'STRING',
    'SYMBOL',
]

export const DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS: SelectProps['options'] =
    DDB_COLUMN_DATA_TYPES.map(type => ({
        label: type,
        value: type,
    }))
