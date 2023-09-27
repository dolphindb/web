import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { dashboard } from '../model.js'
import { type DataSource } from '../DataSource/date-source.js'
import { cloneDeep } from 'lodash'

export type VariablePropertyType = string | string[] | OptionType[]

export type OptionType = { label: string, value: string, key: string }

export class Variable extends Model<Variable>  {
    id: string
    name: string
    display_name: string
    mode = 'select'
    // deps: Set<string> = new Set()
    value = ''
    /** select 模式专用，可选的key*/
    options: OptionType[] = [ ]
    
    constructor (id: string, name: string, display_name: string) {
        super()
        this.id = id
        this.name = name
        this.display_name = display_name
    }
}

export function find_variable_index (id: string): number {
    return variables.findIndex(variable => variable.id === id)
} 

export function get_variable (id: string): Variable {
    return variables[find_variable_index(id)]
}

export async function save_variable ( new_variable: Variable, message = true) {
    const id = new_variable.id
    const variable = get_variable(id)
    
    variable.set({ ...new_variable })
    
    if (message)
        dashboard.message.success(`${variable.name} 保存成功！`)
}

export function delete_variable (key: string): number {
    const variable = get_variable(key)
    // if (variable.deps.size)
    //     dashboard.message.error('当前变量已被数据源使用无法删除')
    // else {
    //     const delete_index = find_variable_index(key)
    //     variables.splice(delete_index, 1)
    //     return delete_index
    // }
    const delete_index = find_variable_index(key)
    variables.splice(delete_index, 1)
    return delete_index
}

export function create_variable  (): { id: string, name: string, display_name: string } {
    const id = String(genid())
    const name = `var_${id.slice(0, 4)}`
    const display_name = name
    variables.unshift(new Variable(id, name, display_name))
    return { id, name, display_name }
}

export function rename_variable (key: string, new_name: string) {
    const variable = get_variable(key)
    
    if (
        (variables.findIndex(variable => variable.name === new_name) !== -1) 
        && new_name !== variable.name
    ) 
        throw new Error('该节点名已存在')
    else if (new_name.length > 10)
        throw new Error('节点名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('节点名不能为空')
    else
        variable.name = new_name
}

// export async function subscribe_variable (data_source: DataSource, variable_id: string) {
//     const variable = get_variable(variable_id)
    
//     variable.deps.add(data_source.id)
//     data_source.variables.add(variable.id)
// }

// export function unsubscribe_variable (data_source: DataSource, variable_id: string) {
//     const variable = get_variable(variable_id)
    
//     variable.deps.delete(data_source.id)
//     data_source.variables.delete(variable.id) 
// }

export async function export_variable () {
    return cloneDeep(variables).map(variable => {
        // variable.deps = Array.from(variable.deps) as any
        return variable
    })
} 

export async function import_variable (_variables) {
    variables = [ ]
    for (let variable of _variables) {
        variables.push(new Variable(variable.id, variable.name, variable.display_name))
        variable.deps = new Set(variable.deps)
        await save_variable(variable, false)
    }
}

export let variables: Variable[] = [ ]
