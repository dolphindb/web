import { DdbType } from 'dolphindb'

export const DDB_TYPE_MAP = {
    [DdbType.blob]: 'BLOB',
    [DdbType.bool]: 'BOOL',
    [DdbType.char]: 'CHAR',
    [DdbType.int]: 'INT',
    [DdbType.long]: 'LONG',
    [DdbType.date]: 'DATE',
    [DdbType.month]: 'MONTH',
    [DdbType.time]: 'TIME',
    [DdbType.minute]: 'MINUTE',
    [DdbType.second]: 'SECOND',
    [DdbType.datetime]: 'DATETIME',
}
