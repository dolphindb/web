import { DDBTypeNames } from '../constants/column-data-types.js'

export function getDecimalScaleRange (decimalType: DDBTypeNames) {
    switch (decimalType) {
        case 'DECIMAL32':
            return [0, 9]
        case 'DECIMAL64':
            return [0, 18]
        // case 'DECIMAL128':
        //     return [0, 38]
        default:
            return null
    }
}

export function isAvailableDecimalScale (decimalType: DDBTypeNames, scale: number) {
    const range = getDecimalScaleRange(decimalType)
    
    if (range) 
        return scale >= range[0] && scale <= range[1]
    
    return false
}
