import { t } from '../../../i18n/index.js'


export const LIKE = 7
export const NOT_LIKE = 8
export const IN = 9
export const NOT_IN = 10

export const VALID_DATA_TYPES = ['BOOL', 'CHAR', 'SHORT', 'INT', 'LONG', 'DATE', 'MONTH', 'TIME', 'MINUTE', 'SECOND', 'DATETIME',
    'TIMESTAMP', 'NANOTIME', 'NANOTIMESTAMP', 'FLOAT', 'DOUBLE', 'SYMBOL', 'STRING', 'DECIMAL32', 'DECIMAL64', 'DECIMAL128', 'DATEHOUR']

export const TIME_TYPES = [ 'DATE', 'MONTH', 'TIME', 'MINUTE', 'SECOND', 'DATETIME',
'TIMESTAMP', 'NANOTIME', 'NANOTIMESTAMP', 'DATEHOUR']
    

export const STRING_TYPES = ['STRING', 'SYMBOL']
export const VALUE_OPERATIONS = [
    {
        label: t('等于 (=)'),
        value: 1
    },
    {
        label: t('不等于 (!=)'),
        value: 2
    },
    {
        label: t('大于 (>)'),
        value: 3
    },
    {
        label: t('小于 (<)'),
        value: 4
    },
    {
        label: t('大于等于 (>=)'),
        value: 5
    },
    {
        label: t('小于等于 (<=)'),
        value: 6
    }, 
] 


export const STRING_OPERATIONS = [
    {
        label: t('等于 (=)'),
        value: 1
    },
    {
        label: t('不等于 (!=)'),
        value: 2
    },
    {
        label: t('匹配 (like)'),
        value: LIKE
    },
    {
        label: t('不匹配 (not like)'),
        value: NOT_LIKE
    },
    {
        label: t('包含 (in)'),
        value: IN
    },
    {
        label: t('不包含 (not in)'),
        value: NOT_IN
    }
]

export const OTHER_OPERATIONS = [
    {
        label: t('等于 (=)'),
        value: 1
    },
    {
        label: t('不等于 (!=)'),
        value: 2
    },
]


export const VALUE_TYPES = ['INT', 'SHORT', 'DOUBLE', 'FLOAT', 'LONG']

