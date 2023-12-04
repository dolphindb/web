export const TIME_TYPES = ['DATE', 'DATETIME', 'TIMESTAMP', 'NANOTIMESTAMP']

export const ENUM_TYPES = ['STRING', 'SYMBOL', 'CHAR', 'INT']


export const BASIC_DATA_TYPES = ['BOOL', 'CHAR', 'SHORT', 'INT', 'LONG', 'DATE', 'MONTH', 'TIME', 'MINUTE', 'SECOND', 'DATETIME', 'TIMESTAMP', 'NANOTIME', 'NANOTIMESTAMP', 'FLOAT', 'DOUBLE', 'SYMBOL', 'STRING', 'UUID', 'ANY DICTIONARY', 'DATEHOUR', 'IPADDR', 'INT128', 'COMPLEX', 'POINT', 'DURATION', 'DECIMAL32', 'DECIMAL64', 'DECIMAL128']

export const ARRAY_VECTOR_DATA_TYPES = ['BOOL[]', 'CHAR[]', 'SHORT[]', 'INT[]', 'FLOAT[]', 'DOUBLE[]', 'LONG[]', 'DATE[]', 'MONTH[]', 'TIME[]',
'MINUTE[]', 'SECOND[]', 'DATETIME[]', 'TIMESTAMP[]', 'NANOTIME[]', 'NANOTIMESTAMP[]', 'DATEHOUR[]', 'DECIMAL32[]', 'DECIMAL64[]', 'DECIMAL128[]']


export const LOW_VERSION_DATA_TYPES = BASIC_DATA_TYPES.filter(item => !item.includes('DECIMAL'))
