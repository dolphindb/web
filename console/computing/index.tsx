import './index.sass'

import { useEffect, useState } from 'react'
import { Button, Tabs, Table, Tooltip, Popconfirm, Typography, Spin, Result, type TableColumnType } from 'antd'
import { ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ExpandableConfig, SortOrder } from 'antd/es/table/interface.js'

import { DdbObj } from 'dolphindb/browser.js'

import { model } from '../model.js'
import { computing } from './model.js'

import { t } from '../../i18n/index.js'

import SvgPublish from './icons/publish.icon.svg'
import SvgEngine from './icons/engine.icon.svg'
import SvgTable from './icons/table.icon.svg'


const { Paragraph } = Typography


export function Computing () {
    const [streaming_stat, set_streaming_stat] = useState<Record<string, DdbObj>>()
    
    const [origin_streaming_engine_stat, set_origin_streaming_engine_stat] = useState<Record<string, DdbObj>>()
    
    const [persistent_table_stat, set_persistent_table_stat] = useState<DdbObj>()
    
    const [shared_table_stat, set_shared_table_stat] = useState<DdbObj>()
    
    const [tab_key, set_tab_key] = useState<string>('streaming_pub_sub_stat')
    
    const { ddb, logined } = model.use(['ddb', 'logined'])
    
    if (!logined)
        return <Result
            status='warning'
            className='login-interceptor'
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
            title: t('流引擎状态'),
            refresher: get_streaming_engine_stat
        },
        streaming_table_stat: {
            title: t('流表状态'),
            refresher: get_streaming_table_stat
        }
    }
    
    useEffect(() => {
        (async () => {
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
                    <span className='col-title'>
                        {leading_cols.engine[col_name]}
                    </span>
                </Tooltip>,
        dataIndex: col_name,
        render: value => <span>{value}</span>
    }))
    
    let expand_streaming_engine_cols: Record<string, TableColumnType<Record<string, any>>[]> = { }
    for (let engineType of Object.keys(origin_streaming_engine_stat))
        expand_streaming_engine_cols[engineType] = Object.keys(expanded_cols.engine[engineType]).map(col_name => ({
            title: <Tooltip title={col_name.charAt(0).toUpperCase() + col_name.slice(1)}>
                        <span className='col-title'>
                            {expanded_cols.engine[engineType][col_name]}
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
                new_row = Object.assign(new_row, { [key]: row.hasOwnProperty(key) ? row[key] : '' })
            
            for (let key of Object.keys(expanded_cols.engine[engineType]))
                expand_new_row = Object.assign(expand_new_row, { [key]: row.hasOwnProperty(key) ? row[key] : '' })
                
            new_row = Object.assign(new_row, { engineType })
            expand_new_row = Object.assign(expand_new_row, { name: row.name })
            
            streaming_engine_rows.push(new_row)
            expand_streaming_engine_rows.push(expand_new_row)
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
                                <div className='sub-workers'>
                                    <StateTable
                                        type='subWorkers'
                                        cols={render_col_title(
                                                translate_order_col(
                                                    set_col_width(
                                                        set_col_color(
                                                            sort_col(
                                                                streaming_stat.subWorkers
                                                                    .to_cols()
                                                                    .filter(col => Object.keys(leading_cols.subWorkers).includes(col.title)),
                                                                'subWorkers'
                                                            ),
                                                            'queueDepth'
                                                        ),
                                                        'subWorkers'
                                                    )
                                                ),
                                                true, 'subWorkers')
                                            }
                                        rows={translate_sorter_row(handle_ellipsis_col(add_key(streaming_stat.subWorkers.to_rows(), 1), 'lastErrMsg'))}
                                        min_width={1200}
                                        separated={false}
                                        default_page_size={10}
                                        refresher={get_streaming_pub_sub_stat}
                                        expandable_config={{
                                            expandedRowRender: stat => <Table
                                                    columns={render_col_title(
                                                        streaming_stat.subWorkers
                                                            .to_cols()
                                                            .filter(col => Object.keys(expanded_cols.subWorkers).includes(col.title)),
                                                        false,
                                                        'subWorkers'
                                                    )}
                                                    dataSource={streaming_stat.subWorkers
                                                        .to_rows()
                                                        .filter(row => row.topic.slice(row.topic.indexOf('/') + 1) === stat.topic)}
                                                    rowKey={row => row.topic}
                                                    pagination={false}
                                                />
                                        }}
                                    />
                                </div>
                                <div className='other-tables'>
                                    <StateTable
                                        type='pubConns'
                                        key='pubConns'
                                        cols={set_col_color(render_col_title(streaming_stat.pubConns.to_cols(), true, 'pubConns'), 'queueDepth')}
                                        rows={handle_ellipsis_col(add_key(streaming_stat.pubConns.to_rows()), 'tables')}         
                                    />
                                    <StateTable
                                        type='pubTables'
                                        key='pubTables'
                                        cols={render_col_title(streaming_stat.pubTables.to_cols(), true, 'pubTables')}
                                        rows={add_key(split_actions(streaming_stat.pubTables.to_rows()))}
                                        separated={false}
                                    />
                                </div>
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
                                    cols={set_col_ellipsis(
                                            set_col_width(streaming_engine_cols, 'engine'), 'metrics')}
                                    rows={add_key(streaming_engine_rows)}
                                    min_width={1560}
                                    separated={false}
                                    default_page_size={20}
                                    refresher={get_streaming_engine_stat}
                                    expandable_config={{
                                        expandedRowRender: ({ name, engineType }) => {
                                            return <Table
                                                    columns={expand_streaming_engine_cols[engineType]}
                                                    dataSource={expand_streaming_engine_rows.filter(row => row.name === name)}
                                                    rowKey={row => row.name}
                                                    pagination={false}
                                                />
                                        }
                                    }}
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
                                    type='persistenceMeta'
                                    cols={render_col_title(set_col_width(persistent_table_stat.to_cols(), 'persistenceMeta'), true, 'persistenceMeta')}
                                    rows={add_key(persistent_table_stat.to_rows())}
                                    min_width={1560}
                                    refresher={get_streaming_table_stat}
                                />
                                {streaming_stat.persistWorkers && (
                                    <StateTable
                                        type='persistWorkers'
                                        cols={render_col_title(set_col_color(streaming_stat.persistWorkers.to_cols(), 'queueDepth'), true, 'persistWorkers')}
                                        rows={add_key(streaming_stat.persistWorkers.to_rows())}   
                                    />
                                )}
                                <StateTable
                                    type='sharedStreamingTableStat'
                                    cols={render_col_title(shared_table_stat.to_cols(), true, 'sharedStreamingTableStat')}
                                    rows={add_key(shared_table_stat.to_rows())}
                                    separated={false}
                                    refresher={get_streaming_table_stat}
                                />
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
    type: string
    selected: string[]
    refresher: () => Promise<void>
}

const cols_width = {
    subWorkers: {
        workerId: 70,
        topic: 150,
        queueDepth: 90,
        queueDepthLimit: 100,
        lastErrMsg: 180,
        failedMsgCount: 100,
        processedMsgCount: 100,
        lastMsgId: 90
    },
    engine: {
        name: 180,
        engineType: 170,
        lastErrMsg: 200,
        metrics: 120,
        status: 50
    },
    persistenceMeta: {
        persistenceDir: 350
    }
}

const header_text = {
    subWorkers: {
        title: t('订阅线程状态'),
        tip: t('表 SubWorkers 监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。')
    },
    pubTables: {
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
        tip: t('表 PersistWorkers 监控负责持久化流数据表的工作线程的状态。')
    },
    persistenceMeta: {
        title: t('持久化共享流表状态'),
        tip: t('表 PersistenceMeta 返回启用了持久化的共享流数据表的元数据。')
    },
    sharedStreamingTableStat: {
        title: t('非持久化共享流表状态'),
        tip: t('表 sharedStreamingTableStat 返回未启用持久化的共享流数据表的元数据。')
    },
    engine: {
        title: t('流引擎状态'),
        tip: t('表 EngineStat 返回流计算引擎的状态。')
    }
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
        queueDepth: t('队列深度'),
        queueDepthLimit: t('队列深度上限'),
        lastErrMsg: t('最近处理失败的错误信息'),
        lastFailedTimestamp: t('最近错误时刻'),
        failedMsgCount: t('失败消息总数'),
        processedMsgCount: t('已处理消息数'),
        lastMsgId: t('最近消息 ID'),
        lastFailedMsgId: t('最近错误消息 ID')
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
        cumMsgLatency: t('接收平均延迟'),
        lastMsgLatency: t('最近消息延迟'),
        lastUpdate: t('最近接收时刻')
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
        bytes: t('字节数')
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


/** 省略文本内容，提供`详细`按钮，点开后弹出 modal 显示详细信息 */
function handle_ellipsis_col (rows: Record<string, any>, col_name: string) {
    const is_error_col = col_name === 'lastErrMsg'
    return rows.map(row => {
        if (is_error_col)
            row.order = row[col_name]
        row[col_name] = <ErrorMsg text={row[col_name] as string} type={is_error_col ? 'error' : 'info'} />
        return row
    })
}

/** 缩短 subWorkers 表的 topic 字段 */
function translate_sorter_row (rows: Record<string, any>) {
    return rows.map(row => {
        row.topic = row.topic.slice(row.topic.indexOf('/') + 1)
        return row
    })
}

/** 按照主要列（leading_cols）的顺序进行排序 */
function sort_col (cols: TableColumnType<Record<string, any>>[], type: string) {
    let sorted_cols: TableColumnType<Record<string, any>>[] = [ ]
    for (let col_name of Object.keys(leading_cols[type]))
        sorted_cols.push(cols.find(({ title }) => title === col_name))
    return sorted_cols
}

/** 将 subworker 表按照 QueueDepth 和 LastErrMsg 排序 */
function translate_order_col (cols: TableColumnType<Record<string, any>>[]) {
    const i_queue_depth_col = cols.findIndex(col => col.title === 'queueDepth')
    const i_last_err_msg_col = cols.findIndex(col => col.title === 'lastErrMsg')
    const msg_order_function = (a: Record<string, any>, b: Record<string, any>) => {
        if (a.order && !b.order)
            return 1
        else if (b.order && !a.order)
            return -1
        return 0
    }
    cols[i_queue_depth_col] = {
        ...cols[i_queue_depth_col],
        sorter: (a: Record<string, any>, b: Record<string, any>) => Number(a.queueDepth) - Number(b.queueDepth),
        sortDirections: ['descend' as SortOrder]
    }
    cols[i_last_err_msg_col] = { ...cols[i_last_err_msg_col], sorter: msg_order_function, sortDirections: ['descend' as SortOrder] }
    return cols
}

/** 增加 key */
function add_key (table: Record<string, any>, key_index = 0) {
    const { title = '' } = table
    return table.map((row: object, idx: number) => {
        return { ...row, key: title.includes('Conns') ? idx : Object.values(row)[key_index] }
    })
}

/** 将 PubTables 的 actions 进行拆分 */
function split_actions (rows: Record<string, any>) {
    let newRows = [ ]
    rows.forEach(row => {
        if (row.actions.startsWith('[')) {
            const acts = row.actions.slice(1, row.actions.length - 1).split(',')
            for (let act of acts)
                newRows.push({ ...row, actions: act })
        } else
            newRows.push(row)
    })
    return newRows
}

/** 翻译列名，添加 tooltip */
function render_col_title (cols: TableColumnType<Record<string, any>>[], is_leading: boolean, type: string) {
    for (let col of cols) {
        let title = col.title as string
        col.title = (
            <Tooltip className='col-title' title={title.charAt(0).toUpperCase() + title.slice(1)} placement='bottom'>
                {is_leading ? leading_cols[type][title] : expanded_cols[type][title]}
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


function ErrorMsg ({ text, type }: { text: string, type: string }) {
    if (!text)
        return
    const error = () => {
        model.modal.info({
            title: type === 'error' ? t('错误详细信息') : t('共享流数据表'),
            content: text,
            width: '80%'
        })
    }
    return <Paragraph
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
                }}
            >
                {text}
            </Paragraph>
}


function StateTable ({
    type,
    cols,
    rows,
    min_width,
    separated = true,
    default_page_size = 5,
    refresher,
    expandable_config
}: {
    type: string
    cols: TableColumnType<Record<string, any>>[]
    rows: Record<string, any>[]
    min_width?: number
    separated?: boolean
    default_page_size?: number
    refresher?: () => Promise<void>
    expandable_config?: ExpandableConfig<Record<string, any>>
}) {
    const [selected, set_selected] = useState<string[]>([ ])
    
    const { ddb } = model.use(['ddb'])
    
    /** 渲染表头 */
    function render_table_header (talbe_name: string, button_props: ButtonProps) {
        const { type, selected, refresher } = button_props || { }
        return <>
                {type && (
                    <Popconfirm
                        title={button_text[type].confirm_text}
                        disabled={!selected.length}
                        onConfirm={async () => handle_delete(type, selected, refresher)}
                    >
                        <Button className='title-button' disabled={!selected.length}>
                            {button_text[type].button_text}
                        </Button>
                    </Popconfirm>
                )}
                <span className='table-name'>
                    {header_text[talbe_name].title}
                </span>
                <Tooltip title={header_text[talbe_name].tip}>
                    <QuestionCircleOutlined />
                </Tooltip>
            </>
    }
    
    
    /** 统一处理删除 */
    async function handle_delete (type: string, selected: string[], refresher: () => Promise<void>) {
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
                rowKey={row => (type === 'pubTables' ? `${row.tableName}/${row.actions}` : row.key)}
                expandable={expandable_config ? expandable_config : null}
                size='small'
                title={() =>
                    render_table_header(
                        type,
                        refresher
                            ? {
                                type: type,
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
