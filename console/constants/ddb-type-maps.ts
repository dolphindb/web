import { DdbType } from 'dolphindb'

export const DDB_TYPE_MAP = {
    [DdbType.void]: 'VOID',
    [DdbType.bool]: 'BOOL',
    [DdbType.char]: 'CHAR',
    [DdbType.short]: 'SHORT',
    [DdbType.int]: 'INT',
    [DdbType.long]: 'LONG',
    [DdbType.compress]: 'COMPRESS',
    [DdbType.date]: 'DATE',
    [DdbType.month]: 'MONTH',
    [DdbType.time]: 'TIME',
    [DdbType.minute]: 'MINUTE',
    [DdbType.second]: 'SECOND',
    [DdbType.datetime]: 'DATETIME',
    [DdbType.timestamp]: 'TIMESTAMP',
    [DdbType.nanotime]: 'NANOTIME',
    [DdbType.nanotimestamp]: 'NANOTIMESTAMP',
    [DdbType.datehour]: 'DATEHOUR',
    [DdbType.float]: 'FLOAT',
    [DdbType.double]: 'DOUBLE',
    [DdbType.symbol]: 'SYMBOL',
    [DdbType.string]: 'STRING',
    [DdbType.blob]: 'BLOB',
    [DdbType.int128]: 'INT128',
    [DdbType.uuid]: 'UUID',
    [DdbType.ipaddr]: 'IPADDR',
    [DdbType.point]: 'POINT',
    [DdbType.functiondef]: 'FUNCTIONDEF',
    [DdbType.handle]: 'HANDLE',
    [DdbType.code]: 'CODE',
    [DdbType.datasource]: 'DATASOURCE',
    [DdbType.resource]: 'RESOURCE',
    [DdbType.duration]: 'DURATION',
    [DdbType.any]: 'ANY',
    // TODO: DdbType 中增加 any_dictionary 类型
    27: 'ANY DICTIONARY',
    [DdbType.complex]: 'COMPLEX',
    [DdbType.decimal32]: 'DECIMAL32(S)',
    [DdbType.decimal64]: 'DECIMAL64(S)',
    [DdbType.decimal128]: 'DECIMAL128(S)'
}