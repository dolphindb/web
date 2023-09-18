import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard } from '../model.js'
import { formatter } from '../utils.js'
import { model } from '../../model.js'
import { DdbValue } from 'dolphindb'

type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

const deps = new Map<string, Widget[]>()

const intervals = new Map<string, NodeJS.Timeout>()

export type DataType = { name: string, data: Array<string> }[]

export type DataSourceNodeType = {
    id: string
    name: string
    mode: 'sql' | 'stream'
    max_line: number
    data: DataType
    error_message: string
    /** sql 模式专用 */
    auto_refresh: boolean
    /** sql 模式专用 */
    code: string
    /** sql 模式专用 */
    interval: number
    /** stream 模式专用 */
    filter: boolean
    /** stream 模式专用 */
    stream_table: string
    /** stream 模式专用 */
    filter_col: string
    /** stream 模式专用 */
    filter_mode: 'value' | 'scope' | 'hash'
    /** stream 模式专用 */
    filter_condition: string
    /** stream 模式专用 */
    node: string
    /** stream 模式专用 */
    ip: string
}

export type DataSourceNodePropertyType = ExtractTypes<DataSourceNodeType>

export const find_data_source_node_index = (key: string): number =>
    data_source_nodes.findIndex(data_source_node => data_source_node.id === key) 


export const save_data_source_node = async ( new_data_source_node: DataSourceNodeType ) => {
    const id = new_data_source_node.id
    
    switch (new_data_source_node.mode) {
        case 'sql':
            new_data_source_node.code = dashboard.editor.getValue()
    
            const { type, result } = await dashboard.execute()
            new_data_source_node.data.length = 0
            if (type === 'success') {
                if (typeof result === 'object' && result.data) 
                    for (let i = 0;  i < result.data.cols;  i++) 
                        new_data_source_node.data.push(formatter(result.data.value[i], new_data_source_node.max_line))
                new_data_source_node.error_message = ''
            } else {
                new_data_source_node.error_message = result as string
                model.message.error(result as string)
            }
            
            data_source_nodes[find_data_source_node_index(id)] = { ...new_data_source_node }
            
            const dep = deps.get(id)
            if (dep && dep.length && !new_data_source_node.error_message) {
                dep.forEach((widget_option: Widget) => {
                    // widget_option.update_graph(new_data_source_node.data)
                    console.log(widget_option.id, 'render', new_data_source_node.data)
                })
                new_data_source_node.auto_refresh ? create_interval(new_data_source_node) : delete_interval(id)   
            }
            break
        case 'stream':
            new_data_source_node.filter_condition = dashboard.editor.getValue()
            console.log(new_data_source_node)
            data_source_nodes[find_data_source_node_index(id)] = { ...new_data_source_node }
            break
    }       
}

export const delete_data_source_node = (key: string): number => {
    if (deps.get(key)?.length)
        model.message.error('当前数据源已被图表绑定无法删除')
    else {
        deps.delete(key)
        const delete_index = find_data_source_node_index(key)
        data_source_nodes.splice(delete_index, 1)
        return delete_index
    }
}

export const create_data_source_node = (): { id: string, name: string } => {
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
        data: [ ],
        error_message: '',
        filter: false,
        stream_table: '',
        filter_col: '',
        filter_mode: 'value',
        filter_condition: '',
        node: '',
        ip: ''
    })
    return { id, name }
}

export const rename_data_source_node = (key: string, new_name: string) => {
    const data_source_node = data_source_nodes[find_data_source_node_index(key)]
    
    if (
        (data_source_nodes.findIndex(data_source_node => data_source_node.name === new_name) !== -1) 
        && new_name !== data_source_node.name
    ) 
        throw new Error('该节点名已存在')
    else if (new_name.length > 10)
        throw new Error('节点名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('节点名不能为空')
    else
        data_source_node.name = new_name
}
    
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

export const get_stream_tables = async (): Promise<string[]> => {
    await dashboard.eval('exec name from objs(true) where type="REALTIME"')
    return dashboard.result.data.value as string[]
}

export const get_stream_cols = async (table: string, filter = false): Promise<string[]> => {
    await dashboard.eval(`select name from schema(${table})['colDefs'] ${ filter ? 'where typeString != \'BOOL\'' : ''}`)
    const res = dashboard.result.data.value[0].value
    if (filter)
        await get_stream_cols(table)
    return res
}

export const data_source_nodes: DataSourceNodeType[] = [
    {
        id: '1',
        name: '节点1',
        mode: 'sql',
        max_line: 10,
        auto_refresh: false,
        interval: 1,
        code: '',
        data: [ ],
        error_message: '',
        filter: false,
        stream_table: '',
        filter_col: '',
        filter_mode: 'value',
        filter_condition: '',
        node: '',
        ip: ''
    },
    {
        id: '2',
        name: '节点2',
        mode: 'stream',
        max_line: 10,
        auto_refresh: false,
        interval: 1,
        code: '',
        data: [ ],
        error_message: '',
        filter: false,
        stream_table: '',
        filter_col: '',
        filter_mode: 'value',
        filter_condition: '',
        node: '',
        ip: ''
    },
 ]
