import { Model } from 'react-object-model'
import { genid } from 'xshell/utils.browser.js'
import { DDB, type DdbType, type DdbObj, type DdbValue, DdbForm, type DdbTable } from 'dolphindb/browser.js'
import { cloneDeep } from 'lodash'
import copy from 'copy-to-clipboard'

import { t } from '@i18n'
import { model, storage_keys } from '@model'

import { type Widget, dashboard } from '@/dashboard/model.ts'
import { sql_formatter, get_cols, stream_formatter, parse_code, safe_json_parse, get_sql_col_type_map, get_streaming_col_type_map } from '@/dashboard/utils.ts'
import { get_variable_copy_infos, paste_variables, unsubscribe_variable } from '@/dashboard/Variable/variable.ts'


export type DataType = { }[]

export type DataSourcePropertyType = string | number | boolean | string[] | DataType

export type ExportDataSource = {
    id: string
    name: string
    type: DdbForm
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


export class DataSource <TDataRow = any> extends Model<DataSource<any>>  {
    id: string
    
    name: string
    
    type: DdbForm
    
    mode: 'sql' | 'stream' = 'sql'
    
    max_line: number = null
    
    data: TDataRow[] = [ ]
    
    cols: string[] = [ ]
    
    /** map 类型，存储了每一列对应的 DDB 类型 ID */
    type_map: Record<string, DdbType>
    
    deps: Set<string> = new Set()
    
    variables: Set<string> = new Set()
    
    error_message = ''
    
    ddb: DDB
    
    // --- sql 模式专用
    auto_refresh = false
    
    code = ''
    
    interval = 1
    
    timer: NodeJS.Timeout
    
    // --- stream 模式专用
    filter = false
    
    stream_table = ''
    
    filter_column = ''
    
    filter_expression = ''
    
    ip = ''
    
    
    constructor (id: string, name: string, type: DdbForm) {
        super()
        
        this.id = id
        this.name = name
        this.type = type
    }
}


export function find_data_source_index (source_id: string): number {
    return data_sources.findIndex(data_source => data_source.id === source_id)
} 


export function get_data_source (source_id: string): DataSource {
    return data_sources[find_data_source_index(source_id)] || new DataSource('', '', DdbForm.table)
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
                            // 暂时只支持 table, matrix
                            if (result.form !== new_data_source.type && code === undefined) { 
                                dashboard.message.error(t('sql 执行得到的数据类型与数据源类型不符，请修改'))
                                return
                            }
                            new_data_source.data = sql_formatter(result, new_data_source.max_line)
                            new_data_source.cols = get_cols(result)
                            new_data_source.type_map = result.form === DdbForm.table ? get_sql_col_type_map(result as unknown as DdbTable) : { }
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
                new_data_source.type_map = { }
                if (code === undefined)
                    dashboard.message.error(error.message)
            } finally {
                data_source.set({ ...new_data_source })
                if ((data_source.error_message || !deps.size) && data_source.ddb) {
                    data_source.ddb.disconnect()
                    data_source.ddb = null 
                }
                if (deps.size && !data_source.error_message && data_source.auto_refresh) 
                    create_interval(data_source)                    
            }
            break
        case 'stream':
            try {
                data_source.set({
                    ...new_data_source,
                    auto_refresh: false,
                    cols: await get_stream_cols(data_source.stream_table),
                    type_map: await get_streaming_col_type_map(new_data_source.stream_table)
                })
                
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


export function create_data_source  (new_name: string, type: DdbForm):  DataSource  {
    const id = String(genid())
    check_name(id, new_name)
    const new_data_source = new DataSource(id, new_name, type)
    data_sources.unshift(new_data_source)
    return new_data_source
}


export function rename_data_source (source_id: string, new_name: string) {
    const data_source = get_data_source(source_id)
    
    new_name = new_name.trim()
    check_name(source_id, new_name)
    data_source.name = new_name
}


export async function subscribe_data_source (widget_option: Widget, source_id: string, message = true) {
    const data_source = get_data_source(source_id)
    console.log(data_source, widget_option, 'source_id')
    
    if (widget_option.source_id && !widget_option.source_id.includes(source_id))
        unsubscribe_data_source(widget_option)  
        
    data_source.deps.add(widget_option.id)
    
    if (data_source.error_message) {
        if (message) 
            dashboard.message.error(t('当前数据源存在错误'))
    } else
        switch (data_source.mode) {
            case 'sql':
                data_source.ddb ??= await create_sql_connection()
                
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
    source_id.forEach(id => { 
        const data_source = get_data_source(id)
    
        if (data_source.id === '')
            return
        
        data_source.deps.delete(widget_option.id)
        if (!data_source.deps.size) 
            clear_data_source(data_source)  
    })
}


export async function execute (source_id: string) {
    const data_source = get_data_source(source_id)
    
    if (!data_source.id)
        return
    
    switch (data_source.mode) {
        case 'sql':
            try {
                const { type, result } = await dashboard.execute_code(
                    parse_code(data_source.code, data_source),
                    data_source.ddb || model.ddb)
                
                switch (type) {
                    case 'success':
                        // 暂时只支持 table
                        if (typeof result === 'object' && result)
                            data_source.set({
                                data: sql_formatter(result, data_source.max_line),
                                cols: get_cols(result),
                                // 仅 table 有此字段
                                type_map: result.form === DdbForm.table ? get_sql_col_type_map(result as unknown as DdbTable) : undefined,
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
            }
            
            break
        case 'stream':
            if (data_source.deps.size) 
                await subscribe_stream(data_source)
    }
}


async function create_sql_connection (): Promise<DDB> {
    const params = new URLSearchParams(location.search)
    const connection = new DDB(
        (model.dev ? (params.get('tls') === '1' ? 'wss' : 'ws') : (location.protocol === 'https:' ? 'wss' : 'ws')) +
            '://' + model.hostname +
            
            // model.port 可能是空字符串
            (model.port ? `:${model.port}` : '') +
            
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
    data_source.set({
        timer: setInterval(
            async () => {
                await execute(data_source.id)
            },
            data_source.interval * 1000
        )
    })
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
                            
                            data_source.data.push(...stream_formatter(message.obj, data_source.max_line, data_source.cols))
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
        console.error(error)
        dashboard.message.error(`${t('无法订阅到流数据表')} ${data_source.stream_table} (${error.message})`)
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
        data_source => ({ 
                ...data_source, 
                timer: null,
                ddb: null,
                cols: [ ],
                data: [ ],
                deps: Array.from(data_source.deps),
                variables: [ ]
            })
    )
}


export async function import_data_sources (_data_sources: ExportDataSource[]) {
    data_sources = [ ]
    
    await Promise.all(_data_sources.map(async data_source => new Promise(async (resolve, reject) => {
        const import_data_source = new DataSource(data_source.id, data_source.name, data_source.type)
        Object.assign(import_data_source, data_source, { deps: new Set(data_source.deps), variables: import_data_source.variables })
        data_sources.push(import_data_source)
        await save_data_source(import_data_source, import_data_source.code, import_data_source.filter_column, import_data_source.filter_expression)
        resolve(true)
    })))
    
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
     } catch {
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
        
    const import_data_source = new DataSource(_data_source.id, _data_source.name, _data_source.type)
    Object.assign(import_data_source, _data_source, { deps: import_data_source.deps, variables: import_data_source.variables })
    data_sources.unshift(import_data_source)
    await save_data_source(import_data_source, import_data_source.code, import_data_source.filter_column, import_data_source.filter_expression)
    return true
}

export let data_sources: DataSource[] = [ ]
