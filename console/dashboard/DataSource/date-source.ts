import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import { DDB, type DdbObj, type DdbValue } from 'dolphindb/browser.js'
import { cloneDeep } from 'lodash'

import { type Widget, dashboard } from '../model.js'
import { sql_formatter, get_cols, stream_formatter, parse_code } from '../utils.js'
import { model } from '../../model.js'
import { unsubscribe_variable } from '../Variable/variable.js'


export type DataType = { }[]

export type DataSourcePropertyType = string | number | boolean | string[] | DataType

export type ExportDataSource = {
    id: string
    name: string
    mode: string
    max_line: number
    data: DataType 
    cols: string[] 
    deps: string[]
    variables: string[]
    error_message: string
    /** sql 模式专用 */
    auto_refresh: boolean
    /** sql 模式专用 */
    code: string
    /** sql 模式专用 */
    interval: number
    /** sql 模式专用 */
    timer: null
    /** stream 模式专用 */
    filter: boolean
    /** stream 模式专用 */
    stream_table: string
    /** stream 模式专用 */
    filter_column: string
    /** stream 模式专用 */
    filter_expression: string
    /** stream 模式专用 */
    node: string
    /** stream 模式专用 */
    ip: string
    /** stream 模式专用 */
    ddb: string
}


export class DataSource extends Model<DataSource>  {
    id: string
    name: string
    mode: 'sql' | 'stream' = 'sql'
    max_line: number = null
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
    filter_column = ''    
    /** stream 模式专用 */
    filter_expression = ''
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


export function find_data_source_index (source_id: string): number {
    return data_sources.findIndex(data_source => data_source.id === source_id)
} 

export function get_data_source (source_id: string): DataSource {
    return data_sources[find_data_source_index(source_id)] || new DataSource('', '')
}

export async function save_data_source ( new_data_source: DataSource, code?: string, filter_column?: string, filter_expression?: string ) {
    const id = new_data_source.id
    const data_source = get_data_source(id)
    const deps = new_data_source.deps
    
    delete_interval(data_source)
    unsubscribe_stream(data_source)
    
    data_source.variables.forEach(variable_name => { unsubscribe_variable(data_source, variable_name) })
        
    new_data_source.data.length = 0
    new_data_source.error_message = ''
    new_data_source.timer = null
    new_data_source.ddb = null
    
    new_data_source.code = code || dashboard.sql_editor?.getValue() || ''
    new_data_source.filter_column = filter_column || dashboard.filter_column_editor?.getValue() || ''
    new_data_source.filter_expression = filter_expression || dashboard.filter_expression_editor?.getValue() || ''
      
    switch (new_data_source.mode) {
        case 'sql':
            try {
                new_data_source.cols = [ ]
                
                const parsed_code = parse_code(new_data_source.code, new_data_source)
                const { type, result } = await dashboard.execute(parsed_code)
                
                switch (type) {
                    case 'success':
                        if (typeof result === 'object' && result) {
                            // 暂时只支持table
                            new_data_source.data = sql_formatter(result, new_data_source.max_line)
                            new_data_source.cols = get_cols(result)
                        }
                        if (code === undefined)
                            dashboard.message.success(`${data_source.name} 保存成功！`)
                        break  
                    case 'error':
                        throw new Error(result as string)
                }
            } catch (error) {
                new_data_source.error_message = error.message
                if (code === undefined)
                    dashboard.message.error(error.message)
            } finally {
                data_source.set({ ...new_data_source, timer: data_source.timer })
                
                if (deps.size && !data_source.error_message && data_source.auto_refresh) 
                    if (code === undefined)
                        create_interval(data_source) 
                    else 
                        // 尽可能避免加载后开启轮询的时间间隔过短
                        setTimeout(() => {
                            create_interval(data_source)
                        }, Math.floor(Math.random() * 1000 * Math.min(data_source.interval, 3)))                       
            }
            
            break
        case 'stream':   
            data_source.set({ ...new_data_source, auto_refresh: false })
            
            if (deps.size) 
                await subscribe_stream(data_source) 
            
            if (code === undefined)
                dashboard.message.success(`${data_source.name} 保存成功！`)
            break
    }
}

export function delete_data_source (source_id: string): number {
    const data_source = get_data_source(source_id)
    if (data_source.deps.size)
        dashboard.message.error('当前数据源已被图表绑定无法删除')
    else {
        const delete_index = find_data_source_index(source_id)
        data_source.variables.forEach(variable_name => { unsubscribe_variable(data_source, variable_name) })   
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


export function rename_data_source (source_id: string, new_name: string) {
    const data_source = get_data_source(source_id)
    
    if (new_name === data_source.name)
        return
    else if (data_sources.findIndex(data_source => data_source.name === new_name) !== -1) 
        throw new Error('该数据源名已存在')
    else if (new_name.length > 10)
        throw new Error('数据源名长度不能大于10')
    else if (new_name.length === 0)
        throw new Error('数据源名不能为空')
    else
        data_source.name = new_name
}


export async function subscribe_data_source (widget_option: Widget, source_id: string) {
    const data_source = get_data_source(source_id)
    
    if (widget_option.source_id && widget_option.source_id !== source_id)
        unsubscribe_data_source(widget_option)  
        
    data_source.deps.add(widget_option.id)
    
    if (data_source.error_message) 
        dashboard.message.error('当前数据源存在错误')
    else   
        switch (data_source.mode) {
            case 'sql':
                if (data_source.auto_refresh && !data_source.timer)
                    create_interval(data_source)
                break
            case 'stream':
                if (!data_source.ddb)
                    await subscribe_stream(data_source)
                break
        }
}


export function unsubscribe_data_source (widget_option: Widget) {
    const source_id = widget_option.source_id
    const data_source = get_data_source(source_id)
    data_source.deps.delete(widget_option.id)
    if (!data_source.deps.size) 
        switch (data_source.mode) {
            case 'sql':
                delete_interval(data_source)
                break
            case 'stream':
                unsubscribe_stream(data_source)
                break
        }  
}


export async function execute (source_id: string, queue = true) {
    const data_source = get_data_source(source_id)
    
    if (!data_source.id)
        return
    
    switch (data_source.mode) {
        case 'sql':
            try {
                const { type, result } = await dashboard.execute(parse_code(data_source.code, data_source), queue)
                console.log(type, data_source.name)
                switch (type) {
                    case 'success':
                        // 暂时只支持table
                        if (typeof result === 'object' && result)
                            data_source.set({
                                data: sql_formatter(result, data_source.max_line),
                                cols: get_cols(result),
                                error_message: ''
                            })        
                        else
                            data_source.set({
                                data: [ ],
                                cols: [ ],
                                error_message: ''
                            })
                            
                        if (data_source.deps.size && !data_source.timer && data_source.auto_refresh) 
                            create_interval(data_source)
                        
                        break
                    case 'error':
                        throw new Error(result as string) 
                }
            } catch (error) {
                dashboard.message.error(error.message)
                data_source.set({
                    data: [ ],
                    cols: [ ],
                    error_message: error.message
                })
                delete_interval(data_source)
            } finally {
                break
            }
        case 'stream':
            if (data_source.deps.size) 
                await subscribe_stream(data_source)
    }
}

function create_interval (data_source: DataSource) {
    if (data_source.auto_refresh) {
        delete_interval(data_source)
            
        const interval_id = setInterval(async () => {
            await execute(data_source.id, false)  
        }, data_source.interval * 1000)
        
        data_source.timer = interval_id
    }
}


function delete_interval (data_source: DataSource) {
    const interval = data_source.timer
    if (interval) {
        clearInterval(interval)
        data_source.timer = null
    }     
}


async function subscribe_stream (data_source: DataSource) {
    unsubscribe_stream(data_source)
    
    const { ddb: { username, password } } = model
    
    try {
        let column: DdbObj<DdbValue>
        if (data_source.filter_column) {
            const { type, result } = await dashboard.execute(parse_code(data_source.filter_column, data_source))
            if (type === 'success') {
                if (typeof result === 'object' && result) 
                    column = result
            } else 
                throw new Error(result as string)
        }
            
        const stream_connection = new DDB(
            (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + data_source.ip,
            {
                autologin: Boolean(username),
                username,
                password,
                streaming: {
                    table: data_source.stream_table,
                    filters: data_source.filter
                        ? {
                            column,
                            expression: parse_code(data_source.filter_expression, data_source)
                        }
                        : { },
                    handler (message) {
                        const { error } = message
                        if (error)
                            dashboard.message.error(error.message)
                        else {
                            
                            data_source.data.push(...stream_formatter(message.data, data_source.max_line, data_source.cols))
                            if (data_source.max_line && data_source.data.length > data_source.max_line)
                                data_source.data = data_source.data.splice(data_source.data.length - data_source.max_line)
                            data_source.set({
                                data: [...data_source.data]
                            }) 
                        }   
                    }
                }
            }
        )
        await stream_connection.connect()
        data_source.set({ data: [ ], cols: await get_stream_cols(data_source.stream_table), ddb: stream_connection })
    } catch (error) {
        dashboard.message.error(error.message)
        return error
    }
}


function unsubscribe_stream (data_source: DataSource) {
    const stream_connection = data_source.ddb
    if (stream_connection) {
        stream_connection.disconnect()
        data_source.ddb = null
    } 
}


export async function get_stream_tables (): Promise<string[]> {
    try {
        return (await dashboard.eval('exec name from objs(true) where type="REALTIME"')).value as string[]
    } catch (error) {
        return [ ]
    }
}


export async function get_stream_cols (table: string): Promise<string[]> {
    try {
        return (await dashboard.eval(`select name from schema(${table})['colDefs']`)).value[0].value
    } catch (error) {
        return [ ]
    }
}


export async function get_stream_filter_col (table: string): Promise<string> {
    try {
        return (await dashboard.eval(`getStreamTableFilterColumn(${table})`)).value as string
    } catch (error) {
        return ''
    }
}


export async function export_data_sources (): Promise<ExportDataSource[]> {
    return cloneDeep(data_sources).map(
        data_source => {
            return { 
                ...data_source, 
                timer: null,
                ddb: null,
                data: [ ],
                deps: Array.from(data_source.deps),
                variables: Array.from(data_source.variables)
            }
        }
    )
}


export async function import_data_sources (_data_sources: ExportDataSource[]) {
    data_sources = [ ]
    
    for (let data_source of _data_sources) {
        const import_data_source = new DataSource(data_source.id, data_source.name)
        Object.assign(import_data_source, data_source, { deps: new Set(data_source.deps), variables: new Set(data_source.variables) })
        data_sources.push(import_data_source)
        await save_data_source(import_data_source, import_data_source.code, import_data_source.filter_column, import_data_source.filter_expression)
    }
    
    return data_sources
}


export function clear_data_sources () {
    data_sources.forEach(data_source => {
        switch (data_source.mode) {
            case 'sql':
                delete_interval(data_source)
                break
            case 'stream':
                unsubscribe_stream(data_source)
                break
        }
    })
}

export let data_sources: DataSource[] = [ ]
