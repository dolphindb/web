import { SelectProps } from 'antd'
import { DdbType } from 'dolphindb/browser.js'

export const DDB_COLUMN_DATA_TYPES: Array<keyof typeof DdbType> = [
    'bool',
    'char',
    'short',
    'int',
    'long',
    'date',
    'month',
    'time',
    'minute',
    'second',
    'datetime',
    'timestamp',
    'nanotime',
    'nanotimestamp',
    'float',
    'double',
    'symbol',
    'string',
    'uuid',
    'ipaddr',
    'int128',
    'blob',
    'complex',
    'point',
]

export const DDB_COLUMN_DATA_TYPES_SELECT_OPTIONS: SelectProps['options'] = DDB_COLUMN_DATA_TYPES.map(type => ({ label: type.toLocaleUpperCase(), value: type }))
