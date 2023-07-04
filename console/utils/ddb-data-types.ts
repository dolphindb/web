import { DDBTypeNames } from '../constants/column-data-types.js'

export function isDDBTemporalType (type: DDBTypeNames) {
    return [
        'DATE',
        'MONTH',
        'TIME',
        'MINUTE',
        'SECOND',
        'DATETIME',
        'TIMESTAMP',
        'NANOTIME',
        'NANOTIMESTAMP'
    ].includes(type)
}

export function isDDBDecimalType (type: DDBTypeNames) {
    return [
        'DECIMAL32',
        'DECIMAL64',
        'DECIMAL128',
    ].includes(type)
}

interface GenerateDDBDataTypeLiteralOptions {
    type: DDBTypeNames
    scale?: number
}

export function generateDDBDataTypeLiteral ({ type, scale = 0 }: GenerateDDBDataTypeLiteralOptions) {
    if (isDDBDecimalType(type)) 
        return `${type}(${scale})`
    return type
}
