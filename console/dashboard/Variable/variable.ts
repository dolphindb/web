import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import { cloneDeep } from 'lodash'

import { dashboard } from '../model.js'
import { type DataSource, execute } from '../DataSource/date-source.js'


export type ExportVariable = {
    id: string
    
    name: string
    
    display_name: string
    
    mode: string
    
    deps: string[]
    
    value: string
    
    options: OptionType[] 
}

export class Variable  {
    id: string
    
    name: string
    
    display_name: string
    
    mode = 'select'
    
    deps: Set<string> = new Set()
    
    value = ''
    
    /** select 模式专用，可选的key*/
    options: OptionType[] = [ ]
    
    
    constructor (id: string, name: string, display_name: string) {
        this.id = id
        this.name = name
        this.display_name = display_name
    }
}

export class Variables extends Model<Variables>  {
    variable_names: string[] = [ ]
    constructor () {
        super()
    }
}


export type VariablePropertyType = string | string[] | OptionType[]

export type OptionType = { label: string, value: string, key: string }


export function find_variable_index (name: string): number {
    return variables.variable_names.findIndex(variable_name => variable_name === name)
}


export async function update_variable_value (name: string, value: string) {
    variables.set({ [name]: { ...variables[name], value } })
    
    console.log(variables, 'variables')
    
    for (let source_id of variables[name].deps)
        await execute(source_id)
}


export function get_variable_value (name: string): string {
    if (variables[name])
        return variables[name].value
    else
        throw new Error(`变量 ${name} 不存在`)
}



export async function save_variable ( new_variable: Variable, message = true) {
    const name = new_variable.name
    
    variables.set({ [name]: { ...new_variable, value: '' } })
    
    for (let source_id of variables[name].deps)
        await execute(source_id)
    
    if (message)
        dashboard.message.success(`${new_variable.name} 保存成功！`)
}


export function delete_variable (name: string): number {
    const variable = variables[name]
    if (variable.deps.size)
        dashboard.message.error('当前变量已被数据源使用无法删除')
    else {
        const delete_index = find_variable_index(name)
        variables.variable_names.splice(delete_index, 1)
        delete variables[variable.name]
        return delete_index
    }
}


export function create_variable  () {
    const id = String(genid())
    const name = `var_${id.slice(0, 4)}`
    const display_name = name
    const variable = new Variable(id, name, display_name)
    variables[name] = variable
    variables.variable_names.unshift(name)
    return { id, name, display_name }
}


export function rename_variable (old_name: string, new_name: string) {
    const variable = variables[old_name]
    
    if (
        (find_variable_index(new_name) !== -1) 
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

export async function subscribe_variable (data_source: DataSource, variable_name: string) {
    const variable = variable_name[variable_name]
    
    variable.deps.add(data_source.id)
    data_source.variables.add(variable_name)
}

export function unsubscribe_variable (data_source: DataSource, variable_name: string) {
    const variable = variable_name[variable_name]
    
    variable.deps.delete(data_source.id)
    data_source.variables.delete(variable.name) 
}

export async function export_variables (): Promise<ExportVariable[]> {
    return variables.variable_names.map(variable_name => {
        const variable = variables[variable_name]
        return {
            ...variable,
            deps: Array.from(variable.deps)
        }
    })
} 


export async function import_variables (_variables: ExportVariable[]) {
    variables.variable_names.forEach(variable_name => {
        delete variables[variable_name]
    })
    variables.variable_names = [ ]
    
    for (let variable of _variables) {
        const import_variable = new Variable(variable.id, variable.name, variable.display_name)
        Object.assign(import_variable, variable, { deps: new Set(variable.deps) })
        variables[variable.name] = import_variable
        variables.variable_names.push(import_variable.name)
        await save_variable(import_variable, false)
    }
    
    return variables.variable_names.map(variable_name => variables[variable_name])
}

export const variables = new Variables()
