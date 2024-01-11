import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import { DDB, type DdbObj, type DdbValue } from 'dolphindb/browser.js'
import { cloneDeep } from 'lodash'
import copy from 'copy-to-clipboard'

import { type Widget, dashboard } from '../model.js'
import { sql_formatter, get_cols, stream_formatter, parse_code, safe_json_parse } from '../utils.js'
import { model, storage_keys } from '../../model.js'
import { get_variable_copy_infos, paste_variables, unsubscribe_variable } from '../Variable/variable.js'
import { t } from '../../../i18n/index.js'


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
    ddb: string
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
    ip: string
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
    ddb: DDB
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
    ip = ''
    
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
    
    clear_data_source(data_source)
    
    data_source.variables.forEach(variable_id => { unsubscribe_variable(data_source, variable_id) })
        
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
                new_data_source.ddb = await create_sql_connection()
                
                const parsed_code = parse_code(new_data_source.code, new_data_source)
                const { type, result } = await dashboard.execute_code(parsed_code, new_data_source.ddb)
                
                switch (type) {
                    case 'success':
                        if (typeof result === 'object' && result) {
                            // 暂时只支持table
                            new_data_source.data = sql_formatter(result, new_data_source.max_line)
                            new_data_source.cols = get_cols(result)
                        }
                        if (code === undefined)
                            dashboard.message.success(`${data_source.name} ${t('保存成功')}`)
                        break  
                    case 'error':
                        throw new Error(result as string)
                }
            } catch (error) {
                new_data_source.error_message = error.message
                new_data_source.cols = [ ]
                if (code === undefined)
                    dashboard.message.error(error.message)
            } finally {
                data_source.set({ ...new_data_source })
                if ((data_source.error_message || !deps.size || !data_source.variables.size) && data_source.ddb) {
                    data_source.ddb.disconnect()
                    data_source.ddb = null 
                }
                if (deps.size && !data_source.error_message && data_source.auto_refresh) 
                    create_interval(data_source)                    
            }
            break
        case 'stream':
            try {
                data_source.set({ ...new_data_source, auto_refresh: false, cols: await get_stream_cols(data_source.stream_table) })
                
                if (deps.size) 
                    await subscribe_stream(data_source) 
                else if (data_source.filter) {
                    // 订阅一下变量
                    parse_code(data_source.filter_column, data_source)
                    parse_code(data_source.filter_expression, data_source)
                }
                
                if (code === undefined)
                    dashboard.message.success(`${data_source.name} ${t('保存成功')}`)
            } catch (error) {
                dashboard.message.error(error.message)
            }
            break
    }
}

export function delete_data_source (source_id: string): number {
    const data_source = get_data_source(source_id)
    if (data_source.deps.size)
        dashboard.message.error(t('当前数据源已被图表绑定无法删除'))
    else {
        const delete_index = find_data_source_index(source_id)
        data_source.variables.forEach(variable_id => { unsubscribe_variable(data_source, variable_id) })   
        data_sources.splice(delete_index, 1)
        return delete_index
    }
}


function check_name (source_id: string, new_name: string) {
    if (data_sources.find(data_source => data_source.name === new_name && data_source.id !== source_id)) 
        throw new Error(t('该数据源名已存在'))
    else if (new_name.length > 10)
        throw new Error(t('数据源名长度不能大于10'))
    else if (new_name.length === 0)
        throw new Error(t('数据源名不能为空'))
}


export function create_data_source  (new_name: string):  string  {
    const id = String(genid())
    check_name(id, new_name)
    data_sources.unshift(new DataSource(id, new_name))
    return id
}


export function rename_data_source (source_id: string, new_name: string) {
    const data_source = get_data_source(source_id)
    
    new_name = new_name.trim()
    check_name(source_id, new_name)
    data_source.name = new_name
}


export async function subscribe_data_source (widget_option: Widget, source_id: string, message = true) {
    const data_source = get_data_source(source_id)
    
    if (widget_option.source_id && widget_option.source_id !== source_id)
        unsubscribe_data_source(widget_option)  
        
    data_source.deps.add(widget_option.id)
    
    if (data_source.error_message) {
        if (message) 
            dashboard.message.error(t('当前数据源存在错误'))
    } else
        switch (data_source.mode) {
            case 'sql':
                // 有变量需要单独建一个连接，这样在变量更新时可以并发查询
                if (!data_source.ddb && data_source.variables.size)
                    await create_sql_connection()
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
    
    if (data_source.id === '')
        return
    
    data_source.deps.delete(widget_option.id)
    if (!data_source.deps.size) 
        clear_data_source(data_source)  
}


export async function execute (source_id: string) {
    const data_source = get_data_source(source_id)
    
    if (!data_source.id)
        return
    
    switch (data_source.mode) {
        case 'sql':
            try {
                const { type, result } = await dashboard.execute_code(parse_code(data_source.code, data_source), data_source.ddb || model.ddb)
                // console.log(type, data_source.name)
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
                // 切换 dashboard 会关闭轮询的连接，若该连接中仍有排队的任务，此处会抛出“连接被关闭”的错误，此处手动过滤
                if (!data_source.auto_refresh || data_source.ddb)
                    dashboard.message.error(`${error.message} ${data_source.name}`)
                data_source.set({
                    data: [ ],
                    cols: [ ],
                    error_message: error.message
                })
                clear_data_source(data_source)
            } finally {
                break
            }
        case 'stream':
            if (data_source.deps.size) 
                await subscribe_stream(data_source)
    }
}


async function create_sql_connection (): Promise<DDB> {
    const params = new URLSearchParams(location.search)
    const port = params.get('port') || location.port
    const connection = new DDB(
        (model.dev ? (params.get('tls') === '1' ? 'wss' : 'ws') : (location.protocol === 'https:' ? 'wss' : 'ws')) +
            '://' +
            (params.get('hostname') || location.hostname) +
            
            // 一般 location.port 可能是空字符串
            (port ? `:${port}` : '') +
            
            // 检测 ddb 是否通过 nginx 代理，部署在子路径下
            (location.pathname === '/dolphindb/' ? '/dolphindb/' : ''),
        {
            autologin: false,
            verbose: model.verbose,
            sql: model.sql
        }
    )
    
    await connection.connect()
    const ticket = localStorage.getItem(storage_keys.ticket)
    if (ticket)
        await connection.call('authenticateByTicket', [ticket], { urgent: true })
    else {
        const { ddb: { username, password } } = model
        await connection.call('login', [username, password], { urgent: true })
    }
    return connection
}


function create_interval (data_source: DataSource) {
    try {
        if (data_source.auto_refresh) {  
            const interval_id = setInterval(async () => {
                await execute(data_source.id)  
            }, data_source.interval * 1000)
            
            data_source.set({ timer: interval_id })
        }
    } catch (error) {
        dashboard.message.error(`${data_source.name} ${t('轮询启动失败')}`)
        return error
    }
}


async function subscribe_stream (data_source: DataSource) {
    clear_data_source(data_source)
    
    try {
        const { ddb: { username, password } } = model
        let column: DdbObj<DdbValue>
        if (data_source.filter_column) {
            const { type, result } = await dashboard.execute_code(parse_code(data_source.filter_column, data_source))
            if (type === 'success') {
                if (typeof result === 'object' && result) 
                    column = result
            } else 
                throw new Error(result as string)
        }
            
        const stream_connection = new DDB(
            (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + data_source.ip,
            {
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
        dashboard.message.error(`${t('无法订阅到流数据表')} ${data_source.stream_table}`)
        return error
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
                cols: [ ],
                data: [ ],
                deps: Array.from(data_source.deps),
                variables: [ ]
            }
        }
    )
}


export async function import_data_sources (_data_sources: ExportDataSource[]) {
    data_sources = [ ]
    console.log('start', new Date())
    await Promise.all(_data_sources.map(async data_source => new Promise(async () => {
        const import_data_source = new DataSource(data_source.id, data_source.name)
        Object.assign(import_data_source, data_source, { deps: new Set(data_source.deps), variables: import_data_source.variables })
        data_sources.push(import_data_source)
        await save_data_source(import_data_source, import_data_source.code, import_data_source.filter_column, import_data_source.filter_expression)
    })))
    console.log('end', new Date())
    return data_sources
}


export function clear_data_source (data_source: DataSource) {
    const connection = data_source.ddb
    const interval = data_source.timer
    if (interval) {
        clearInterval(interval)
        data_source.timer = null
    }
    if (connection) {
        connection.disconnect()
        data_source.ddb = null
    }
}



export function clear_data_sources () {
    data_sources.forEach(data_source => {
        clear_data_source(data_source)
    })
}


export function get_data_source_copy_infos (source_id: string) {
    const data_source = get_data_source(source_id)
    return { 
        data_source: {
            ...data_source, 
            timer: null,
            ddb: null,
            cols: [ ],
            data: [ ],
            deps: [ ],
            variables: [ ]
        },
        ...get_variable_copy_infos(Array.from(data_source.variables))
    }
}


export function copy_data_source (source_id: string) {
    try {
        copy(JSON.stringify(get_data_source_copy_infos(source_id)))
        dashboard.message.success(t('复制成功'))
     } catch (e) {
        dashboard.message.error(t('复制失败'))
    }
}


export async function paste_data_source (event): Promise<boolean> { 
    const { data_source: _data_source } = safe_json_parse((event.clipboardData).getData('text'))
    // 先校验，重名不粘贴，不重名且 id 不同的直接粘贴，不重名但 id 相同的重新生成 id 后粘贴
    if (!_data_source) 
        return false
    else if (data_sources.findIndex(data_source => data_source.name === _data_source.name) !== -1) {
        dashboard.message.error(`${_data_source.name} ${t('已存在，粘贴失败!')}`)
        return false
    }
        
    
    if (find_data_source_index(_data_source.id) !== -1)
        _data_source.id = String(genid())
    
    await paste_variables(event)
        
    const import_data_source = new DataSource(_data_source.id, _data_source.name)
    Object.assign(import_data_source, _data_source, { deps: import_data_source.deps, variables: import_data_source.variables })
    data_sources.unshift(import_data_source)
    await save_data_source(import_data_source, import_data_source.code, import_data_source.filter_column, import_data_source.filter_expression)
    return true
}

export let data_sources: DataSource[] = [ ]
