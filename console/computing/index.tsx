import './index.sass'

import { useEffect, useState } from 'react'
import {  Button, Table, Typography, Tooltip, Popconfirm, type TablePaginationConfig } from 'antd'
import { ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnType } from 'antd/lib/table/index.js'

import { model } from '../model.js'
import { DdbObj, DdbValue } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'
import { FixedType } from 'rc-table/lib/interface.js'

const { Title } = Typography
       
export function Computing () {
    const [refresher, set_refresher] = useState({ })
    
    const [streaming_stat, set_streaming_stat] = useState <Record<string, DdbObj>>()
    
    const [streaming_engine_stat, set_streaming_engine_stat] = useState <Record<string, DdbObj>>()
    
    const [persistent_table_stat, set_persistent_table_stat] = useState <DdbObj>()
    
    const [shared_table_stat, set_shared_table_stat] = useState <DdbObj>()
        
    useEffect(() => {
        get_streaming_stat() 
        get_streaming_engine_stat()
        get_persist_stat()
        get_shared_table_stat()
        if (streaming_stat)
            console.log('streaming_stat:', streaming_stat)
        if (streaming_engine_stat) 
            console.log('streaming_engine_stat:', streaming_engine_stat)
        if (persistent_table_stat) 
            console.log('persistent_table_stat:', persistent_table_stat)
        if (shared_table_stat)
            console.log('shared_table_stat', shared_table_stat)
    }, [refresher])
    
    
    async function get_streaming_stat () {
        set_streaming_stat((await model.get_streaming_stat()).to_dict())
    }
    
    
    async function get_streaming_engine_stat () {
        set_streaming_engine_stat((await model.get_streaming_engine_state()).to_dict())
    }
    
    
    async function get_persist_stat () {
        set_persistent_table_stat(await model.get_persistence_stat())
    }
   
    
    async function get_shared_table_stat () {
        set_shared_table_stat(await model.get_shared_table_stat())
    }
    
    
    if (!streaming_stat || !streaming_engine_stat || !persistent_table_stat || !shared_table_stat)
        return null
            
    return <> 
        <div className='action'>
            <Button
                icon={<ReloadOutlined/>}
                onClick={async () => {
                    set_refresher({ })
                    model.message.success(t('流计算状态刷新成功'))
            }}>{t('刷新')}</Button>
        </div>
        <div>
            <div className='streaming-stat'>
                <Title level={4}><Tooltip>{t('流计算状态')}</Tooltip></Title>
                {['SubWorkers', 'PubTables', 'SubConns', 'PubConns'].map(
                    type => <TableStat type={type as keyof typeof title_text} 
                                       data_source={streaming_stat[type.charAt(0).toLowerCase() + type.slice(1)]} 
                                       fixed_column={type === 'SubWorkers' ? ['workerId', 'topic'] : [ ]}
                                       refresh={get_streaming_stat}/>
                )}
            </div>
            <div className='streaming-engine-stat'>
                <Title level={4}><Tooltip>{t('流计算引擎状态')}</Tooltip></Title>
                {Object.keys(streaming_engine_stat).map(type => <TableStat type={type as keyof typeof title_text} 
                                                                           data_source={streaming_engine_stat[type]} 
                                                                           fixed_column={['name']}
                                                                           refresh={get_streaming_engine_stat}/>)}
            </div>
            <div className='persistent-table-stat'>
                <Title level={4}><Tooltip>{t('持久化共享流数据表')}</Tooltip></Title>
                <TableStat type='PersistenceMeta' 
                           data_source={persistent_table_stat} 
                           fixed_column={['tablename']}
                           refresh={get_persist_stat}/>
                <TableStat type='PersistWorkers' 
                           data_source={streaming_stat.persistWorkers} 
                           fixed_column={[ ]}
                           refresh={get_streaming_stat}/>
            </div>
            <div className='share-streaming-table-stat'>
                <Title level={4}><Tooltip>{t('非持久化共享流数据表')}</Tooltip></Title>
                <TableStat type='SharedStreamingTableStat' 
                           data_source={shared_table_stat} 
                           fixed_column={[ ]}
                           refresh={get_shared_table_stat}/>
            </div>
        </div>
    </>
}

interface ButtonProps {
    type: string
    selected: string[] | PubTable[]
}

interface PubTable {
    table_name: string
    action: string
}

const title_text = {
    SubWorkers: t('表 SubWorkers 监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。'),
    PubTables:  t('表 PubTables 监控流数据表状态。每一行表示一个流数据表的信息。'),
    SubConns: t('表 SubConns 监控本地订阅节点和订阅节点之间的连接状态。'),
    PubConns: t('表 PubConns 监控本地发布节点和它的所有订阅节点之间的连接状态。'),
    PersistWorkers: t('表 PersistWorkers 监控负责持久化流数据表的工作线程的状态。'),
    PersistenceMeta: t('表 PersistenceMeta 返回启用了持久化的共享流数据表的元数据。'),
    SharedStreamingTableStat: t('表 SharedStreamingTableStat 返回启用了持久化的共享流数据表的元数据。'),
    TimeSeriesEngine: t('表 TimeSeriesEngine 返回时间序列引擎的状态。'),
    CrossSectionalEngine: t('表 CrossSectionalEngine 返回横截面聚合引擎的状态。'),
    AnomalyDetectionEngine: t('表 AnomalyDetectionEngine 返回异常检测引擎的状态。'),
    ReactiveStreamEngine: t('表 ReactiveStreamEngine 返回响应式状态引擎的状态。'),
    SessionWindowEngine: t('表 SessionWindowEngine 返回会话窗口引擎的状态。'),
    DailyTimeSeriesEngine: t('表 DailyTimeSeriesEngine 返回日级时间序列引擎的状态。'),
    AsofJoinEngine: t('表 AsofJoinEngine 返回 asof join 引擎的状态。'),
    EqualJoinEngine: t('表 equiJoinEngine 返回 equi join 引擎的状态。'),
    StreamFilter: t('表 StreamFilter 返回流数据过滤引擎的状态。'),
    StreamingDispatchEngine: t('表 StreamDispatchEngine 返回流数据分发引擎的状态。')
}

const button_text = {
    PubTables: {
        button_text: t('批量取消订阅'),
        confirm_text: t('确认取消订阅选中的流数据表吗？')
    },
    Engine: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的引擎吗？')
    },
    PersistenceMeta: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的持久化共享数据流表吗？')
    },
    SharedStreamingTableStat: {
        button_text: t('批量删除'),
        confirm_text: t('确认删除选中的共享流数据表吗？')
    }
}

const pagination: TablePaginationConfig = {
    defaultPageSize: 5,
    pageSizeOptions: ['5', '10', '20', '50', '100'],
    size: 'small',
    showSizeChanger: true,
    showQuickJumper: true,
}

function TableStat ({
    type,
    data_source,
    fixed_column,
    refresh
}: {
    type: string
    data_source: DdbObj<DdbValue>
    fixed_column: string[]
    refresh: () => void
}) {    
    const has_check_col = type in button_text || type.includes('Engine')
    const [selected_table_names, set_selected_table_names] = useState<string[]>([ ])
    function render_table_name (talbe_name: string, tip: string, button_props?: ButtonProps) {
        const {  type, selected } = button_props || { }
        const button_type = type in button_text ? type : 'Engine'
        return <>
            {type && <Popconfirm title={button_text[button_type].confirm_text} disabled={!selected.length} onConfirm={async () => handle_delete(type, selected)}>
                        <Button className='title-button' danger disabled={!selected.length}>{button_text[button_type].button_text}</Button>
                    </Popconfirm>}
            <h3 className='table-name'>{talbe_name}</h3>
            <Tooltip title={tip}><QuestionCircleOutlined/></Tooltip>
        </>
    }
    
    
    function translate_fixed_col (cols: ColumnType<Record<string, any>>[], col_names: string[]) {
        for (let col_name of col_names) {
            const i_col = cols.findIndex(col => col.title === col_name)
            const fixed_col = { ...cols[i_col], fixed: 'left' as FixedType }
            cols.splice(i_col, 1, fixed_col)
        }
        return cols
    }
    
    
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
        const order_queue_depth_col = { ...cols[i_queue_depth_col], sorter: (a: Record<string, any>, b: Record<string, any>) => a.queueDepth - b.queueDepth, sortOredr: 'descend' }
        const order_last_err_msg_col = { ...cols[i_last_err_msg_col], sorter: msg_order_function, sortOredr: 'descend' }
        cols.splice(i_queue_depth_col, 1, order_queue_depth_col)
        cols.splice(i_last_err_msg_col, 1, order_last_err_msg_col) 
        return cols  
    }
    
    
    function add_key (table: Record<string, any>) {
        return table.map((row: { [s: string]: unknown } | ArrayLike<unknown>) => { return { ...row, key: Object.values(row)[0] } })
    }
    
    
    async function unsubscribe_tables (pubTables: PubTable[]) {
        console.log('pubTables:', pubTables)
        try {
            await Promise.all(pubTables.map(async pubTable => model.unsubscribe_table(pubTable.table_name, pubTable.action)))
            model.message.success(t('取消订阅成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    
    async function drop_engines (engine_names: string[]) {
        try {
            await Promise.allSettled(engine_names.map(async engine_name => model.drop_streaming_engine(engine_name)))
            model.message.success(t('引擎删除成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }   
    
        
    async function drop_stream_tables (streaming_table_names: string[]) {
        try {
            await Promise.allSettled(streaming_table_names.map(async streaming_table_name => model.drop_streaming_table(streaming_table_name)))
            model.message.success(t('流数据表删除成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }    
    
    
    async function handle_delete (type: string, selected: string[] | PubTable[]) {
        switch (type) {
            case ('PubTables'):
                await unsubscribe_tables(selected as PubTable[])
                break
            case ('PersistenceMeta'):
            case ('SharedStreamingTableStat'):
                await drop_stream_tables(selected as string[])
                break
            default:
                await drop_engines(selected as string[])         
        }
        refresh()    
    }
    
    
    return  <Table rowSelection={ has_check_col ? 
                                            { type: 'checkbox', 
                                              onChange: (selected_keys: React.Key[]) => set_selected_table_names(selected_keys as string[]) 
                                            }
                                                : 
                                            null} 
                   columns={type === 'SubWorkers' ?
                                                translate_order_col(
                                                    translate_fixed_col(
                                                        data_source.to_cols(), fixed_column))
                                                  :
                                                translate_fixed_col(data_source.to_cols(), fixed_column)} 
                   dataSource={add_key(data_source.to_rows())} 
                   title={() => render_table_name( type, 
                                                   title_text[type],
                                                   has_check_col
                                                        ? {
                                                    type,
                                                    selected: type === 'PubTables' ? 
                                                                                data_source.to_rows().
                                                                                                filter(row => selected_table_names.includes(row.tableName)).
                                                                                                    map(row => { return { table_name: row.tableName, action: row.actions } }) 
                                                                                   : 
                                                                                selected_table_names,
                                                    } 
                                                        : null)} 
                   pagination={pagination}
                   scroll={{ x: true }}/>
}
