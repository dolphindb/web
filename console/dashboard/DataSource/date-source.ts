import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'

import { type Widget, dashboard, type Result } from '../model.js'
import { sql_formatter, get_cols, stream_formatter, parse_code } from '../utils.js'
import { model } from '../../model.js'
import { DDB, DdbForm, type DdbObj, type DdbValue } from 'dolphindb/browser.js'
import { cloneDeep } from 'lodash'
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


export function find_data_source_index (key: string): number {
    return data_sources.findIndex(data_source => data_source.id === key)
} 

export function get_data_source (id: string): DataSource {
    return data_sources[find_data_source_index(id)] || new DataSource('', '')
}

export async function save_data_source ( new_data_source: DataSource, code?: string, filter_column?: string, filter_expression?: string ) {
    const id = new_data_source.id
    const data_source = get_data_source(id)
    const deps = new_data_source.deps
    
    delete_interval(id)
    unsubscribe_stream(id)
    
    Array.from(data_source.variables).forEach(dep => { unsubscribe_variable(data_source, dep) }) 
        
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
                new_data_source.cols.length = 0
                
                const parsed_code = parse_code(new_data_source, 'code')
                const { type, result } = await dashboard.execute(parsed_code)
                
                if (type === 'success') {
                    if (typeof result === 'object' && result.data) {
                        // 暂时只支持table
                        new_data_source.data = sql_formatter(result.data as unknown as DdbObj<DdbValue>, new_data_source.max_line)
                        new_data_source.cols = get_cols(result.data as unknown as DdbObj<DdbValue>)
                    }
                } else 
                    throw new Error(result as string)
            } catch (error) {
                new_data_source.error_message = error.message
                if (code === undefined)
                    dashboard.message.error(error.message)
            } finally {
                data_source.set({ ...new_data_source })
            
                if (deps.size && !new_data_source.error_message && new_data_source.auto_refresh) 
                    create_interval(id) 
            }
            
            break
        case 'stream':   
            data_source.set({ ...new_data_source })
            
            if (deps.size) 
                await subscribe_stream(id) 
            
            break
    }
    // 仅测试用
    // if (dep && dep.length && !new_data_source.error_message ) 
    //     dep.forEach((widget_id: string) => {
    //         console.log(widget_id, 'render', new_data_source.data)
    //     })
    console.log(data_sources)
    
    if (code === undefined)
        dashboard.message.success(`${data_source.name} 保存成功！`)
}

export function delete_data_source (key: string): number {
    const data_source = get_data_source(key)
    if (data_source.deps.size)
        dashboard.message.error('当前数据源已被图表绑定无法删除')
    else {
        const delete_index = find_data_source_index(key)
        
        for (let variable_name of data_source.variables) 
            unsubscribe_variable(data_source, variable_name)
            
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


export function unsubscribe_data_source (widget_option: Widget) {
    const source_id = widget_option.source_id
    const data_source = get_data_source(source_id)
    data_source.deps.delete(widget_option.id)
    if (!data_source.deps.size) {
        delete_interval(source_id)
        unsubscribe_stream(source_id)
    }   
}

export async function execute (source_id: string) {
    const data_source = get_data_source(source_id)
    
    if (!data_source.id)
        return
    
    switch (data_source.mode) {
        case 'sql':
            try {
                const { type, result } = await dashboard.execute(parse_code(data_source, 'code'))
                        
                if (type === 'success') {
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
                    
                    if (data_source.deps.size && !data_source.timer && data_source.auto_refresh) 
                        create_interval(data_source.id) 
                    
                    // 仅测试用
                    // console.log('')
                    // data_source.deps.forEach((widget_id: string) => {
                    //     console.log(widget_id, 'render', data_source.data)
                    // })
                }
                else 
                    throw new Error(result as string)   
                 
            } catch (error) {
                dashboard.message.error(error.message)
                data_source.set({
                    data: [ ],
                    cols: [ ],
                    error_message: error.message
                })
                delete_interval(source_id)
            } finally {
                break
            }
        case 'stream':
            if (data_source.deps.size) 
                await subscribe_stream(source_id)
    }
}

function create_interval (source_id: string) {
    const data_source = get_data_source(source_id)
    if (data_source.auto_refresh) {
        delete_interval(source_id)
            
        const interval_id = setInterval(async () => {
              await execute(source_id)  
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
    
    try {
        const { result } = await dashboard.execute(parse_code(data_source, 'filter_column'))
        const stream_connection = new DDB(
            (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + data_source.ip,
            {
                autologin: Boolean(username),
                username,
                password,
                streaming: {
                    table: data_source.stream_table,
                    filters: {
                        column: (result as Result).data,
                        expression: parse_code(data_source, 'filter_expression')
                    },
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
        await stream_connection.connect()
        data_source.ddb = stream_connection
    } catch (error) {
        dashboard.message.error(error.message)
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


export let data_sources: DataSource[] = [ ]
