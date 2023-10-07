import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { dashboard } from '../model.js'
import { type DataSource, execute, data_sources } from '../DataSource/date-source.js'


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
    
    deps: Set<string>
    
    value = ''
    
    /** select 模式专用，可选的key*/
    options: OptionType[] = [ ]
    
    
    constructor (id: string, name: string, display_name: string, deps: Set<string>) {
        this.id = id
        this.name = name
        this.display_name = display_name
        this.deps = deps
    }
}

export class Variables extends Model<Variables>  {
    variable_infos: Array<{ id: string, name: string }> = [ ]
    constructor () {
        super()
    }
}


export type VariablePropertyType = string | string[] | OptionType[]

export type OptionType = { label: string, value: string, key: string }


export function find_variable_index (key: string, type: 'id' | 'name'): number {
    return variables.variable_infos.findIndex(variable_info => variable_info[type] === key)
}


export function find_variable_by_name (variable_name: string): Variable {
    const index = find_variable_index(variable_name, 'name')
    return index !== -1 ? variables[variables.variable_infos[index].id] : undefined
}


export async function update_variable_value (variable_id: string, value: string) {
    variables.set({ [variable_id]: { ...variables[variable_id], value } })
    
    for (let source_id of variables[variable_id].deps)
        await execute(source_id)
}


export function get_variable_value (variable_name: string): string {
    const variable = find_variable_by_name(variable_name)
    if (variable)
        return variable.value
    else
        throw new Error(`变量 ${name} 不存在`)
}



export async function save_variable ( new_variable: Variable, message = true) {
    const id = new_variable.id
    
    variables.set({ [id]: { ...new_variable, deps: variables[id].deps } })
    for (let source_id of variables[id].deps)
        await execute(source_id)
    
    if (message)
        dashboard.message.success(`${new_variable.name} 保存成功！`)
}


export function delete_variable (variable_id: string): number {
    const variable = variables[variable_id]
    if (variable.deps.size)
        dashboard.message.error('当前变量已被数据源使用无法删除')
    else {
        const delete_index = find_variable_index(variable_id, 'id')
        variables.variable_infos.splice(delete_index, 1)
        variables.set({ variable_infos: [...variables.variable_infos] })
        delete variables[variable.id]
        return delete_index
    }
}


export function create_variable  () {
    const id = String(genid())
    const name = `var_${id.slice(0, 4)}`
    const display_name = name
    const deps = new Set<string>()
    
    get_deps(name).forEach(dep => deps.add(dep))
    
    const variable = new Variable(id, name, display_name, deps)
    variables.set({ [id]: { ...variable }, variable_infos: [{ id, name }, ...variables.variable_infos] })
    return { id, name, display_name }
}


export function rename_variable (id: string, new_name: string) {
    const variable = variables[id]
    
    if (new_name === variable.name)
        return
    else if (find_variable_index(new_name, 'name') !== -1)
        throw new Error('该变量名已存在')
    else if (new_name.length > 10)
        throw new Error('变量名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('变量名不能为空')
    else if (variable.deps.size)
        throw new Error('此变量已被数据源引用无法修改名称')
    else {
        const new_deps = new Set<string>()
        get_deps(new_name).forEach(dep => new_deps.add(dep))
        variables.variable_infos[find_variable_index(id, 'id')].name = new_name
        variables.set({ [id]: { ...variables[id], name: new_name, deps: new_deps }, variable_infos: [...variables.variable_infos] })
    }     
}


export async function subscribe_variable (data_source: DataSource, variable_name: string) {
    const variable = find_variable_by_name(variable_name)
    
    if (variable) 
        variable.deps.add(data_source.id)
    
    data_source.variables.add(variable_name)
}


export function unsubscribe_variable (data_source: DataSource, variable_name: string) {
    const variable = find_variable_by_name(variable_name)
    
    if (variable) 
        variable.deps.delete(data_source.id)
    
    data_source.variables.delete(variable_name) 
}


function get_deps (name: string): string[] {
    const deps = [ ]
    data_sources.forEach(data_source => {
        data_source.variables.forEach(variable => {
            if (variable === name)
                deps.push(data_source.id)
        })
    })
    return deps
}


export async function export_variables (): Promise<ExportVariable[]> {
    return variables.variable_infos.map(variable_info => {
        const variable = variables[variable_info.id]
        return {
            ...variable,
            deps: Array.from(variable.deps)
        }
    })
} 


export async function import_variables (_variables: ExportVariable[]) {
    variables.variable_infos.forEach(variable_info => {
        delete variables[variable_info.id]
    })
    variables.variable_infos = [ ]
    
    for (let variable of _variables) {
        const import_variable = new Variable(variable.id, variable.name, variable.display_name, new Set(variable.deps))
        Object.assign(import_variable, variable, { deps: import_variable.deps })
        variables[variable.id] = import_variable
        variables.variable_infos.push({ id: variable.id, name: variable.name })
        await save_variable(import_variable, false)
    }
    return variables.variable_infos.map(variable_info => variables[variable_info.id])
}

export const variables = new Variables()
