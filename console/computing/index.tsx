import './index.sass'

import { useEffect, useState } from 'react'
import {  Button, Table, Typography, Tooltip, Popconfirm, type TablePaginationConfig } from 'antd'
import { ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnType } from 'antd/lib/table/index.js'

import { model } from '../model.js'
import { DdbObj } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'
import { FixedType } from 'rc-table/lib/interface.js'

const { Title } = Typography

// interface DdbStreamingStat extends DdbObj {
//     subWorkers: DdbObj
//     subConns: DdbObj
//     pubTables: DdbObj
//     pubConns: DdbObj
//     persistWorkers: DdbObj
// }
interface ButtonProps {
    text: string
    type: 'table' | 'engine' | 'sharedStreamTable'
    handleChange: (e?: React.MouseEvent<HTMLElement>) => void
}

const delteted_title = {
    table: t('确认取消订阅选中的流数据表吗？'),
    engine: t('确认删除选中的引擎吗？'),
    sharedStreamTable: t('确认删除选中的共享流数据表吗？')
}

export function Computing () {
    const [refresher, set_refresher] = useState({ })
    
    const [streaming_stat, set_streaming_stat] = useState <Record<string, DdbObj>>()
    
    const [streaming_engine_stat, set_streaming_engine_stat] = useState < Record<string, DdbObj>>()
    
    const [selected_table_name, set_selected_table_name] = useState<string[]>()
    
    useEffect(() => {
        get_streaming_stat() 
        get_streaming_engine_stat()
        if (streaming_stat)
            console.log('streaming_stat:', streaming_stat)
        if (streaming_engine_stat)
            console.log('streaming_engine_stat:', streaming_engine_stat)
    }, [refresher])
    
    
    async function get_streaming_stat () {
        set_streaming_stat((await model.get_streaming_stat()).to_dict())
    }
    
    
    async function get_streaming_engine_stat () {
        set_streaming_engine_stat((await model.get_streaming_engine_state()).to_dict())
    }
    
    
    const pagination: TablePaginationConfig = {
        defaultPageSize: 5,
        pageSizeOptions: ['5', '10', '20', '50', '100'],
        size: 'small',
        showSizeChanger: true,
        showQuickJumper: true,
    }
    
    
    if (!streaming_stat || !streaming_engine_stat)
        return null
    
    const sub_workers_cols: ColumnType<Record<string, any>>[] = translate_fixed_col(translate_fixed_col(translate_order_col(streaming_stat.subWorkers.to_cols()), 'workerId', 100), 'topic', 450)
    
    function translate_fixed_col (cols: ColumnType<Record<string, any>>[], col_name: string, width: number) {
        const i_col = cols.findIndex(col => col.title === col_name)
        const fixed_col = { ...cols[i_col], fixed: 'left' as FixedType, width }
        cols.splice(i_col, 1, fixed_col)
        return cols
    }
    
    
    function translate_order_col (cols: ColumnType<Record<string, any>>[]) {
     
        const i_queue_depth_col = cols.findIndex(col => col.title === 'queueDepth')
        const i_last_err_msg_col = cols.findIndex(col => col.title === 'lastErrMsg')
        
        const msg_order_function = (a, b) => {  
                                if (a && !b)
                                    return 1
                                else if (b && !a)
                                    return -1 }           
        const order_queue_depth_col = { ...cols[i_queue_depth_col], sorter: (a, b) => a - b, sortOredr: 'descend' }
        const order_last_err_msg_col = { ...cols[i_last_err_msg_col], sorter: msg_order_function, sortOredr: 'descend' }
        cols.splice(i_queue_depth_col, 1, order_queue_depth_col)
        cols.splice(i_last_err_msg_col, 1, order_last_err_msg_col) 
        return cols  
    }
    
    function render_table_name (talbe_name: string, tip: string, button_props?: ButtonProps) {
        const { text, type, handleChange } = button_props || { }
        return <>
            {button_props && <Popconfirm title={delteted_title[type]} onConfirm={handleChange}>
                                <Button danger>{text}</Button>
                             </Popconfirm>}
            <div className='table-name'>{talbe_name}</div>
            <Tooltip title={tip}><QuestionCircleOutlined/></Tooltip>
        </>
    }
    
    
    function add_key (table: Record<string, any>) {
        return table.map(row => { return { ...row, key: Object.values(row)[0] } })
    }
    
    
    async function unsubscribe_tables (table_names: string[]) {
        try {
            await Promise.all(table_names.map(async table_name => model.unsubscribe_table(table_name)))
            model.message.success(t('取消订阅成功'))
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    
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
                <Table columns={sub_workers_cols} 
                       dataSource={ streaming_stat.subWorkers.to_rows()} 
                       bordered 
                       title={() => render_table_name('SubWorkers', t('表 subWorkers 监控订阅节点的工作线程的状态。工作线程状态信息会按照 topic 来展示。'))} 
                       pagination={pagination}
                       scroll={{ x: '200%' }}/>
                <Table rowSelection={{ type: 'checkbox', 
                                       onChange: (selected_keys: React.Key[]) => set_selected_table_name(selected_keys as string[])  }}  
                       columns={streaming_stat.pubTables.to_cols()} 
                       dataSource={ add_key(streaming_stat.pubTables.to_rows())} 
                       bordered 
                       title={() => render_table_name('PubTables',
                                                      t('表 pubTables 监控流数据表状态。每一行表示一个流数据表的信息。'),
                                                      { text: t('批量取消'), 
                                                      type: 'table', 
                                                      handleChange: async () => unsubscribe_tables(selected_table_name) 
                                                      })}
                       pagination={pagination}/>                            
                <Table columns={streaming_stat.subConns.to_cols()} 
                       dataSource={streaming_stat.subConns.to_rows()} 
                       bordered 
                       title={() => render_table_name('SubConns', t('表 subConns 监控本地订阅节点和订阅节点之间的连接状态。每一行表示一个发布节点。'))}  
                       pagination={pagination}/>
                <Table columns={streaming_stat.pubConns.to_cols()} 
                       dataSource={streaming_stat.pubConns.to_rows()} 
                       bordered 
                       title={() => render_table_name('PubConns', t('表 pubConns 监控本地发布节点和它的所有订阅节点之间的连接状态。每一行表示一个订阅节点。'))} 
                       pagination={pagination}/>
            </div>
        </div>
    </>
}
