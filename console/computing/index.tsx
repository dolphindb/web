import './index.sass'

import { useEffect, useState } from 'react'
import {  Button, Tabs, Table, Tooltip, Popconfirm, type TabsProps, type TablePaginationConfig } from 'antd'
import { ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnType } from 'antd/lib/table/index.js'
import { model } from '../model.js'
import { DdbObj } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'
import { ExpandableConfig, SortOrder } from 'antd/es/table/interface.js'


       
export function Computing () {    
    const [streaming_stat, set_streaming_stat] = useState <Record<string, DdbObj>>()
    
    const [origin_streaming_engine_stat, set_origin_streaming_engine_stat] = useState <Record<string, DdbObj>>()
    
    const [streaming_engine_stat, set_streaming_engine_stat] = useState <Record<string, any>>()
    
    const [expand_streaming_engine_stat, set_expand_streaming_engine_stat] = useState <Record<string, any>>()
    
    const [persistent_table_stat, set_persistent_table_stat] = useState <DdbObj>()
    
    const [shared_table_stat, set_shared_table_stat] = useState <DdbObj>()
    
    const [tab_key, set_tab_key] = useState<string>('streaming_pub_sub_stat')
    
    const tab_content = {
        streaming_pub_sub_stat: {
            title: t('流计算发布订阅状态'),
            refresher: get_streaming_pub_sub_stat
        },
        streaming_engine_stat: {
            title: t('流引擎状态'),
            refresher: get_streaming_engine_stat
        },
        streaming_table_stat: {
            title: t('流表状态'),
            refresher: get_streaming_table_stat
        }
    }
    
    useEffect(() => {
        get_streaming_pub_sub_stat()
        get_streaming_engine_stat()
        get_streaming_table_stat()
    }, [ ])
    
    
    
    async function get_streaming_pub_sub_stat () {
        set_streaming_stat((await model.get_streaming_stat()).to_dict())
    }
    
    
    async function get_streaming_engine_stat () {
        set_origin_streaming_engine_stat((await model.get_streaming_engine_state()).to_dict())
    }
    
    
    async function get_streaming_table_stat () {
        set_persistent_table_stat( await model.get_persistence_stat())
        set_shared_table_stat(await model.get_shared_table_stat())
    }
    
    /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    useEffect(() => {
        if (!origin_streaming_engine_stat)
            return
        const streaming_engine_cols: ColumnType<Record<string, any>>[] = Object.keys(leading_cols.engine).map(col_name => ({
            title: <Tooltip title={col_name} placement='bottom'>
                        <span className='col-title'>
                            {leading_cols.engine[col_name]}
                        </span>
                    </Tooltip>,
            dataIndex: col_name,
            render: value => <span>{value}</span>
        }))
        
        const expand_streaming_engine_cols: ColumnType<Record<string, any>>[] = Object.keys(expanded_cols.engine).map(col_name => ({
            title: <Tooltip title={col_name} placement='bottom'>
                        <span className='col-title'>
                            {expanded_cols.engine[col_name]}
                        </span>
                    </Tooltip>,
            dataIndex: col_name,
            render: value => <span>{value}</span>
        }))
        
        let streaming_engine_rows = [ ]
        let expand_streaming_engine_rows = [ ]
        
        for (let engineType of Object.keys(origin_streaming_engine_stat))
          
            for (let row of origin_streaming_engine_stat[engineType].to_rows()) {
                let new_row = { }
                let expand_new_row = { }
                
                for (let key of Object.keys(leading_cols.engine))  
                    new_row = Object.assign(new_row, { [key]: (row.hasOwnProperty(key) ? row[key] : '') })
                
                for (let key of Object.keys(expanded_cols.engine))  
                    expand_new_row = Object.assign(expand_new_row, { [key]: (row.hasOwnProperty(key) ? row[key] : '') })
                
                new_row = Object.assign(new_row, { engineType })
                expand_new_row = Object.assign(expand_new_row, { name: row.name })
                
                streaming_engine_rows.push(new_row)
                expand_streaming_engine_rows.push(expand_new_row)
            }
        set_streaming_engine_stat({ cols: streaming_engine_cols, rows: streaming_engine_rows })
        set_expand_streaming_engine_stat({ cols: expand_streaming_engine_cols, rows: expand_streaming_engine_rows })
    }, [origin_streaming_engine_stat])
      
    if (!streaming_stat || !origin_streaming_engine_stat || !persistent_table_stat || !shared_table_stat)
        return null
         
    const tabs: TabsProps['items'] = [
        {
            key: 'streaming_pub_sub_stat',
            label: <h2 className='tab-header'>{tab_content.streaming_pub_sub_stat.title}</h2>,
            children:   
            <div className='streaming_pub_sub_stat'>
                <div className='sub-workers'>
                    <StateTable type='subWorkers'
                                cols={ render_title(
                                            translate_order_col(
                                                    set_col_width(
                                                        set_col_color(
                                                            sort_col(streaming_stat.subWorkers.to_cols().filter(
                                                                col => Object.keys(leading_cols.subWorkers).includes(col.title)), 
                                                            'subWorkers'), 'queueDepth'), 'subWorkers')), 
                                                    true, 'subWorkers')}
                                rows={translate_sorter_row(
                                        add_key(streaming_stat.subWorkers.to_rows(), 1))}
                                default_page_size={10}
                                refresher={get_streaming_pub_sub_stat}
                                expandable_config={ {   
                                    expandedRowRender: stat => 
                                        <Table
                                            columns={
                                            render_title(
                                                    streaming_stat.subWorkers.to_cols().filter(col => 
                                                        Object.keys(expanded_cols.subWorkers).includes(col.title)),
                                                    false, 'subWorkers')
                                            }
                                            dataSource={
                                                streaming_stat.subWorkers.to_rows().filter(row => 
                                                    row.topic.slice(row.topic.indexOf('/') + 1) === stat.topic)
                                            }
                                            rowKey={row => row.topic}
                                            pagination={false}
                                            
                                        />
                                    }}/>
                    </div>
                <div className='other-tables'>
                    {['pubTables', 'subConns', 'pubConns'].map(
                    type => <StateTable type={type}
                                        key={type}
                                        cols={render_title(streaming_stat[type].to_cols(), true, type)} 
                                        rows={add_key(streaming_stat[type].to_rows())}    
                                        />
                    )}
                </div>
            </div>
        },
        {
            key: 'streaming_engine_stat',
            label: <h2 className='tab-header'>{tab_content.streaming_engine_stat.title}</h2>,
            children: 
            <div className='streaming-engine-stat'>
                <StateTable type='engine'
                            cols={set_col_ellipsis(
                                    set_col_width(streaming_engine_stat.cols, 'engine'), 'metrics')}
                            rows={add_key(streaming_engine_stat.rows)}
                            default_page_size={20}
                            refresher={get_streaming_engine_stat}
                            expandable_config={ {   
                                expandedRowRender: stat => {
                                    return <Table
                                        columns={
                                            expand_streaming_engine_stat.cols
                                        }
                                        dataSource={
                                            expand_streaming_engine_stat.rows.filter(row => row.name === stat.name)
                                        }
                                        rowKey={row => row.name}
                                        pagination={false}
                                    /> }
                                }}/>
                         
            </div>
        },
        {
            key: 'streaming_table_stat',
            label: <h2 className='tab-header'>{tab_content.streaming_table_stat.title}</h2>,
            children: 
            <div className='persistent-table-stat'>
                <StateTable type='persistenceMeta' 
                            cols={render_title(persistent_table_stat.to_cols(), true, 'persistenceMeta')}
                            rows={add_key(persistent_table_stat.to_rows())} 
                            refresher={get_streaming_table_stat}/>
                {streaming_stat.persistWorkers && <StateTable type='persistWorkers' 
                            cols={render_title(streaming_stat.persistWorkers.to_cols(), true, 'persistWorkers')}
                            rows={add_key(streaming_stat.persistWorkers.to_rows())}/>}
                <StateTable type='sharedStreamingTableStat' 
                            cols={render_title(shared_table_stat.to_cols(), true, 'sharedStreamingTableStat')}
                            rows={add_key(shared_table_stat.to_rows())} 
                            refresher={get_streaming_table_stat}/>
            </div>
        },
        ]
              
    return <Tabs activeKey={tab_key} 
              onChange={set_tab_key} 
              items={tabs} 
              tabBarExtraContent={
              <Button
                icon={<ReloadOutlined/>}
                onClick={async () => {
                    try {
                        tab_content[tab_key].refresher()
                        model.message.success(`${tab_content[tab_key].title}${t('刷新成功')}`)
                    } catch (error) {
                        model.show_error(error)
                        throw error
                    }
                    
                }}>{t('刷新')}
              </Button>
           }/>     
}

interface ButtonProps {
    type: string
    selected: string[]
    refresher: () => void
}

const cols_width = {
    subWorkers: {
        topic: 150,
        lastErrMsg: 200
    },
    engine: {
        engineType: 170,
        lastErrMsg: 200,
        metrics: 120
    }
    
}

const header_text = {
    subWorkers: {
        title: t('订阅线程状态'),
        tip: t('表 SubWorkers 监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。'),
    },
    pubTables:  {
        title: t('流数据表状态'),
        tip: t('表 PubTables 监控流数据表状态。每一行表示一个流数据表的信息。')
    },
    subConns: {
        title: t('订阅状态'), 
        tip: t('表 SubConns 监控本地订阅节点和订阅节点之间的连接状态。') 
    },
    pubConns: { 
        title: t('发布状态'), 
        tip: t('表 PubConns 监控本地发布节点和它的所有订阅节点之间的连接状态。') 
    },
    persistWorkers: {
        title: t('持久化线程状态'), 
        tip: t('表 PersistWorkers 监控负责持久化流数据表的工作线程的状态。'),
    },
    persistenceMeta: {
        title: t('持久化共享流表状态'), 
        tip: t('表 PersistenceMeta 返回启用了持久化的共享流数据表的元数据。'),
    },
    sharedStreamingTableStat: {
        title: t('非持久化共享流表状态'), 
        tip: t('表 sharedStreamingTableStat 返回未启用持久化的共享流数据表的元数据。'),
    },
    engine: {
        title: t('流引擎状态'),
        tip: t('表 EngineStat 返回流计算引擎的状态。'),
    },
}

const button_text = {
    subWorkers: {
        button_text: t('批量取消订阅'),
        confirm_text: t('确认取消订阅选中的流数据表吗？')
    },
    engine: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的引擎吗？')
    },
    persistenceMeta: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的持久化共享数据流表吗？')
    },
    sharedStreamingTableStat: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的共享流数据表吗？')
    }
}

const leading_cols = {
    subWorkers: {
        workerId: t('线程 ID'),
        topic: t('订阅主题'),
        queueDepth: t('订阅队列深度'),
        queueDepthLimit: t('订阅队列深度上限'),
        lastErrMsg: t('最近处理失败的错误信息'),
        lastFailedTimestamp: t('最近处理失败的时刻'),
        failedMsgCount: t('处理失败的消息总数'),
        processedMsgCount: t('已处理消息数'),
        lastMsgId: t('最近消息 ID'),
        lastFailedMsgId: t('最近处理失败的消息 ID')
    },
    pubTables: {
        tableName: t('共享流数据表'),
        subscriber: t('订阅节点'),
        msgOffset: t('最近消息的偏移量'),
        actions: t('订阅任务')
    },
    pubConns: {
        client: t('订阅节点'),
        queueDepthLimit: t('发布队列深度上限'),
        queueDepth: t('发布队列深度'),
        tables: t('共享流数据表')
    },
    subConns: {
        publisher: t('发布节点'),
        cumMsgCount: t('接收消息总量'),
        cumMsgLatency: t('接收消息平均延迟'),
        LastMsgLatency: t('最近消息的延迟'),
        lastUpdate: t('最近消息的接收时刻')
    },
    persistenceMeta: {
        tablename: t('表名'),
        totalSize: t('总行数'),
        sizeInMemory: t('内存中行数'),
        memoryOffset: t('内存中偏移量'),
        sizeOnDisk: t('磁盘中行数'),
        diskOffset: t('磁盘中偏移量'),
        asynWrite: t('是否异步持久化'),
        retentionMinutes: t('保留时间'),
        compress: t('是否压缩'),
        persistenceDir: t('持久化路径'),
        hashValue: t('持久化线程'),
        raftGroup: t('Raft 组'),
        lastLogSeqNum: t('Raft 日志序号')
    },
    persistWorkers: {
        workerId: t('线程 ID'),
        queueDepthLimit: t('订阅队列深度上限'),
        queueDepth: t('订阅队列深度'),
        tables: t('共享流数据表')
    },
    sharedStreamingTableStat: {
        tableName: t('表名'),
        rows: t('行数'),
        columns: t('列数'),
        bytes: t('字节数'),
        
    },
    engine: {
        name: t('引擎名'),
        engineType: t('引擎类型'),
        lastErrMsg: t('最近错误信息'),
        numGroups: t('分组数'),
        numRows: t('行数（单表）'),
        leftTableNumRows: t('行数（左表）'),
        rightTableNumRows: t('行数（右表）'),
        memoryUsed: t('内存'),
        garbageSize: t('内存清理阈值'),
        numMetrics: t('指标数量'),
        metrics: t('指标源码'),
        user: t('用户'),
        status: t('状态')
    }
}

const expanded_cols = {
    subWorkers: {
        batchSize: '批次大小',
        throttle: '等待间隔',
        filter: '过滤列',
        msgAsTable: '消息是否为表',
        hash: '订阅 hash 值',
        persistOffset: '开启订阅偏移持久化',
        timeTrigger: '强制按时间间隔触发',
        handlerNeedMsgId: '包含消息 ID',
        raftGroup: '高可用组'
    },
    engine: {
        windowTime: t('窗口长度'),
        step: t('步长'),
        useSystemTime: t('是否使用系统时间'),
        snapshotDir: t('快照目录'),
        snapshotInterval: t('快照间隔'),
        snapshotMsgId: t('快照 ID'),
        snapshotTimestamp: t('快照时间戳'),
        triggeringPattern: t('触发方式'),
        triggeringInterval: t('触发间隔'),
        sessionGap: t('时间间隔'),
        delayedTime: t('等待时间间隔'),
        filters: t('过滤条件')
    }
}

const pagination: TablePaginationConfig = {
    defaultPageSize: 5,
    pageSizeOptions: ['5', '10', '20', '50', '100'],
    size: 'small',
    showSizeChanger: true,
    showQuickJumper: true,
}

 /** 渲染表头 */
 function render_table_header (talbe_name: string, button_props?: ButtonProps) {
    const {  type, selected, refresher: refresher } = button_props || { }
    return <>
        {type && <Popconfirm title={button_text[type].confirm_text} disabled={!selected.length} onConfirm={async () => handle_delete(type, selected, refresher)}>
                    <Button className='title-button' danger disabled={!selected.length}>{button_text[type].button_text}</Button>
                </Popconfirm>}
        <Tooltip className='table-name' title={header_text[talbe_name].tip}>{header_text[talbe_name].title}</Tooltip>
        <Tooltip title={header_text[talbe_name].tip}><QuestionCircleOutlined/></Tooltip>
    </>
}


/** 缩短 subWorkers 表的 topic 字段 */
function translate_sorter_row (rows: Record<string, any>) {
    return rows.map(row => {
        row.topic = row.topic.slice(row.topic.indexOf('/') + 1)
        return row
    })
}


/** 按照主要列（leading_cols）的顺序进行排序 */
function sort_col (cols: ColumnType<Record<string, any>>[], type: string) {
    let sorted_cols: ColumnType<Record<string, any>>[] =  [ ]
    for (let col_name of Object.keys(leading_cols[type])) 
        sorted_cols.push(cols.find(({ title }) => title === col_name))
    return sorted_cols
}


/** 将 subworker 表按照 QueueDepth 和 LastErrMsg 排序 */
function translate_order_col (cols: ColumnType<Record<string, any>>[]) {

    const i_queue_depth_col = cols.findIndex(col => col.title === 'queueDepth')
    const i_last_err_msg_col = cols.findIndex(col => col.title === 'lastErrMsg')
    const msg_order_function = (a: Record<string, any>, b: Record<string, any>) => {  
                                            if (a.lastErrMsg && !b.lastErrMsg)
                                                return 1
                                            else if (b.lastErrMsg && !a.lastErrMsg)
                                                return -1 
                                            return 0
                                            }           
    cols[i_queue_depth_col] = { ...cols[i_queue_depth_col], sorter: (a: Record<string, any>, b: Record<string, any>) => Number(a.queueDepth) - Number(b.queueDepth), sortDirections: ['descend' as SortOrder] }
    cols[i_last_err_msg_col] = { ...cols[i_last_err_msg_col], sorter: msg_order_function, sortDirections: ['descend' as SortOrder] }
    return cols  
}


/** 增加 key */
function add_key (table: Record<string, any>, key_index = 0) {
    console.log('add_key', table, typeof table)
    const { title = '' } = table
    return table.map((row: object, idx: number) => { 
        return { ...row, key: title.includes('Conns') ? idx : Object.values(row)[key_index] } })
}


/** 翻译表头，添加 tooltip */
function render_title (cols: ColumnType<Record<string, any>>[], is_leading: boolean, type: string) {
    for (let col of cols) { 
        let title = col.title as string
        col.title = <Tooltip title={title} placement='bottom'>
                        <span className='col-title'>
                            {is_leading ? leading_cols[type][title] : expanded_cols[type][title]}
                        </span>
                    </Tooltip>     
    }
    return cols  
}


/** 给 subWorkers 的 queueDepth 字段添加警告颜色 */
function set_col_color (cols: ColumnType<Record<string, any>>[], col_name: string) {
    let col = cols.find(({ dataIndex }) => dataIndex === col_name)
    col.render = value => {
        let color = 'green'
        if (value >= 1n && value < 10000n)
            color = 'orange'
        else if (value >= 10000n)
            color = 'red'
        return <Tooltip title={t('0 为绿色，1-10000 为橙色，10000 以上为红色。')}>
                    <span className={color}>{Number(value)}</span>
                </Tooltip>
    }
    return cols
}


/** 设置列宽 */
function set_col_width (cols: ColumnType<Record<string, any>>[], type: string) {
    for (let width_key of Object.keys(cols_width[type])) {
        let col = cols.find(col => col.dataIndex === width_key)
        col.width = cols_width[type][width_key]
    }
    return cols
}


/** 设置单元格自动省略 */
function set_col_ellipsis (cols: ColumnType<Record<string, any>>[], col_name: string) {
    let col = cols.find(({ dataIndex }) => dataIndex === col_name)
    col.ellipsis = { showTitle: true }
    col.render = value => <Tooltip placement='topLeft' title={value}>{value}</Tooltip>
    return cols
}


/** 取消订阅 */
async function unsubscribe_tables (pub_tables: string[]) {
    const topics =  pub_tables.map(pub_table => { const pub_table_arr = pub_table.split('/') 
                                                  return { table_name: pub_table_arr[1], action_name: pub_table_arr[2] }
                                                })                                       
    try {
        await Promise.all(topics.map(async topic => model.unsubscribe_table(topic.table_name, topic.action_name)))
        model.message.success(t('取消订阅成功'))
    } catch (error) {
        model.show_error({ error })
    }
}


/** 删除引擎 */
async function drop_engines (engine_names: string[]) {
    try {
        await Promise.allSettled(engine_names.map(async engine_name => model.drop_streaming_engine(engine_name)))
        model.message.success(t('引擎删除成功'))
    } catch (error) {
        model.show_error({ error })
    }
}   


/** 删除共享数据流表 */
async function drop_stream_tables (streaming_table_names: string[]) {
    console.log('🚀 ~ file: index.tsx:410 ~ drop_stream_tables ~ streaming_table_names:', streaming_table_names)
    try {
        await Promise.allSettled(streaming_table_names.map(async streaming_table_name => model.drop_streaming_table(streaming_table_name)))
        model.message.success(t('流数据表删除成功'))
    } catch (error) {
        model.show_error({ error })
    }
}    


/** 统一处理删除 */
async function handle_delete (type: string, selected: string[], refresher: () => void) {
    switch (type) {
        case ('SubWorkers'):
            await unsubscribe_tables(selected)
            break
        case ('PersistenceMeta'):
        case ('SharedStreamingTableStat'):
            await drop_stream_tables(selected)
            break
        case ('engine'):
            await drop_engines(selected)         
    }
    refresher()   
}


function StateTable ({
    type,
    cols,
    rows,
    default_page_size = 5,
    refresher,
    expandable_config,
}: {
    type: string
    cols: ColumnType<Record<string, any>>[]
    rows: Record<string, any>[]
    default_page_size?: number
    refresher?: () => void
    expandable_config?: ExpandableConfig<Record<string, any>>
}) {
    const [selected, set_selected] = useState<string[]>([ ]) 
    
    return  <Table  tableLayout='fixed'
                    rowSelection={ refresher ? 
                                        { 
                                          type: 'checkbox', 
                                          onChange: (selected_keys: React.Key[]) => set_selected(selected_keys as string[]) 
                                        }
                                            : null
                                }   
                    columns={cols}
                    dataSource={rows} 
                                           
                    expandable={ expandable_config ? expandable_config : null } 
                    size='small'
                    title={() => render_table_header( type, 
                                                      refresher ? 
                                                            {
                                                                type: type,
                                                                selected,
                                                                refresher
                                                            } 
                                                                : null
                                )} 
                    pagination={{ ...pagination, defaultPageSize: default_page_size }}
                />
    
}
