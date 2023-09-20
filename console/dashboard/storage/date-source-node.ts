import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard } from '../model.js'
import { formatter, get_cols } from '../utils.js'
import { model } from '../../model.js'
import { DDB, DdbForm, DdbObj, DdbValue } from 'dolphindb'

const deps = new Map<string, Widget[]>()

const intervals = new Map<string, NodeJS.Timeout>()

const stream_subs = new Map<string, DDB>()

export type DataType = { }[]

export type DataSourceNodePropertyType = string | number | boolean | string[] | DataType

export class DataSourceNode extends Model<DataSourceNode>  {
    id: string
    name: string
    mode = 'sql'
    max_line = 1000
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

export const find_source_node_index = (key: string): number =>
    source_nodes.findIndex(source_node => source_node.id === key) 

export const get_source_node = (id: string): DataSourceNode =>
    source_nodes[find_source_node_index(id)]


export const save_source_node = async ( new_source_node: DataSourceNode ) => {
    const id = new_source_node.id
    const dep = deps.get(id)
    const source_node = get_source_node(id)
    
    switch (new_source_node.mode) {
        case 'sql':
            new_source_node.code = dashboard.editor.getValue()
    
            const { type, result } = await dashboard.execute()
            new_source_node.data.length = 0
            new_source_node.cols.length = 0
            if (type === 'success') {
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) {
                    // 暂时只支持table
                    new_source_node.data = formatter(result.data as unknown as DdbObj<DdbValue>, new_source_node.max_line)
                    new_source_node.cols = get_cols(result.data as unknown as DdbObj<DdbValue>)
                }
                    
                new_source_node.error_message = ''
            } else {
                new_source_node.error_message = result as string
                model.message.error(result as string)
            }
            
            source_node.set({ ...new_source_node })
            
            if (dep && dep.length && !new_source_node.error_message) {
                // 仅测试用
                dep.forEach((widget_option: Widget) => {
                    console.log(widget_option.id, 'render', new_source_node.data)
                })
                
                new_source_node.auto_refresh ? create_interval(id) : delete_interval(id)   
            }
            break
        case 'stream':
            new_source_node.filter_condition = dashboard.editor.getValue()
            source_node.set({ ...new_source_node })
            
            if (dep && dep.length && !new_source_node.error_message) {
                // 仅测试用
                dep.forEach((widget_option: Widget) => {
                    console.log(widget_option.id, 'render', new_source_node.data)
                })
                
                sub_stream(source_node)   
            }
            break
    }       
}

export const delete_source_node = (key: string): number => {
    if (deps.get(key)?.length)
        model.message.error('当前数据源已被图表绑定无法删除')
    else {
        deps.delete(key)
        const delete_index = find_source_node_index(key)
        source_nodes.splice(delete_index, 1)
        return delete_index
    }
}

export const create_source_node = (): { id: string, name: string } => {
    const id = String(genid())
    const name = `数据源${id.slice(0, 7)}`
    source_nodes.unshift(new DataSourceNode(id, name))
    return { id, name }
}

export const rename_source_node = (key: string, new_name: string) => {
    const source_node = get_source_node(key)
    
    if (
        (source_nodes.findIndex(source_node => source_node.name === new_name) !== -1) 
        && new_name !== source_node.name
    ) 
        throw new Error('该节点名已存在')
    else if (new_name.length > 10)
        throw new Error('节点名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('节点名不能为空')
    else
        source_node.name = new_name
}

const create_interval = (source_id: string) => {
    const source_node = get_source_node(source_id)
    if (source_node.auto_refresh) {
        const id = source_node.id
        
        delete_interval(id)
            
        const interval_id = setInterval(async () => {
            const { type, result } = await dashboard.execute(source_node.code)
            
            if (type === 'success') {
                // 暂时只支持table
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) 
                    source_node.set({
                        data: formatter(result.data as unknown as DdbObj<DdbValue>, source_node.max_line),
                        cols: get_cols(result.data as unknown as DdbObj<DdbValue>),
                        error_message: ''
                    })
                
                    
                else
                    source_node.set({
                        data: [ ],
                        cols: [ ],
                        error_message: ''
                    })
                
                // 仅测试用
                console.log('')
                deps.get(id).forEach((widget_option: Widget) => {
                    console.log(widget_option.id, 'render', source_node.data)
                })
            } else {
                model.message.error(result as string)
                source_node.set({
                    data: [ ],
                    cols: [ ],
                    error_message: result as string
                })
                delete_interval(id)
            }    
        }, source_node.interval * 1000)
        
        intervals.set(id, interval_id)
    }
}

const delete_interval = (source_id: string) => {
    if (intervals.has(source_id)) {
        clearInterval(intervals.get(source_id))
        intervals.delete(source_id)
    }
}

const sub_stream = (source_node: DataSourceNode) => {
    const { ddb: { username, password } } = model
    console.log(username, password, source_node.ip)
    console.log('订阅成功')
}

const unsub_stream = ( ) => {
    console.log('取消订阅成功')
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
            unsub_stream()
        }
    }  
}

export const sub_source = (widget_option: Widget, source_id: string) => {
    if (widget_option.source_id)
        unsub_source(widget_option, source_id)  
    if (deps.has(source_id)) 
        deps.get(source_id).push(widget_option)
     else 
        deps.set(source_id, [widget_option])
    
    const source_node = get_source_node(source_id)
    
    if (source_node.error_message) 
        model.message.error('当前数据源存在错误')
    else {
        // 仅测试用
        console.log(widget_option.id, 'render', source_node.data)    
    
        switch (source_node.mode) {
            case 'sql':
                if (source_node.auto_refresh && !intervals.has(source_id))
                    create_interval(source_id)
                break
            case 'stream':
                if (!stream_subs.has(source_id))
                    sub_stream(source_node)
                break
        }
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

export const source_nodes: DataSourceNode[] = [new DataSourceNode('1', '数据源1')]
