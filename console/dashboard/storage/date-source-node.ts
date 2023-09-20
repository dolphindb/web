import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import { cloneDeep } from 'lodash'

import { type Widget, dashboard } from '../model.js'
import { formatter, get_cols } from '../utils.js'
import { DdbModel, model } from '../../model.js'
import { DdbForm, DdbObj, DdbValue } from 'dolphindb'

type ExtractTypes<T> = T extends { [key: string]: infer U } ? U : never

const deps = new Map<string, Widget[]>()

const intervals = new Map<string, NodeJS.Timeout>()

export type DataType = { }[]

export type DataSourceNodePropertyType = string | number | boolean | string[] | DataType

export class DataSourceNode extends Model<DataSourceNode>  {
    id: string
    name: string
    mode = 'sql'
    max_line = 10
    data: DataType = [ ]
    cols: string[] = [ ]
    error_message = ''
    /** sql 模式专用 */
    auto_refresh = false
    /** sql 模式专用 */
    code = ''
    /** sql 模式专用 */
    interval = 1
    /** stream 模式专用 */
    filter = false
    /** stream 模式专用 */
    stream_table = ''
    /** stream 模式专用 */
    filter_col = ''
    /** stream 模式专用 */
    filter_mode = 'value'
    /** stream 模式专用 */
    filter_condition = ''
    /** stream 模式专用 */
    node = ''
    /** stream 模式专用 */
    ip = ''
    
    constructor (id: string, name: string) {
        super()
        this.id = id
        this.name = name
    }
}

export const find_data_source_node_index = (key: string): number =>
    data_source_nodes.findIndex(data_source_node => data_source_node.id === key) 

export const get_data_source_node = (id: string): DataSourceNode =>
    data_source_nodes[find_data_source_node_index(id)]


export const save_data_source_node = async ( new_data_source_node: DataSourceNode ) => {
    const id = new_data_source_node.id
    const data_source_node = get_data_source_node(id)
    
    switch (new_data_source_node.mode) {
        case 'sql':
            new_data_source_node.code = dashboard.editor.getValue()
    
            const { type, result } = await dashboard.execute()
            new_data_source_node.data.length = 0
            new_data_source_node.cols.length = 0
            if (type === 'success') {
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) {
                    // 暂时只支持table
                    new_data_source_node.data = formatter(result.data as unknown as DdbObj<DdbValue>, new_data_source_node.max_line)
                    new_data_source_node.cols = get_cols(result.data as unknown as DdbObj<DdbValue>)
                }
                    
                new_data_source_node.error_message = ''
            } else {
                new_data_source_node.error_message = result as string
                model.message.error(result as string)
            }
            
            Object.assign(data_source_node, cloneDeep(new_data_source_node))
            console.log(data_source_nodes)
            
            const dep = deps.get(id)
            if (dep && dep.length && !new_data_source_node.error_message) {
                
                // 仅测试用
                dep.forEach((widget_option: Widget) => {
                    console.log(widget_option.id, 'render', new_data_source_node.data)
                })
                
                new_data_source_node.auto_refresh ? create_interval(new_data_source_node) : delete_interval(id)   
            }
            break
        case 'stream':
            new_data_source_node.filter_condition = dashboard.editor.getValue()
            Object.assign(data_source_node, cloneDeep(new_data_source_node))
            console.log(data_source_nodes)
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
    const name = `数据源${id.slice(0, 7)}`
    data_source_nodes.unshift(new DataSourceNode(id, name))
    return { id, name }
}

export const rename_data_source_node = (key: string, new_name: string) => {
    const data_source_node = get_data_source_node(key)
    
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
    
    const data_source_node = get_data_source_node(source_id)
    
    if (data_source_node.error_message) 
        model.message.error('当前数据源存在错误')
    else {
        // 仅测试用
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

const create_interval = (data_source_node: DataSourceNode) => {
    if (data_source_node.auto_refresh) {
        const id = data_source_node.id
        
        delete_interval(id)
            
        const interval_id = setInterval(async () => {
            const { type, result } = await dashboard.execute(data_source_node.code)
            
            data_source_node.data.length = 0
            data_source_node.cols.length = 0
            if (type === 'success') {
                console.log('')
                
                data_source_node.error_message = ''
                
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) {
                    // 暂时只支持table
                    data_source_node.data = formatter(result.data as unknown as DdbObj<DdbValue>, data_source_node.max_line)
                    data_source_node.cols = get_cols(result.data as unknown as DdbObj<DdbValue>)
                }
                
                // 仅测试用
                deps.get(id).forEach((widget_option: Widget) => {
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

export const data_source_nodes: DataSourceNode[] = [new DataSourceNode('1', '数据源1')]
