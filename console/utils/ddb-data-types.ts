import { SUPPORT_ARRAY_VECTOR_TYPES, type DDBColumnTypeNames } from '../constants/column-data-types.js'
import { model } from '../model.js'

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

export function isDDBArrayVectorSupportType (type: DDBColumnTypeNames) {
    return model.is_v2 && SUPPORT_ARRAY_VECTOR_TYPES.includes(type)
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
