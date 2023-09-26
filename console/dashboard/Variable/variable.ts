import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard } from '../model.js'
import { sql_formatter, get_cols, stream_formatter } from '../utils.js'
import { model } from '../../model.js'
import { DDB, DdbForm, type DdbObj, type DdbValue } from 'dolphindb'
import { cloneDeep } from 'lodash'
import { type DataSource } from '../DataSource/date-source.js'

export type VariablePropertyType = string | string[] 

export class Variable extends Model<Variable>  {
    id: string
    name: string
    display_name: string
    mode = 'select'
    deps: Set<string> = new Set()
    /** select 模式专用 */
    select_keys: string[] = [ ]
    /** text 模式专用 */
    text = ''
    
    constructor (id: string, name: string, display_name: string) {
        super()
        this.id = id
        this.name = name
        this.display_name = display_name
    }
}

export function find_variable_index (key: string): number {
    return variables.findIndex(variable => variable.id === key)
} 

export function get_variable (id: string): Variable {
    return variables[find_variable_index(id)]
}

export async function save_variable ( new_variable: Variable ) {
    const id = new_variable.id
    const variable = get_variable(id)
    
    variable.set({ ...new_variable })
    
    console.log(variables)
    
    dashboard.message.success('保存成功！')
}

export function delete_variable (key: string): number {
    const variable = get_variable(key)
    if (variable.deps.size)
        dashboard.message.error('当前变量已被数据源使用无法删除')
    else {
        const delete_index = find_variable_index(key)
        variables.splice(delete_index, 1)
        return delete_index
    }
}

export function create_variable  (): { id: string, name: string, display_name: string } {
    const id = String(genid())
    const name = `变量 ${id.slice(0, 4)}`
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

export async function sub_variable (data_source: DataSource, variable_id: string) {
    const variable = get_variable(variable_id)
    
    variable.deps.add(data_source.id)
    data_source.variables.add(variable.id)
}

export function unsub_variable (data_source: DataSource, variable_id: string) {
    const variable = get_variable(variable_id)
    
    variable.deps.delete(data_source.id)
    data_source.variables.delete(variable.id) 
}

export async function export_data_sources () {
    return variables
} 

export async function import_data_sources (_variables) {
    variables = [ ]
    for (let variable of _variables) {
        variables.push(new Variable(variable.id, variable.name, variable.display_name))
        await save_variable(variable)
    }
}

export let variables: Variable[] = [ ]
