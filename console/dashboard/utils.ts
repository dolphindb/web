import { NamePath } from 'antd/es/form/interface'
import { DdbObj, formati, DdbVectorValue } from 'dolphindb'
import { isNil } from 'lodash'
import { WidgetOption } from './storage/widget_node'

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


export function concat_name_path (...paths: NamePath[]): NamePath {
    return ([ ] as NamePath).concat(...paths.filter(p => !isNil(p)))
}
