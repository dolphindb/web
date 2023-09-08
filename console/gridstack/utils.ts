import { DdbObj, formati, DdbVectorValue } from 'dolphindb'

export function formatter (obj: DdbObj<DdbVectorValue>): { name: string, data: Array<string> } {
    let length = obj.rows
    let result = {
        name: obj.name,
        data: [ ]
    }
    for (let i = 0;  i < length;  i++) 
        result.data.push(formati(obj, i))
    return result
}
