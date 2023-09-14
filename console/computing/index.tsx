import './index.sass'

import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'

import { Button, Tabs, Table, Tooltip, Typography, Spin, Result, type TableColumnType, Input, Modal, List } from 'antd'

import { ReloadOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'

import type { SortOrder } from 'antd/es/table/interface.js'

import { DDB, DdbObj } from 'dolphindb/browser.js'

import { model, NodeType } from '../model.js'
import { computing } from './model.js'

import { t } from '../../i18n/index.js'

import SvgPublish from './icons/publish.icon.svg'
import SvgEngine from './icons/engine.icon.svg'
import SvgTable from './icons/table.icon.svg'
import { use_modal } from 'react-object-model/modal'


export function Computing () {
    const [streaming_stat, set_streaming_stat] = useState<Record<string, DdbObj>>()
    
    const [origin_streaming_engine_stat, set_origin_streaming_engine_stat] = useState<Record<string, DdbObj>>()
    
    const [persistent_table_stat, set_persistent_table_stat] = useState<DdbObj>()
    
    const [shared_table_stat, set_shared_table_stat] = useState<DdbObj>()
    
    const [tab_key, set_tab_key] = useState<string>('streaming_pub_sub_stat')
    
    const { ddb, logined, node_type } = model.use(['ddb', 'logined', 'node_type'])
    
    useEffect(() => {
        if (!logined || node_type === NodeType.controller)
            return
        ;(async () => {
            try {
                if (!computing.inited)
                    await computing.init()
                await get_streaming_pub_sub_stat()
                await get_streaming_engine_stat()
                await get_streaming_table_stat()
            } catch (error) {
                model.show_error(error)
            }
        })()
    }, [ ])
    
    if (node_type === NodeType.controller)
        return <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持流数据的发布订阅，请跳转到数据节点或计算节点查看流数据状态。')}
        />
    
    if (!logined)
        return <Result
            status='warning'
            className='interceptor'
            title={t('登录后可查看当前节点流计算状态')}
            extra={
                <Button type='primary' onClick={() => model.goto_login()}>
                    {t('去登录')}
                </Button>
            }
        />
    
    const tab_content = {
        streaming_pub_sub_stat: {
            title: t('流计算发布订阅状态'),
            refresher: get_streaming_pub_sub_stat
        },
        streaming_engine_stat: {
            title: t('流计算引擎状态'),
            refresher: get_streaming_engine_stat
        },
        streaming_table_stat: {
            title: t('流数据表状态'),
            refresher: get_streaming_table_stat
        }
    }
    
    /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    async function get_streaming_pub_sub_stat () {
        set_streaming_stat((await ddb.call<DdbObj<DdbObj[]>>('getStreamingStat', [ ], { urgent: true })).to_dict())
    }
    
    async function get_streaming_engine_stat () {
        set_origin_streaming_engine_stat((await ddb.call<DdbObj<DdbObj[]>>('getStreamEngineStat', [ ], { urgent: true })).to_dict())
    }
    
    async function get_streaming_table_stat () {
        set_persistent_table_stat(await ddb.call<DdbObj<DdbObj[]>>('get_persistence_stat', [ ], { urgent: true }))
        set_shared_table_stat(await ddb.call<DdbObj<DdbObj[]>>('get_shared_table_stat', [ ], { urgent: true }))
    }
    
    if (!streaming_stat || !origin_streaming_engine_stat || !persistent_table_stat || !shared_table_stat)
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    const streaming_engine_cols: TableColumnType<Record<string, any>>[] = Object.keys(leading_cols.engine).map(col_name => ({
        title: <Tooltip title={col_name.charAt(0).toUpperCase() + col_name.slice(1)}>
                    <span className='col-title'>{leading_cols.engine[col_name]}</span>
                </Tooltip>,
        dataIndex: col_name,
        render: value => <span>{value}</span>
    }))
    
    let streaming_engine_rows = [ ]
    
    for (let engineType of Object.keys(origin_streaming_engine_stat))
        for (let row of origin_streaming_engine_stat[engineType].to_rows()) {
            let new_row = { }
            
            for (let key of Object.keys(leading_cols.engine))
                new_row[key] = row.hasOwnProperty(key) ? row[key] : ''
            
            for (let key of Object.keys(expanded_cols.engine[engineType]))
                new_row[key] = row.hasOwnProperty(key) ? row[key] : '' 
                
            new_row = Object.assign(new_row, { engineType })
            
            streaming_engine_rows.push(new_row)
        }
    
    return  <Tabs
                activeKey={tab_key}
                type='card'
                onChange={set_tab_key}
                items={[
                    {
                        key: 'streaming_pub_sub_stat',
                        label:  <label className='tab-header'>
                                    <div className='tab-icon sm-font'><SvgPublish/></div>{tab_content.streaming_pub_sub_stat.title}
                                </label>,
                        children: (
                            <div className='streaming_pub_sub_stat'>
                                <StateTable
                                    type='subWorkers'
                                    cols={set_col_width(
                                            add_details_col(
                                                render_col_title(
                                                    translate_order_col(
                                                        set_col_color(
                                                            sort_col(
                                                                streaming_stat.subWorkers
                                                                    .to_cols()
                                                                    .filter(col => col.title in leading_cols.subWorkers),
                                                                'subWorkers'
                                                            ),
                                                            'queueDepth'
                                                        ),
                                                    true
                                                ),
                                             'subWorkers')), 'subWorkers')
                                        }
                                    rows={add_details_row(
                                            add_unit(
                                                handle_ellipsis_col(
                                                    add_key(streaming_stat.subWorkers.to_rows(), 1), 'lastErrMsg'), 'subWorkers'))}
                                    min_width={1420}
                                    default_page_size={10}
                                    refresher={get_streaming_pub_sub_stat}
                                />
                                
                                <StateTable
                                    type='pubConns'
                                    cols={set_col_color(
                                            render_col_title(streaming_stat.pubConns.to_cols(), 'pubConns'), 'queueDepth')}
                                    rows={handle_ellipsis_col(
                                            add_key(streaming_stat.pubConns.to_rows()), 'tables')}
                                    separated={false}         
                                />
                            </div>
                        )
                    },
                    {
                        key: 'streaming_engine_stat',
                        label:  <label className='tab-header'>
                                    <div className='tab-icon'><SvgEngine/></div>{tab_content.streaming_engine_stat.title}
                                </label>,
                        children: (
                            <div className='streaming-engine-stat'>
                                <StateTable
                                    type='engine'
                                    cols={set_col_width(
                                            add_details_col(
                                                translate_order_col(
                                                    set_col_ellipsis(
                                                        translate_format_col(streaming_engine_cols, 'memoryUsed'), 'metrics'), false)), 'engine')}
                                    rows={add_details_row(
                                            add_unit(
                                                translate_byte_row(
                                                    handle_ellipsis_col(
                                                        add_key(streaming_engine_rows), 'lastErrMsg'), 'memoryUsed'), 'engine'))}
                                    min_width={1530}
                                    separated={false}
                                    default_page_size={20}
                                    refresher={get_streaming_engine_stat}
                                />
                            </div>
                        )
                    },
                    {
                        key: 'streaming_table_stat',
                        label:  <label className='tab-header'>
                                    <div className='tab-icon sm-font'><SvgTable/></div>{tab_content.streaming_table_stat.title}
                                </label>,
                        children: (
                            <div className='persistent-table-stat'>
                                <StateTable
                                    type='sharedStreamingTableStat'
                                    cols={render_col_title(
                                            translate_format_col(shared_table_stat.to_cols(), 'bytes'), 'sharedStreamingTableStat')}
                                    rows={translate_byte_row(
                                            add_key(shared_table_stat.to_rows()), 'bytes')}
                                    refresher={get_streaming_table_stat}
                                />
                                <StateTable
                                    type='persistenceMeta'
                                    cols={render_col_title(
                                            sort_col(
                                                set_col_width(persistent_table_stat.to_cols(), 'persistenceMeta'), 'persistenceMeta'), 'persistenceMeta')}
                                    rows={add_key(persistent_table_stat.to_rows())}
                                    min_width={1500}
                                    refresher={get_streaming_table_stat}
                                />
                                {streaming_stat.persistWorkers && (
                                    <StateTable
                                        type='persistWorkers'
                                        cols={render_col_title(
                                                set_col_color(streaming_stat.persistWorkers.to_cols(), 'queueDepth'), 'persistWorkers')}
                                        rows={add_key(streaming_stat.persistWorkers.to_rows())} 
                                        separated={false}  
                                    />
                                )}
                                
                            </div>
                        )
                    }
                ]}
                tabBarExtraContent={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                            try {
                                await tab_content[tab_key].refresher()
                                model.message.success(`${tab_content[tab_key].title}${t('刷新成功')}`)
                            } catch (error) {
                                model.show_error(error)
                                throw error
                            }
                        }}
                    >
                        {t('刷新')}
                    </Button>
                }
            />
}

interface ButtonProps {
    selected: string[]
    refresher: () => Promise<void>
}

const cols_width = {
    subWorkers: {
        workerId: 70,
        topic: 240,
        queueDepth: 90,
        queueDepthLimit: 100,
        lastErrMsg: 240,
        details: 80
    },
    engine: {
        name: 100,
        engineType: 160,
        lastErrMsg: 180,
        numGroups: 80,
        metrics: 120,
        status: 100,
        details: 80
    },
    persistenceMeta: {
        tablename: 150,
        lastLogSeqNum: 120,
        sizeInMemory: 120,
        asynWrite: 110,
        totalSize: 120,
        raftGroup: 70,
        compress: 70,
        sizeOnDisk: 120,
        retentionMinutes: 120,
        memoryOffset: 100,
        hashValue: 90,
        diskOffset: 100
    }
}

const header_text = {
    subWorkers: {
        title: t('订阅线程状态'),
        tip: t('监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。')
    },
    pubConns: {
        title: t('发布状态'),
        tip: t('监控本地发布节点和它的所有订阅节点之间的连接状态。')
    },
    persistWorkers: {
        title: t('持久化线程状态'),
        tip: t('监控负责持久化流数据表的工作线程的状态。')
    },
    persistenceMeta: {
        title: t('持久化共享流表状态'),
        tip: t('监控启用了持久化的共享流数据表的元数据。')
    },
    sharedStreamingTableStat: {
        title: t('非持久化共享流表状态'),
        tip: t('监控未启用持久化的共享流数据表的元数据。')
    },
    engine: {
        title: t('流引擎状态'),
        tip: t('监控流计算引擎的状态。')
    }
}

const button_text = {
    subWorkers: {
        title: t('流数据表'),
        action: t('取消订阅'),
    },
    engine: {
        title: t('引擎'),
        action: t('删除'),
    },
    persistenceMeta: {
        title: t('持久化共享数据流表'),
        action: t('删除'),
    },
    sharedStreamingTableStat: {
        title: t('共享数据流表'),
        action: t('删除'),
    }
}

const leading_cols = {
    subWorkers: {
        workerId: t('线程 ID'),
        topic: t('订阅主题'),
        queueDepth: t('队列深度'),
        queueDepthLimit: t('队列深度上限'),
        lastErrMsg: t('最近处理失败的错误信息'),
        lastFailedTimestamp: t('最近错误时刻'),
        failedMsgCount: t('失败消息总数'),
        processedMsgCount: t('已处理消息数'),
        lastMsgId: t('最近处理消息 ID'),
        lastFailedMsgId: t('最近错误消息 ID')
    },
    pubConns: {
        client: t('订阅节点'),
        queueDepthLimit: t('发布队列深度上限'),
        queueDepth: t('发布队列深度'),
        tables: t('表名')
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
        tables: t('表名')
    },
    sharedStreamingTableStat: {
        tableName: t('表名'),
        rows: t('行数'),
        columns: t('列数'),
        bytes: t('字节数')
    },
    engine: {
        name: t('引擎名'),
        engineType: t('引擎类型'),
        lastErrMsg: t('最近错误信息'),
        memoryUsed: t('内存'),
        numGroups: t('分组数'),
        numRows: t('行数（单表）'),
        leftTableNumRows: t('行数（左表）'),
        rightTableNumRows: t('行数（右表）'),
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
        TimeSeriesEngine: {
            windowTime: t('窗口长度'),
            step: t('步长'),
            useSystemTime: t('是否使用系统时间'),
            snapshotDir: t('快照目录'),
            snapshotInterval: t('快照间隔'),
            snapshotMsgId: t('快照 ID'),
            snapshotTimestamp: t('快照时间戳')
        },
        CrossSectionalEngine: {
            triggeringPattern: t('触发方式'),
            triggeringInterval: t('触发间隔')
        },
        AnomalyDetectionEngine: {
            snapshotDir: t('快照目录'),
            snapshotInterval: t('快照间隔'),
            snapshotMsgId: t('快照 ID'),
            snapshotTimestamp: t('快照时间戳')
        },
        ReactiveStreamEngine: {
            snapshotDir: t('快照目录'),
            snapshotInterval: t('快照间隔'),
            snapshotMsgId: t('快照 ID'),
            snapshotTimestamp: t('快照时间戳')
        },
        SessionWindowEngine: {
            sessionGap: t('时间间隔'),
            useSystemTime: t('是否使用系统时间'),
            snapshotDir: t('快照目录'),
            snapshotInterval: t('快照间隔'),
            snapshotMsgId: t('快照 ID'),
            snapshotTimestamp: t('快照时间戳')
        },
        DailyTimeSeriesEngine: {
            windowTime: t('窗口长度'),
            step: t('步长'),
            useSystemTime: t('是否使用系统时间'),
            snapshotDir: t('快照目录'),
            snapshotInterval: t('快照间隔'),
            snapshotMsgId: t('快照 ID'),
            snapshotTimestamp: t('快照时间戳')
        },
        AsofJoinEngine: {
            useSystemTime: t('是否使用系统时间'),
            delayedTime: t('等待时间间隔')
        },
        StreamFilter: {
            filters: t('过滤条件')
        }
    }
}

const units = {
    subWorkers: {
        batchSize: t('条'),
        throttle: t('毫秒')
    },
    engine: {
        triggeringInterval: t('毫秒')
    },
}


/** 省略文本内容，提供`详细`按钮，点开后弹出 modal 显示详细信息 */
function handle_ellipsis_col (table: Record<string, any>[], col_name: string) {
    const is_error_col = col_name === 'lastErrMsg'
    return table.map(row => {
        if (is_error_col)
            row.order = row[col_name]
        row[col_name] = <DetailInfo text={row[col_name] as string} type={is_error_col ? 'error' : 'info'} />
        return row
    })
}

/** 增加单位 */
function add_unit (table: Record<string, any>[], table_name: string) {
    const unit_keys = Object.keys(units[table_name])
    return table.map(row => {
        for (let key of unit_keys) 
            row[key] = `${row[key]} ${units[table_name][key]}`
        return row
    })
}

/** 按照主要列（leading_cols）的顺序对表格进行排序 */
function sort_col (cols: TableColumnType<Record<string, any>>[], type: string) {
    return Object.keys(leading_cols[type]).map(col_name => 
                                            cols.find(({ dataIndex }) => dataIndex === col_name))
}

/** 增加排序列，subWorker 的 lastErrMsg 和 queueDepth，engine 的 lastErrMsg 和 memoryUsed  */
function translate_order_col (cols: TableColumnType<Record<string, any>>[], is_sub_workers: boolean) {
    const i_depth_col = cols.findIndex(({ dataIndex }) => dataIndex === (is_sub_workers ? 'queueDepth' : 'memoryUsed'))
    const i_last_err_msg_col = cols.findIndex(({ dataIndex }) => dataIndex === 'lastErrMsg')
    const msg_order_function = (a: Record<string, any>, b: Record<string, any>) => {
        return a.order && !b.order ? 1 : b.order && !a.order ? -1 : 0
    }
    cols[i_depth_col] = {
        ...cols[i_depth_col],
        sorter: is_sub_workers ? 
                            (a: Record<string, any>, b: Record<string, any>) => Number(a.queueDepth) - Number(b.queueDepth)
                               :
                            (a: Record<string, any>, b: Record<string, any>) => Number(a.origin_bytes) - Number(b.origin_bytes),
        sortDirections: ['descend' as SortOrder]
    }
    cols[i_last_err_msg_col] = { ...cols[i_last_err_msg_col], sorter: msg_order_function, sortDirections: ['descend' as SortOrder] }
    return cols
}

/** 为每一张表增加 key */
function add_key (table: Record<string, any>, key_index = 0) {
    const { title = '' } = table
    return table.map(row => {
        return { ...row, key: title === 'pubConns' ? 
                                                row.client + row.tables
                                                   : 
                                                Object.values(row)[key_index] }
    })
}

/** 这里需要改掉 render，原有的 render 会对数据做 format，导致抛出 NaN  */
function translate_format_col (cols: TableColumnType<Record<string, any>>[], col_name: string) {
    return cols.map(col => { 
                    if (col.dataIndex === col_name)
                        col.render = value => value
                    return col })
}

/** 处理 byte */
function translate_byte_row (table: Record<string, any>[], col_name: string) {
    return table.map(row => ({ ...row, origin_bytes: row[col_name], [col_name]: Number(row[col_name]).to_fsize_str() }))
}

/** 翻译列名，添加 tooltip */
function render_col_title (cols: TableColumnType<Record<string, any>>[], table_name: string) {
    for (let col of cols) {
        let title = col.title as string
        col.title = (
            <Tooltip className='col-title' title={title.charAt(0).toUpperCase() + title.slice(1)} placement='bottom'>
                {leading_cols[table_name][title]}
            </Tooltip>
        )
    }
    return cols
}

/** 给 subWorkers 的 queueDepth 字段添加警告颜色 */
function set_col_color (cols: TableColumnType<Record<string, any>>[], col_name: string) {
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
function set_col_width (cols: TableColumnType<Record<string, any>>[], type: string) {
    for (let width_key of Object.keys(cols_width[type])) {
        let col = cols.find(col => col.dataIndex === width_key)
        col.width = cols_width[type][width_key]
    }
    return cols
}

/** 设置单元格自动省略 */
function set_col_ellipsis (cols: TableColumnType<Record<string, any>>[], col_name: string) {
    let col = cols.find(({ dataIndex }) => dataIndex === col_name)
    col.ellipsis = { showTitle: true }
    col.render = value => <Tooltip placement='topLeft' title={value}>
            {value}
        </Tooltip>
    return cols
}

/** 增加额外信息列 */
function add_details_col (cols: TableColumnType<Record<string, any>>[]) {
    return  [...cols, {
                        title: <span className='col-title'>{t('更多信息')}</span>,
                        dataIndex: 'details',
                        render: (value: ReactNode) => value 
                      }
    ]
}

/** 增加额外信息行，点击展示更多信息 */
function add_details_row (table: Record<string, any>[]) {
    return table.map(row => {
        const { engineType } = row
        const detailed_keys = Object.keys(!engineType ? expanded_cols.subWorkers : expanded_cols.engine[engineType])
        const dict = !engineType ? expanded_cols.subWorkers : expanded_cols.engine[engineType]
        const info = () => model.modal.info({
            title: !engineType ? row.topic : row.name,
            className: 'show-more-modal',
            content: <List dataSource={detailed_keys.map(key => `${dict[key]}: ${row[key] || ''}`)} 
                           renderItem={item => <List.Item>{item}</List.Item>}
                           split={false}/>
        })
        return { ...row, details: <a onClick={info}>{t('点击查看')}</a> }
    })
}

/** 统一处理删除 */
async function handle_delete (type: string, selected: string[], ddb: DDB, refresher: () => Promise<void>) {
    switch (type) {
        case 'subWorkers':
            try {
                await Promise.all(selected.map(async pub_table => { 
                    const pub_table_arr = pub_table.split('/')
                    ddb.eval(`unsubscribeTable(,'${pub_table_arr[1]}','${pub_table_arr[2]}')`, { urgent: true }) }))
                model.message.success(t('取消订阅成功'))
            } catch (error) {
                model.show_error({ error })
            } 
            break
        case 'persistenceMeta':
        case 'sharedStreamingTableStat':
            try {
                await Promise.all(selected.map(async streaming_table_name => ddb.call('dropStreamTable', [streaming_table_name], { urgent: true })  ))
                model.message.success(t('流数据表删除成功'))
            } catch (error) {
                model.show_error({ error })
            }
            break
        case 'engine':
            try {
                await Promise.all(selected.map(async engine_name => ddb.call('dropStreamEngine', [engine_name], { urgent: true })))
                model.message.success(t('引擎删除成功'))
            } catch (error) {
                model.show_error({ error })
            }
    }
    await refresher()
}


function DetailInfo ({ text, type }: { text: string, type: string }) {
    if (!text)
        return
    const error = () => {
        model.modal.info({
            title: type === 'error' ? t('错误详细信息') : t('共享流数据表'),
            content: text,
            width: '80%'
        })
    }
    return <Typography.Paragraph
                ellipsis={{
                    rows: 2,
                    expandable: true,
                    symbol: (
                        <span
                            onClick={event => {
                                event.stopPropagation()
                                error()
                            }}
                        >
                            {t('详细')}
                        </span>
                    )
                }}>
                {text}
            </Typography.Paragraph>
}


function DeleteModal ({ 
    table_name,
    selected, 
    set_selected, 
    refresher,
}: { 
    table_name: string
    selected: string[]
    set_selected: Dispatch<SetStateAction<string[]>>
    refresher: () => Promise<void>
}) {
    const [input_value, set_input_value] = useState<string>('')
    const { visible, open, close } = use_modal()
    const { ddb } = model.use(['ddb'])
    return <>
        <Modal  className='delete-modal'
                title={<div className='delete-warning-title'><WarningOutlined />
                    <span>{`确认${button_text[table_name].action}选中的 `}
                                <Tooltip title={selected.map(name => <p key={name}>{name}</p>)}>
                                    <span className='selected-number'>{selected.length}</span>
                                </Tooltip>
                            {` 个${button_text[table_name].title}吗？`}</span>
                </div>}
                open={visible}
                onCancel={() => { set_input_value('')
                                  close() }}
                cancelButtonProps={{ className: 'hidden' }}
                okText={button_text[table_name].action}
                okButtonProps={{ disabled: input_value !== 'YES', className: input_value !== 'YES' ? 'disable-button' : 'normal-button' }}
                onOk={async () => { await handle_delete(table_name, selected, ddb, refresher)
                                          set_input_value('')
                                          set_selected([ ])
                                          close() }}>
                    <Input placeholder={t('请输入 \'YES\' 以确认该操作')}
                           value={input_value} 
                           onChange={({ target: { value } }) => set_input_value(value)}
                        />
        </Modal>
        <Button className='title-button' disabled={!selected.length} onClick={open}>
            {t('批量') + button_text[table_name].action}
        </Button>
        </>
}


function StateTable ({
    type,
    cols,
    rows,
    min_width,
    separated = true,
    default_page_size = 5,
    refresher,
}: {
    type: string
    cols: TableColumnType<Record<string, any>>[]
    rows: Record<string, any>[]
    min_width?: number
    separated?: boolean
    default_page_size?: number
    refresher?: () => Promise<void>
}) {
    const [selected, set_selected] = useState<string[]>([ ])
    
    /** 渲染表头 */
    function render_table_header (table_name: string, button_props?: ButtonProps) {    
        return <>
                {button_props && <DeleteModal table_name={table_name}
                                              selected={selected}
                                              set_selected={set_selected}
                                              refresher={refresher}/>}
                <span className='table-name'>
                    {header_text[table_name].title}
                </span>
                <Tooltip title={header_text[table_name].tip}>
                    <QuestionCircleOutlined />
                </Tooltip>
            </>
    }
    
    
    return <>
        <Table
            tableLayout='fixed'
            rowSelection={
                refresher
                    ? {
                        type: 'checkbox',
                        onChange: (selected_keys: React.Key[]) => set_selected(selected_keys as string[])
                    }
                    : null
            }
            columns={cols}
            dataSource={rows}
            rowKey={row => row.key}
            size='small'
            title={() =>
                render_table_header(
                    type,
                    refresher
                        ? {
                            selected,
                            refresher
                        }
                        : null
                )
            }
            pagination={ rows.length > default_page_size ? 
                                                    {
                                                        defaultPageSize: default_page_size,
                                                        pageSizeOptions: ['5', '10', '20', '50', '100'],
                                                        size: 'small',
                                                        showSizeChanger: true,
                                                        showQuickJumper: true
                                                    } 
                                                        : false}
            scroll={{ x: min_width }}                                        
        />
        {(rows.length <= default_page_size && separated) && <div className='separater'/>}
    </>
}
