import { genid } from 'xshell/utils.browser.js'

import { type WidgetOption } from '../storage/widget_node.js'

type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

export type DataType = { name: string, data: Array<string> }[]

export type DataSourceNodeType = {
    auto_refresh?: boolean
    code?: string
    data?: DataType
    error_message?: string
    id: string
    interval?: number
    max_line?: number
    mode: string
    name: string
}

export type DataSourceNodePropertyType = ExtractTypes<DataSourceNodeType>

export const find_data_source_node_index = (key: string) =>
    data_source_nodes.findIndex(data_source_node => data_source_node.id === key) 


export const save_data_source_node = ( new_data_source_node: DataSourceNodeType) => {
    data_source_nodes[find_data_source_node_index(new_data_source_node.id)] = { ...new_data_source_node }
    const dep = deps.get(new_data_source_node.id)
    if (dep && dep.length)
        dep.forEach((widget_option: WidgetOption) => {
            // widget_option.update_graph(data_source_nodes[find_data_source_node_index(new_data_source_node.id)].data)
            console.log(widget_option.id, 'render', data_source_nodes[find_data_source_node_index(new_data_source_node.id)].data)
        })
}

export const delete_data_source_node = (key: string) => {
    const delete_index = find_data_source_node_index(key)
    data_source_nodes.splice(delete_index, 1)
    return delete_index
}

export const create_data_source_node = () => {
    const id = String(genid())
    const name = `节点${id.slice(0, 8)}`
    data_source_nodes.unshift({
        id,
        name,
        mode: 'sql',
        auto_refresh: false,
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    })
    return { id, name }
}

export const rename_data_source_node = (key: string, new_name: string) => {
    const data_source_node = data_source_nodes[find_data_source_node_index(key)]
    
    if (name_is_exist(new_name) && new_name !== data_source_node.name) 
        throw new Error('该节点名已存在')
    else if (new_name.length > 10)
        throw new Error('节点名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('节点名不能为空')
    else
        data_source_node.name = new_name
}

export const name_is_exist = (new_name: string): boolean => 
    data_source_nodes.findIndex(data_source_node => data_source_node.name === new_name) !== -1
    
export const sub_source = (widget_option: WidgetOption, source_id: string) => {
    if (widget_option.source_id)
        unsub_source(widget_option, source_id)  
    if (deps.has(source_id)) 
        deps.get(source_id).push(widget_option)
     else 
        deps.set(source_id, [widget_option])
    
    // widget_option.update_graph(data_source_nodes[find_data_source_node_index(source_id)].data)
    console.log(widget_option.id, 'render', data_source_nodes[find_data_source_node_index(source_id)].data)    
}

export const unsub_source = (widget_option: WidgetOption, source_id?: string) => {
    if (!source_id || widget_option.source_id !== source_id ) 
        deps.set(widget_option.source_id, deps.get(widget_option.source_id).filter((dep: WidgetOption) => dep.id !== widget_option.id )) 
}

export const data_source_nodes: DataSourceNodeType[] = [
    {
        id: '1',
        name: '节点1',
        mode: 'sql',
        auto_refresh: false,
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: '2',
        name: '节点2',
        mode: 'sql',
        auto_refresh: true,
        interval: 1,
        max_line: 10,
        code: '',
        data: [ ]
    },
    {
        id: '3',
        name: '节点3',
        mode: 'stream'
    },
 ]
 
export const deps = new Map<string, WidgetOption[]>()
