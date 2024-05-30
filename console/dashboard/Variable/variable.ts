import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import copy from 'copy-to-clipboard'

import { dashboard } from '../model.js'
import { type DataSource, execute } from '../DataSource/date-source.js'
import { safe_json_parse } from '../utils.js'
import { t } from '../../../i18n/index.js'
import { VariableMode } from '../type.js'

export type ExportVariable = {
    id: string
    
    name: string
    
    display_name: string
    
    mode: VariableMode
    
    code: string
    
    deps: string[]
    
    value: string
    
    options: OptionType[] 
}

export class Variable  {
    id: string
    
    name: string
    
    display_name: string
    
    mode = VariableMode.SELECT
    
    code = ''
    
    deps: Set<string>
    
    value = ''
    
    /** select 模式专用，可选的key*/
    options: OptionType[] = [ ]
    
    
    constructor (id: string, name: string, display_name: string, deps = new Set<string>()) {
        this.id = id
        this.name = name
        this.display_name = display_name
        this.deps = deps
    }
}

export class Variables extends Model<Variables> {
    variable_infos: { id: string, name: string }[] = [ ]
}

export type VariablePropertyType = string | string[] | OptionType[]


export interface OptionType {
    label: string
    value: string
    key: string
}


const tmp_deps = new Map<string, Set<string>>()


export function find_variable_index (key: string, type: 'id' | 'name'): number {
    return variables.variable_infos.findIndex(variable_info => variable_info[type] === key)
}


export function find_variable_by_name (variable_name: string): Variable {
    const index = find_variable_index(variable_name, 'name')
    return index !== -1 ? variables[variables.variable_infos[index].id] : undefined
}


export async function update_variable_value (change_variables: {})  {
    const data_sources = new Set<string>()
    Object.entries(change_variables).forEach(([variable_id, value]) => { 
        variables.set({ [variable_id]: { ...variables[variable_id], value } })
        variables[variable_id].deps.forEach((data_source: string) => data_sources.add(data_source))
    })
    
    await Promise.all(
        [...data_sources].map(async source_id => execute(source_id))
    )
}


export function get_variable_value (variable_name: string): string {
    const variable = find_variable_by_name(variable_name)
    if (variable) 
        return variable.mode === 'multi_select' ? safe_json_parse(variable.value) : variable.value
    else
        throw new Error(`${t('变量')} ${variable_name} ${t('不存在')}`)
}



export async function save_variable ( new_variable: Variable, is_import = false) {
    const id = new_variable.id
    
    const is_select = new_variable.mode === VariableMode.MULTI_SELECT || new_variable.mode === VariableMode.SELECT
    
    if (!is_import && is_select)
        new_variable.code = dashboard.variable_editor?.getValue()
    
    if (!is_select)
        new_variable.options = [ ]
    
    variables.set({ [id]: { ...new_variable, deps: variables[id].deps } })
    
    if (!is_import) {
        for (let source_id of variables[id].deps)
            await execute(source_id)
        dashboard.message.success(`${new_variable.name} ${('保存成功！')}`)
    }
}


export function delete_variable (variable_id: string): number {
    const variable = variables[variable_id]
    if (variable.deps.size)
        dashboard.message.error(t('当前变量已被数据源使用无法删除'))
    else {
        const delete_index = find_variable_index(variable_id, 'id')
        variables.variable_infos.splice(delete_index, 1)
        variables.set({ variable_infos: [...variables.variable_infos] })
        delete variables[variable.id]
        return delete_index
    }
}


function check_name (id: string, new_name: string) {
    if (variables.variable_infos.find(variable => variable.name === new_name && variable.id !== id)) 
        throw new Error(t('该变量名已存在'))
    else if (new_name.length > 10)
        throw new Error(t('变量名长度不能大于10'))
    else if (new_name.length === 0)
        throw new Error(t('变量名不能为空'))
}


export function create_variable (new_name: string): string {
    const id = String(genid())
    
    check_name(id, new_name)
    
    variables.set({ 
        [id]: { ...new Variable(id, new_name, new_name, tmp_deps.get(new_name) || new Set<string>()) }, 
        variable_infos: [{ id, name: new_name }, ...variables.variable_infos] 
    })
    
    tmp_deps.delete(new_name)
    return id
}


export function rename_variable (id: string, new_name: string) {
    const variable = variables[id]
      
    new_name = new_name.trim()
    
    check_name(id, new_name)
    
    if (variable.deps.size)
        throw new Error(t('此变量已被数据源引用无法修改名称'))
    else {
        variables.variable_infos[find_variable_index(id, 'id')].name = new_name
        variables.set({ 
            [id]: { ...variables[id], name: new_name, deps: tmp_deps.get(new_name) || new Set<string>() }, 
            variable_infos: [...variables.variable_infos] 
        })
        tmp_deps.delete(new_name)
    }     
}


export async function subscribe_variable (data_source: DataSource, variable_name: string) {
    const variable = find_variable_by_name(variable_name)
    const tmp_dep = tmp_deps.get(variable_name)
    
    if (variable) {
        variable.deps.add(data_source.id)
        data_source.variables.add(variable.id)
    }    
    else if (tmp_dep)
        tmp_dep.add(data_source.id)
    else 
        tmp_deps.set(variable_name, new Set<string>([data_source.id]))
}


export function unsubscribe_variable (data_source: DataSource, variable_id: string) {
    const variable = variables[variable_id]
    const tmp_dep = tmp_deps.get(variable.name)
    
    if (variable) 
        variable.deps.delete(data_source.id)
    else if (tmp_dep) {
        tmp_dep.delete(data_source.id)
        if (!tmp_dep.size)
            tmp_deps.delete(variable.name)
    }
        
    data_source.variables.delete(variable.id) 
}


export async function export_variables (): Promise<ExportVariable[]> {
    return variables.variable_infos.map(variable_info => {
        const variable = variables[variable_info.id]
        return {
            ...variable,
            deps: [ ]
        }
    })
} 


export async function import_variables (_variables: ExportVariable[]) {
    variables.variable_infos.forEach(variable_info => {
        delete variables[variable_info.id]
    })
    variables.variable_infos = [ ]
    
    tmp_deps.clear()
    
    for (let variable of _variables) {
        const { id, name, display_name } = variable
        const import_variable = new Variable(id, name, display_name)
        Object.assign(import_variable, variable, { deps: import_variable.deps })
        variables[id] = import_variable
        variables.variable_infos.push({ id, name })
        await save_variable(import_variable, true)
    }
    return variables.variable_infos.map(variable_info => variables[variable_info.id])
}


export function get_variable_copy_infos (variable_ids: string[]) {
    return {
        variables: variable_ids.map(variable_id => ({
            ...variables[variable_id],
            deps: [ ]
        }))
    }
}


export function copy_variables (variable_ids: string[]) {
    try {
        copy(JSON.stringify( get_variable_copy_infos(variable_ids)))
        dashboard.message.success(t('复制成功'))
     } catch (e) {
        dashboard.message.error(t('复制失败'))
    }
}

/** widget 表示是否是粘贴 widget 时附带粘贴变量 */
export async function paste_variables (event, widget = false): Promise<boolean> { 
    const { variables: _variables } = safe_json_parse((event.clipboardData).getData('text'))
    if (!_variables || !_variables.length)
        return false
    // 先校验，重名不粘贴，不重名且 id 不同的直接粘贴，不重名但 id 相同的重新生成 id 后粘贴
    for (let i = 0;  i < _variables.length;  i++  ) {
        const { id, name } = _variables[i]
        if (find_variable_index(name, 'name') !== -1) 
            if (widget)
                throw new Error(t('变量冲突，复制失败'))
            else {
                _variables.splice(i, 1)
                i--
            }   
        else if (variables[id]) 
            if (widget)
                throw new Error(t('变量冲突，复制失败'))
            else 
                _variables[i].id = String(genid())
    }
    
    for (let variable of _variables) {
        const { id, name, display_name } = variable
        const parste_variable = new Variable(id, name, display_name, tmp_deps.get(name) || new Set<string>())
        Object.assign(parste_variable, variable, { deps: parste_variable.deps })
        variables.set({ 
            [id]: parste_variable, 
            variable_infos: [{ id, name }, ...variables.variable_infos] 
        })
        await save_variable(parste_variable, true)
    }
    
    return true
}

export const variables = new Variables()
