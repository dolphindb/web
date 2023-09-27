import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard } from '../model.js'
import { sql_formatter, get_cols, stream_formatter } from '../utils.js'
import { model } from '../../model.js'
import { DDB, DdbForm, type DdbObj, type DdbValue } from 'dolphindb'
import { cloneDeep } from 'lodash'

export type DataType = { }[]

export type DataSourcePropertyType = string | number | boolean | string[] | DataType

export class DataSource extends Model<DataSource>  {
    id: string
    name: string
    mode = 'sql'
    max_line = 1000
    data: DataType = [ ]
    cols: string[] = [ ]
    deps: Set<string> = new Set()
    variables: Set<string> = new Set()
    error_message = ''
    /** sql 模式专用 */
    auto_refresh = false
    /** sql 模式专用 */
    code = ''
    /** sql 模式专用 */
    interval = 1
    /** sql 模式专用 */
    timer: NodeJS.Timeout
    /** stream 模式专用 */
    filter = false
    /** stream 模式专用 */
    stream_table = ''
    /** stream 模式专用 */
    filter_condition = ''
    /** stream 模式专用 */
    node = ''
    /** stream 模式专用 */
    ip = ''
    /** stream 模式专用 */
    ddb: DDB
    
    constructor (id: string, name: string) {
        super()
        this.id = id
        this.name = name
    }
}

export function find_data_source_index (key: string): number {
    return data_sources.findIndex(data_source => data_source.id === key)
} 

export function get_data_source (id: string): DataSource {
    return data_sources[find_data_source_index(id)]
}

export async function save_data_source ( new_data_source: DataSource, code?: string ) {
    const id = new_data_source.id
    const data_source = get_data_source(id)
    const dep = new_data_source.deps
    
    delete_interval(id)
    unsubscribe_stream(id)
    new_data_source.data.length = 0
    new_data_source.error_message = ''
    new_data_source.code = code || dashboard.editor?.getValue() || ''
    
    switch (new_data_source.mode) {
        case 'sql':
            
            new_data_source.cols.length = 0
    
            const { type, result } = await dashboard.execute(new_data_source.code)
            if (type === 'success') {
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) {
                    // 暂时只支持table
                    new_data_source.data = sql_formatter(result.data as unknown as DdbObj<DdbValue>, new_data_source.max_line)
                    new_data_source.cols = get_cols(result.data as unknown as DdbObj<DdbValue>)
                }
            } else {
                new_data_source.error_message = result as string
                if (code === undefined)
                    dashboard.message.error(result as string)
            }
            
            data_source.set({ ...new_data_source })
            
            if (dep.size && !new_data_source.error_message && new_data_source.auto_refresh) 
                create_interval(id) 
            
            break
        case 'stream':
            data_source.set({ ...new_data_source })
            
            if (dep.size && !new_data_source.error_message) 
                await subscribe_stream(id) 
            
            break
    }
    // 仅测试用
    // if (dep && dep.length && !new_data_source.error_message ) 
    //     dep.forEach((widget_id: string) => {
    //         console.log(widget_id, 'render', new_data_source.data)
    //     })
    if (code === undefined)
        dashboard.message.success(`${data_source.name} 保存成功！`)
}

export function delete_data_source (key: string): number {
    const data_source = get_data_source(key)
    if (data_source.deps.size)
        dashboard.message.error('当前数据源已被图表绑定无法删除')
    else {
        const delete_index = find_data_source_index(key)
        data_sources.splice(delete_index, 1)
        return delete_index
    }
}

export function create_data_source  (): { id: string, name: string } {
    const id = String(genid())
    const name = `数据源 ${id.slice(0, 4)}`
    data_sources.unshift(new DataSource(id, name))
    return { id, name }
}


export function rename_data_source (key: string, new_name: string) {
    const data_source = get_data_source(key)
    
    if (
        (data_sources.findIndex(data_source => data_source.name === new_name) !== -1) 
        && new_name !== data_source.name
    ) 
        throw new Error('该节点名已存在')
    else if (new_name.length > 10)
        throw new Error('节点名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('节点名不能为空')
    else
        data_source.name = new_name
}


export async function subscribe_data_source (widget_option: Widget, source_id: string) {
    const data_source = get_data_source(source_id)
    
    if (widget_option.source_id)
        unsubscribe_data_source(widget_option, source_id)  
        
    data_source.deps.add(widget_option.id)
    
    if (data_source.error_message) 
        dashboard.message.error('当前数据源存在错误')
    else   
        switch (data_source.mode) {
            case 'sql':
                if (data_source.auto_refresh && !data_source.timer)
                    create_interval(source_id)
                break
            case 'stream':
                if (!data_source.ddb)
                    await subscribe_stream(source_id)
                break
        }
        
        // 仅测试用
        // console.log(widget_option.id, 'render', data_source.data)      
}


export function unsubscribe_data_source (widget_option: Widget, new_source_id?: string) {
    const source_id = widget_option.source_id
    const data_source = get_data_source(source_id)
    if (!new_source_id || source_id !== new_source_id ) {
        data_source.deps.delete(source_id)
        if (!data_source.deps.size) {
            delete_interval(source_id)
            unsubscribe_stream(source_id)
        }   
    }  
}


function create_interval (source_id: string) {
    const data_source = get_data_source(source_id)
    if (data_source.auto_refresh) {
        delete_interval(source_id)
            
        const interval_id = setInterval(async () => {
            const { type, result } = await dashboard.execute(data_source.code)
            
            if (type === 'success') 
                // 暂时只支持table
                if (typeof result === 'object' && result.data && result.data.form === DdbForm.table) 
                    data_source.set({
                        data: sql_formatter(result.data as unknown as DdbObj<DdbValue>, data_source.max_line),
                        cols: get_cols(result.data as unknown as DdbObj<DdbValue>),
                        error_message: ''
                    })    
                else
                    data_source.set({
                        data: [ ],
                        cols: [ ],
                        error_message: ''
                    })
                
                // 仅测试用
                // console.log('')
                // data_source.deps.forEach((widget_id: string) => {
                //     console.log(widget_id, 'render', data_source.data)
                // })
             else {
                dashboard.message.error(result as string)
                data_source.set({
                    data: [ ],
                    cols: [ ],
                    error_message: result as string
                })
                delete_interval(source_id)
            }    
        }, data_source.interval * 1000)
        
        data_source.timer = interval_id
    }
}


function delete_interval (source_id: string) {
    const data_source = get_data_source(source_id)
    const interval = data_source.timer
    if (interval) {
        clearInterval(interval)
        data_source.timer = null
    }
        
}


async function subscribe_stream (source_id: string) {
    const data_source = get_data_source(source_id)
    
    unsubscribe_stream(source_id)
    
    const { ddb: { username, password } } = model
    const stream_connection = new DDB(
        (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + data_source.ip,
        {
            autologin: Boolean(username),
            username,
            password,
            streaming: {
                table: data_source.stream_table,
                handler (message) {
                    const { error } = message
                    if (error)
                        dashboard.message.error(error.message)
                    else {
                        data_source.data.push(...stream_formatter(message.data, data_source.max_line, data_source.cols))
                        if (data_source.data.length > data_source.max_line)
                            data_source.data = data_source.data.splice(data_source.data.length - data_source.max_line)
                        data_source.set({
                            data: [...data_source.data]
                        }) 
                    }   
                }
            }
        }
    )
    
    try {
        await stream_connection.connect()
        data_source.ddb = stream_connection
    } catch (error) {
        dashboard.show_error({ error })
        throw error
    }
}


function unsubscribe_stream (source_id: string) {
    const data_source = get_data_source(source_id)
    const stream_connection = data_source.ddb
    if (stream_connection) {
        stream_connection.disconnect()
        data_source.ddb = null
    } 
}


export async function get_stream_tables (): Promise<string[]> {
    await dashboard.eval('exec name from objs(true) where type="REALTIME"')
    return dashboard.result.data.value as string[]
}


export async function get_stream_cols (table: string): Promise<string[]> {
    await dashboard.eval(`select name from schema(${table})['colDefs']`)
    return dashboard.result.data.value[0].value
}


export async function get_stream_filter_col (table: string): Promise<string> {
    try {
        return await dashboard.eval(`getStreamTableFilterColumn(${table})`) as string
    } catch (error) {
        return ''
    }
}


export async function export_data_sources () {
    return (cloneDeep(data_sources)).map(
        data_source => {
            data_source.timer = null
            data_source.ddb = null
            data_source.data = [ ]
            data_source.deps = Array.from(data_source.deps) as any
            data_source.variables = Array.from(data_source.variables) as any
            return data_source
        }
    )
}


export async function import_data_sources (_data_sources) {
    data_sources = [ ]
    
    for (let data_source of _data_sources) {
        data_sources.push(new DataSource(data_source.id, data_source.name))
        data_source.deps = new Set(data_source.deps)
        data_source.variables = new Set(data_source.variables)
        await save_data_source(data_source, data_source.code)
    }
    
    return data_sources
}


export let data_sources: DataSource[] = [ ]
