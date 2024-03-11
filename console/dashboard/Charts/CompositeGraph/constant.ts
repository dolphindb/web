import { DdbType } from 'dolphindb/browser'

export const TIME_TYPES = [
    DdbType.date,
    DdbType.month,
    DdbType.time,
    DdbType.minute,
    DdbType.second,
    DdbType.datetime,
    DdbType.timestamp,
    DdbType.nanotime,
    DdbType.nanotimestamp,
    DdbType.datehour
]



export const VALUE_TYPES = [
    DdbType.short,
    DdbType.int,
    DdbType.long,
    DdbType.float,
    DdbType.double,
    DdbType.decimal32,
    DdbType.decimal64,
    DdbType.decimal128
]

