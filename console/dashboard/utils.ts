import { DdbObj, formati, DdbVectorValue } from 'dolphindb'

export function formatter (obj: DdbObj<DdbVectorValue>, max_line: number): { name: string, data: Array<string> } {
    let length = obj.rows
    let result = {
        name: obj.name,
        data: [ ]
    }
    for (let i = 1;  i <= max_line && i <= length;  i++) 
        result.data.unshift(formati(obj, length - i))
    return result
}
