import { DdbObj, formati, DdbVectorValue } from 'dolphindb'

export function formatter (obj: DdbObj<DdbVectorValue>) {
    let length = obj.rows
    let result = [ ]
    for (let i = 0;  i < length;  i++) 
        result.push(formati(obj, i))
    return result
}
