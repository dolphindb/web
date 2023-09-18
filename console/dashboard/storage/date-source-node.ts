import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard } from '../model.js'
import { formatter } from '../utils.js'
import { model } from '../../model.js'

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
    const id = new_data_source_node.id
    data_source_nodes[find_data_source_node_index(id)] = { ...new_data_source_node }
    const dep = deps.get(id)
    if (dep && dep.length && !new_data_source_node.error_message) {
        dep.forEach((widget_option: Widget) => {
            // widget_option.update_graph(new_data_source_node.data)
            console.log(widget_option.id, 'render', new_data_source_node.data)
        })
        new_data_source_node.auto_refresh ? create_interval(new_data_source_node) : delete_interval(id)   
    }
          
}

export const delete_data_source_node = (key: string) => {
    if (deps.get(key)?.length)
        model.message.error('当前数据源已被图表绑定无法删除')
    else {
        deps.delete(key)
        const delete_index = find_data_source_node_index(key)
        data_source_nodes.splice(delete_index, 1)
        return delete_index
    }
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
    
export const sub_source = (widget_option: Widget, source_id: string) => {
    if (widget_option.source_id)
        unsub_source(widget_option, source_id)  
    if (deps.has(source_id)) 
        deps.get(source_id).push(widget_option)
     else 
        deps.set(source_id, [widget_option])
    
    const data_source_node = data_source_nodes[find_data_source_node_index(source_id)]
    
    if (data_source_node.error_message) 
        model.message.error('当前数据源存在错误')
    else {
        // widget_option.update_graph(data_source_node.data)
        console.log(widget_option.id, 'render', data_source_node.data)    
    
        if (data_source_node.auto_refresh && !intervals.has(source_id))
            create_interval(data_source_node)
    }    
}

export const unsub_source = (widget_option: Widget, pre_source_id?: string) => {
    const source_id = widget_option.source_id
    if (!pre_source_id || source_id !== pre_source_id ) {
        const new_dep = deps.get(source_id).filter((dep: Widget) => dep.id !== widget_option.id )
        if (new_dep.length)
            deps.set(source_id, new_dep) 
        else {
            deps.delete(source_id)
            delete_interval(source_id)
        }
    }  
}

const create_interval = (data_source_node: DataSourceNodeType) => {
    if (data_source_node.auto_refresh) {
        const id = data_source_node.id
        
        delete_interval(id)
            
        const interval_id = setInterval(async () => {
            const { type, result } = await dashboard.execute(data_source_node.code)
            
            data_source_node.data.length = 0
            if (type === 'success') {
                console.log('')
                
                data_source_node.error_message = ''
                
                if (typeof result === 'object' && result.data) 
                    for (let i = 0;  i < result.data.cols;  i++) 
                        data_source_node.data.push(formatter(result.data.value[i], data_source_node.max_line))
                    
                deps.get(id).forEach((widget_option: Widget) => {
                    // widget_option.update_graph(data_source_node.data)
                    console.log(widget_option.id, 'render', data_source_node.data)
                })
            } else {
                model.message.error(result as string)
                data_source_node.error_message = result as string
                delete_interval(id)
            }    
        }, data_source_node.interval * 1000)
        
        intervals.set(id, interval_id)
    }
}

const delete_interval = (source_id: string) => {
    if (intervals.has(source_id)) {
        clearInterval(intervals.get(source_id))
        intervals.delete(source_id)
    }
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
        mode: 'stream'
    },
 ]
 
const deps = new Map<string, Widget[]>()

const intervals = new Map<string, NodeJS.Timeout>()
