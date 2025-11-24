import './index.sass'

import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useState } from 'react'

import { Button, Tabs, Tooltip, Spin, Result, type TableColumnType, Input, Modal, List, Typography, Space } from 'antd'

import { WarningOutlined, FormatPainterOutlined, TableOutlined, DeploymentUnitOutlined, ControlOutlined, MinusCircleOutlined, DeleteOutlined } from '@ant-design/icons'

import type { SortOrder } from 'antd/es/table/interface.js'

import { use_modal } from 'react-object-model/hooks.js'

import { type DDB } from 'dolphindb/browser.js'

import { model, NodeType } from '../model.js'

import { TableCellDetail } from '../components/TableCellDetail/index.js'

import { t } from '@i18n'

import { Unlogin } from '../components/Unlogin.js'

import { RefreshButton } from '@components/RefreshButton/index.js'

import { DDBTable } from '@components/DDBTable/index.js'

import { upper } from '@utils'

import { computing, leading_cols, expanded_cols } from './model.js'

import { CEPComputing } from './CEPComputing/index.js'


export function Computing () {
    let { license } = model.use(['license'])
    
    let {
        inited,
        streaming_stat, 
        engine_stat, 
        persistent_table_stat, 
        shared_table_stat
    } = computing.use([
        'inited',
        'streaming_stat',
        'engine_stat',
        'persistent_table_stat',
        'shared_table_stat'
    ])
    
    const [tab_key, set_tab_key] = useState<string>('streaming_pub_sub_stat')
    
    const { logined, node_type, v3 } = model.use(['logined', 'node_type', 'v3'])
    
    
    useEffect(() => {
        if (!logined || node_type === NodeType.controller)
            return
        
        (async () => {
            if (!computing.inited)
                await computing.init()
            await computing.get_streaming_stat()
            await computing.get_engine_stat()
            await computing.get_streaming_table_stat()
        })()
    }, [ ])
    
    if (node_type === NodeType.controller)
        return <Result
            status='warning'
            className='interceptor'
            title={t('控制节点不支持流数据的发布订阅，请跳转到数据节点或计算节点查看流数据状态。')}
        />
    
    if (!logined)
        return <Unlogin info={t('当前节点流计算状态')}/>
    
    if (!inited || !streaming_stat || !engine_stat || !shared_table_stat)
        return <div className='spin-container'>
            <Spin size='large' delay={500} />
        </div>
    
    const streaming_engine_cols: TableColumnType<Record<string, any>>[] = Object.keys(leading_cols.engine).map(col_name => ({
        title: <Tooltip title={col_name.charAt(0).toUpperCase() + col_name.slice(1)}>
            <span className='col-title'>{leading_cols.engine[col_name]}</span>
        </Tooltip>,
        dataIndex: col_name,
        render: value => <span>{value}</span>
    }))
    
    let streaming_engine_rows = [ ]
    for (let engine_type of Object.keys(engine_stat))
        for (let row of engine_stat[engine_type].to_rows()) {
            let new_row = { }
            
            // 特殊的三种引擎类型，内存使用为 memoryInUsed
            if (special_engine_type.has(engine_type))
                row.memoryUsed = row.memoryInUsed
            
            for (let key of Object.keys(leading_cols.engine))
                new_row[key] = row.hasOwnProperty(key) ? (typeof row[key] === 'bigint' ? Number(row[key]) : row[key]) : '--'
                
            for (let key of Object.keys(expanded_cols.engine[engine_type] || { }))
                new_row[key] = row.hasOwnProperty(key) ? (typeof row[key] === 'bigint' ? Number(row[key]) : row[key] === null ? '' : row[key]) : ''
                
            new_row = { ...new_row, engineType: engine_type }
            
            streaming_engine_rows.push(new_row)
        }
    
    return <Tabs
        className='themed'
        activeKey={tab_key}
        onChange={set_tab_key}
        destroyOnHidden
        items={[
            {
                key: 'streaming_pub_sub_stat',
                label: <Space>
                    <ControlOutlined />
                    {tabs.streaming_pub_sub_stat.title}
                </Space>,
                children: <div className='streaming_pub_sub_stat'>
                    <StateTable
                        type='subWorkers'
                        cols={add_details_col(
                            render_col_title(
                                translate_order_col(
                                    set_col_color(
                                        sort_col(
                                            streaming_stat.subWorkers.to_cols().filter(col => col.title in leading_cols.subWorkers),
                                            'subWorkers'
                                        ),
                                        'queueDepth'
                                    ),
                                    true
                                ),
                                'subWorkers'
                            )
                        )}
                        rows={handle_null(
                            add_details_row(
                                add_unit(handle_ellipsis_col(add_key(streaming_stat.subWorkers.to_rows(), 1), 'lastErrMsg'), 'subWorkers')
                            )
                        )}
                        min_width={1420}
                        default_page_size={10}
                        refresher={computing.get_streaming_stat}
                    />
                    
                    {streaming_stat.pubConns && <StateTable
                        type='pubConns'
                        cols={set_col_color(render_col_title(streaming_stat.pubConns.to_cols(), 'pubConns'), 'queueDepth')}
                        rows={add_key(streaming_stat.pubConns.to_rows())}
                        separated={false}
                    />}
                </div>
            },
            {
                key: 'streaming_engine_stat',
                label: (
                    <Space>
                        <DeploymentUnitOutlined />
                        {tabs.streaming_engine_stat.title}
                    </Space>
                ),
                children: (
                    <div className='streaming-engine-stat'>
                        <StateTable
                            type='engine'
                            cols={add_details_col(
                                translate_order_col(
                                    set_col_ellipsis(translate_format_col(streaming_engine_cols, 'memoryUsed'), 'metrics'),
                                    false
                                )
                            )}
                            rows={handle_null(
                                add_details_row(
                                    add_unit(
                                        translate_byte_row(handle_ellipsis_col(add_key(streaming_engine_rows), 'lastErrMsg'), 'memoryUsed'),
                                        'engine'
                                    )
                                )
                            )}
                            min_width={1530}
                            separated={false}
                            default_page_size={20}
                            refresher={computing.get_engine_stat}
                        />
                    </div>
                )
            },
            {
                key: 'streaming_table_stat',
                label: <Space className='tab-header'>
                    <TableOutlined />
                    {tabs.streaming_table_stat.title}
                </Space>,
                children: <div className='persistent-table-stat'>
                    <StateTable
                        type='sharedStreamingTableStat'
                        cols={render_col_title(translate_format_col(shared_table_stat.to_cols(), 'memoryUsed'), 'sharedStreamingTableStat')}
                        rows={translate_byte_row(add_key(shared_table_stat.to_rows()), 'memoryUsed')}
                        refresher={computing.get_streaming_table_stat}
                    />
                    {computing.persistence_dir && <StateTable
                        type='persistenceMeta'
                        cols={render_col_title(
                                sort_col(
                                    translate_format_col(persistent_table_stat.to_cols(),
                                        'memoryUsed'
                                    ), 
                                    'persistenceMeta'
                                ),
                                'persistenceMeta'
                            )
                        }
                        rows={handle_null(
                                translate_byte_row(
                                    handle_ellipsis_col(add_key(persistent_table_stat.to_rows()), 'persistenceDir'), 'memoryUsed'))}
                        min_width={1600}
                        refresher={computing.get_streaming_table_stat}
                    />}
                    {streaming_stat.persistWorkers && <StateTable
                        type='persistWorkers'
                        cols={render_col_title(set_col_color(streaming_stat.persistWorkers.to_cols(), 'queueDepth'), 'persistWorkers')}
                        rows={add_key(streaming_stat.persistWorkers.to_rows())}
                        separated
                    />}
                </div>
            },
            ...(v3 && (model.dev || license.modules.includes('cep')) ? [{
                key: 'cep_computing',
                children: <CEPComputing />,
                label: <Space className='tab-header'>
                    <FormatPainterOutlined />
                    {t('CEP 流计算引擎') }
                </Space>,
            }] : [ ])
        ]}
        tabBarExtraContent={
            tab_key !== 'cep_computing' &&
                <RefreshButton
                    onClick={async () => {
                        await tabs[tab_key].refresher.call(computing)
                        model.message.success(`${tabs[tab_key].title} ${t('刷新成功')}`)
                    }}
                />
        }
    />
}


const tabs = {
    streaming_pub_sub_stat: {
        title: t('流计算发布订阅状态'),
        refresher: computing.get_streaming_stat
    },
    streaming_engine_stat: {
        title: t('流计算引擎状态'),
        refresher: computing.get_engine_stat
    },
    streaming_table_stat: {
        title: t('流数据表状态'),
        refresher: async () =>
            Promise.all([
                computing.get_streaming_table_stat(),
                computing.get_streaming_stat()
            ])
    }
}


const special_engine_type = new Set(['NarrowReactiveStreamEngine', 'ReactiveStreamEngine', 'DualOwnershipReactiveStreamEngine'])


const header_text = {
    subWorkers: {
        title: t('订阅线程状态'),
        tip: 'getStreamingStat().subWorkers：' + t('监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。'),
        func: 'getStreamingStat().subWorkers'
    },
    pubConns: {
        title: t('发布状态'),
        tip: 'getStreamingStat().pubConns：' + t('监控本地发布节点和它的所有订阅节点之间的连接状态。'),
        func: 'getStreamingStat().pubConns'
    },
    persistWorkers: {
        title: t('持久化线程状态'),
        tip: 'getStreamingStat().persistWorkers：' + t('监控负责持久化流数据表的工作线程的状态。'),
        func: 'getStreamingStat().persistWorkers'
    },
    persistenceMeta: {
        title: t('持久化共享流表状态'),
        tip: 'getStreamTables(1)：' + t('监控启用了持久化的共享流数据表的元数据。'),
        func: 'getStreamTables(1)'
    },
    sharedStreamingTableStat: {
        title: t('非持久化共享流表状态'),
        tip: 'getStreamTables(2)：' + t('监控未启用持久化的共享流数据表的元数据。'),
        func: 'getStreamTables(2)'
    },
    engine: {
        title: t('流引擎状态'),
        tip: 'getStreamEngineStat()：' + t('监控流计算引擎的状态。'),
        func: 'getStreamEngineStat()'
    }
}

const button_text = {
    subWorkers: {
        title: t('流数据表', { context: 'computing' }),
        action: t('取消订阅'),
        icon: <MinusCircleOutlined />
    },
    engine: {
        title: t('引擎'),
        action: t('删除'),
        icon: <DeleteOutlined />
    },
    persistenceMeta: {
        title: t('持久化共享数据流表'),
        action: t('删除'),
        icon: <DeleteOutlined />
    },
    sharedStreamingTableStat: {
        title: t('共享数据流表'),
        action: t('删除'),
        icon: <DeleteOutlined />
    }
}


const units = {
    subWorkers: {
        batchSize: t('条'),
        throttle: t('毫秒')
    },
    engine: {
        triggeringInterval: t('毫秒')
    }
}

const detail_title = {
    lastErrMsg: t('错误详细信息'),
    persistenceDir: t('持久化路径')
}


/** 省略文本内容，提供`详细`按钮，点开后弹出 modal 显示详细信息 */
function handle_ellipsis_col (table: Record<string, any>[], col_name: string) {
    return table.map(row => {
        if (col_name === 'lastErrMsg')
            row.order = row[col_name]
        // row[col_name] = <DetailInfo text={row[col_name] as string} type={col_name} />
        row[col_name] = <TableCellDetail content={row[col_name] as string} title={detail_title[col_name]} />
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
    return Object.keys(leading_cols[type]).map(col_name => cols.find(({ dataIndex }) => dataIndex === col_name))
}


/** 增加排序列，subWorker 的 lastErrMsg 和 queueDepth，engine 的 lastErrMsg 和 memoryUsed  */
function translate_order_col (cols: TableColumnType<Record<string, any>>[], is_sub_workers: boolean) {
    const i_depth_col = cols.findIndex(({ dataIndex }) => dataIndex === (is_sub_workers ? 'queueDepth' : 'memoryUsed'))
    const i_last_err_msg_col = cols.findIndex(({ dataIndex }) => dataIndex === 'lastErrMsg')
    function msg_order_function (a: Record<string, any>, b: Record<string, any>) {
        return a.order && !b.order ? 1 : b.order && !a.order ? -1 : 0
    }
    cols[i_depth_col] = {
        ...cols[i_depth_col],
        sorter: is_sub_workers
            ? (a: Record<string, any>, b: Record<string, any>) => Number(a.queueDepth) - Number(b.queueDepth)
            : (a: Record<string, any>, b: Record<string, any>) => Number(a.origin_bytes) - Number(b.origin_bytes),
        sortDirections: ['descend' as SortOrder],
        showSorterTooltip: false
    }
    cols[i_last_err_msg_col] = { ...cols[i_last_err_msg_col], 
                                 sorter: msg_order_function, 
                                 sortDirections: ['descend' as SortOrder],
                                 showSorterTooltip: false }
    return cols
}


/** 为每一张表增加 key */
function add_key (table: Record<string, any>, key_index = 0) {
    const { title = '' } = table
    return table.map(row => ({ ...row, key: title === 'pubConns' ? row.client + row.tables : Object.values(row)[key_index] }))
}


/** 这里需要改掉 render，原有的 render 会对数据做 format，导致抛出 NaN  */
function translate_format_col (cols: TableColumnType<Record<string, any>>[], col_name: string) {
    return cols.map(col => {
        if (col.dataIndex === col_name)
            col.render = value => value
        return col
    })
}


/** 处理 byte */
function translate_byte_row (table: Record<string, any>[], col_name: string) {
    return table.map(row => ({
        ...row,
        origin_bytes: row[col_name],
        [col_name]: row[col_name] === '--' ? row[col_name] : upper(Number(row[col_name]).to_fsize_str())
    }))
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
    return [
        ...cols,
        {
            title: <span className='col-title'>{t('更多信息')}</span>,
            dataIndex: 'details',
            render: (value: ReactNode) => value as any
        }
    ]
}


/** 增加额外信息行，点击展示更多信息 */
function add_details_row (table: Record<string, any>[]) {
    return table.map(row => {
        const { engineType } = row
        const detailed_keys = Object.keys((!engineType ? expanded_cols.subWorkers : expanded_cols.engine[engineType]) || { })
        const dict = !engineType ? expanded_cols.subWorkers : expanded_cols.engine[engineType]
        const info = () =>
            model.modal.info({
                title: !engineType ? row.topic : row.name,
                className: 'computing-show-more-modal',
                width: 800,
                content: (
                    <List
                        size='small'
                        dataSource={detailed_keys.map(key => `${dict[key]}: ${row[key] === -1 || row[key] === -1n || row[key] === null ? '' : row[key]}`)}
                        renderItem={item => <List.Item><Typography.Paragraph ellipsis={{ tooltip: item }}>{item}</Typography.Paragraph ></List.Item>}
                        split={false}
                    />
                )
            })
        return { ...row, details: dict ? <a onClick={info}>{t('点击查看')}</a> : '--' }
    })
}


/** 将表里的 -1 转成真正的 null,null 转为空 */
function handle_null (table: Record<string, any>[]) {
    return table.map(row => {
        for (let key in row)
            row[key] = row[key] === -1 || row[key] === -1n ? null : row[key]
        
        return row
    })
}


/** 统一处理删除 */
async function handle_delete (type: string, selected: string[], ddb: DDB, refresher: () => Promise<void>, is_admin: boolean, raftGroups?: string[]) {
    switch (type) {
        case 'subWorkers':
            await Promise.all(
                selected.map(async (pub_table, idx) => {
                    const pub_table_arr = pub_table.split('/')
                    const [ip, port] = pub_table_arr[0].split(':')
                    let script = ''
                    if (raftGroups[idx])
                        script = `rpc('${model.get_controller_alias()}','unsubscribeTable','${pub_table_arr[1]}', '${pub_table_arr[2] || ''}')`
                    else
                        script =
                            ip === model.node.host && Number(port) === model.node.port
                                ? `unsubscribeTable(,'${pub_table_arr[1]}', '${pub_table_arr[2] || ''}')`
                                : `h=xdb('${ip}',${port})\n` + `unsubscribeTable(h,'${pub_table_arr[1]}','${pub_table_arr[2] || ''}')`
                    ddb.eval(script, { urgent: true })
                })
            )
            model.message.success(t('取消订阅成功'))
            break
        case 'persistenceMeta':
            await Promise.all(selected.map(async (streaming_table_name, idx) => ddb.call('dropStreamTable', [streaming_table_name, raftGroups[idx] ? false : is_admin], { urgent: true })))
            model.message.success(t('流数据表删除成功'))
            break
        case 'sharedStreamingTableStat':
            await Promise.all(selected.map(async streaming_table_name => ddb.call('dropStreamTable', [streaming_table_name, is_admin], { urgent: true })))
            model.message.success(t('流数据表删除成功'))
            break
        case 'engine':
            await Promise.all(selected.map(async engine_name => ddb.call('dropStreamEngine', [engine_name], { urgent: true })))
            model.message.success(t('引擎删除成功'))
            
    }
    await refresher.call(computing)
}


function DeleteModal ({
    table_name,
    selected,
    set_selected,
    refresher
}: {
    table_name: string
    selected: string[]
    set_selected: Dispatch<SetStateAction<string[]>>
    refresher: () => Promise<void>
}) {
    const [input_value, set_input_value] = useState<string>('')
    const { visible, open, close } = use_modal()
    const { ddb, admin: is_admin } = model.use(['ddb', 'admin'])
    const { streaming_stat, persistent_table_stat } = computing.use(['streaming_stat', 'persistent_table_stat'])
    const action_text = button_text[table_name].action.charAt(0).toUpperCase() + button_text[table_name].action.slice(1)
    return <>
            <Modal
                className='computing-delete-modal'
                title={
                    <div className='delete-warning-title'>
                        <WarningOutlined />
                        <span>
                            {t('确认{{action}}选中的 ', { action: button_text[table_name].action.toLowerCase() })}
                            <Tooltip
                                title={selected.map(name => <p key={name}>{name}</p>)}
                            >
                                <Typography.Link>{selected.length}</Typography.Link>
                            </Tooltip>
                            {t(' 个{{item}}吗?', { item: button_text[table_name].title.toLowerCase() })}
                        </span>
                    </div>
                }
                open={visible}
                onCancel={() => {
                    set_input_value('')
                    close()
                }}
                cancelButtonProps={{ className: 'hidden' }}
                okText={action_text}
                okButtonProps={{ 
                    disabled: input_value !== 'YES', 
                    danger: true 
                }}
                onOk={async () => {
                    await handle_delete(
                        table_name,
                        selected,
                        ddb,
                        refresher,
                        is_admin,
                        table_name === 'subWorkers'
                            ? selected.map(row_name => streaming_stat.subWorkers.to_rows().find(({ topic }) => topic === row_name).raftGroup)
                            : table_name === 'persistenceMeta' ? selected.map(row_name => persistent_table_stat.to_rows().find(({ tablename }) => tablename === row_name).raftGroup) : [ ]
                    )
                    set_input_value('')
                    set_selected([ ])
                    close()
                }}
            >
                <Input 
                    status='error'
                    variant='filled'
                    placeholder={t("请输入 'YES' 以确认该操作")}
                    value={input_value}
                    onChange={({ target: { value } }) => {
                        set_input_value(value)
                    }}
                />
            </Modal>
            <Button disabled={!selected.length} onClick={open} danger icon={button_text[table_name].icon}>
                {t('批量') + action_text}
            </Button>
        </>
}


function StateTable ({
    type,
    cols,
    rows,
    separated = true,
    default_page_size = 5,
    refresher
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
    
    return <>
        <DDBTable
            tableLayout='fixed'
            rowSelection={
                refresher
                    ? {
                            type: 'checkbox',
                            selectedRowKeys: selected,
                            onChange: (selected_keys: React.Key[]) => {
                                set_selected(selected_keys as string[])
                            }
                        }
                    : null
            }
            columns={cols}
            dataSource={rows}
            rowKey={row => row.key}
            size='small'
            title={header_text[type].title}
            help={header_text[type].tip}
            buttons={refresher 
                ? <DeleteModal 
                    table_name={type} 
                    selected={selected} 
                    set_selected={set_selected} 
                    refresher={refresher} 
                /> : null}
            pagination={
                rows.length > default_page_size
                    ? {
                            defaultPageSize: default_page_size,
                            pageSizeOptions: ['5', '10', '20', '50', '100'],
                            size: 'small',
                            showSizeChanger: true,
                            showQuickJumper: true
                        }
                    : false
            }
            scroll={{ x: 'max-content' }}
        />
        
        {rows.length <= default_page_size && separated && <div className='separater' />}
    </>
}
