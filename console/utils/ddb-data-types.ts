import { DDBTypeNames } from '../constants/column-data-types.js'

export function isDDBTemporalType (type: DDBTypeNames) {
    return [
        'date',
        'month',
        'time',
        'minute',
        'second',
        'datetime',
        'timestamp',
        'nanotime',
        'nanotimestamp'
    ].includes(type)
}
