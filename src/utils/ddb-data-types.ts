import { type DDBColumnTypeNames } from '@/utils/index.ts'

export function isDDBTemporalType (type: DDBColumnTypeNames) {
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

export function isDDBDecimalType (type: DDBColumnTypeNames) {
    return [
        'DECIMAL32',
        'DECIMAL64',
        'DECIMAL128',
    ].includes(type)
}

interface GenerateDDBDataTypeLiteralOptions {
    type: DDBColumnTypeNames
    scale?: number
    arrayVector?: boolean
}

export function generateDDBDataTypeLiteral ({ type, scale = 0, arrayVector }: GenerateDDBDataTypeLiteralOptions) {
    let typeLiteral = isDDBDecimalType(type) ? `${type}(${scale})` : type
    
    if (arrayVector)
        typeLiteral = `${typeLiteral}[]`
    
    return typeLiteral
}
