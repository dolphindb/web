import '../index.scss'
import { Badge, Descriptions, type DescriptionsProps, Radio, Table, type TableColumnsType, Space, Empty, Typography, Select, Input, Pagination, Spin } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type ICEPEngineDetail, EngineDetailPage, type SubEngineItem } from '../type.js'
import { t } from '../../../../i18n/index.js'
import { Button } from 'antd'
import { RedoOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons'
import { get_dataview_info } from '../api.js'
import { DDB, type StreamingMessage } from 'dolphindb'
import { model } from '../../../model.js'
import { stream_formatter } from '../../../dashboard/utils.js'
import NiceModal from '@ebay/nice-modal-react'
import { SendEventModal } from './SendEventModal.js'
import cn from 'classnames'


function EngineInfo ({ info }: { info: ICEPEngineDetail }) {
    
    const { engineStat, subEngineStat } = info ?? { }
    
    const info_items = useMemo<DescriptionsProps['items']>(() => [
        {
            key: t('引擎名称'),
            label: t('引擎名称'),
            children: engineStat?.name ?? '-'
        },
        {
            key: t('创建人'),
            label: t('创建人'),
            children: engineStat?.user ?? '-'
        },
        {
            key: t('状态'),
            label: t('状态'),
            children: <Badge status='processing' text={t('运行中')} />
        },
        {
            key: t('子引擎数量'),
            label: t('子引擎数量'),
            children: engineStat?.numOfSubEngine ?? '-'
        },
        {
            key: t('收到事件数量'),
            label: t('收到事件数量'),
            children: engineStat?.eventsReceived ?? '-'
        },
        {
            key: t('发送事件数量'),
            label: t('发送事件数量'),
            children: engineStat?.eventsEmitted ?? '-'
        },
        {
            key: t('队列深度'),
            label: t('队列深度'),
            children: engineStat?.queueDepth ?? '-'
        },
        {
            key: t('是否使用系统时间'),
            label: t('是否使用系统时间'),
            children: engineStat?.useSystemTime ? t('是') : t('否')
        },
        {
            key: t('队列中发送事件数量'),
            label: t('队列中发送事件数量'),
            children: engineStat?.eventsOnOutputQueue ?? '-'
        },
        {
            key: t('最后一条错误信息'),
            label: t('最后一条错误信息'),
            children: <Typography.Paragraph ellipsis={{ rows: 2, symbol: t('展开'), expandable: true } }>
                { engineStat?.lastErrorMessage ?? '-' }
            </Typography.Paragraph>
        }
    ], [engineStat])
    
    const cols = useMemo<TableColumnsType<SubEngineItem>>(() => [
        {
            dataIndex: 'subEngineName',
            title: t('名称'),
            width: 150,
            fixed: 'left',
        },
        {
            dataIndex: 'eventsOnInputQueue',
            title: t('输入队列中待处理事件数'),
            width: 200,
        },
        {
            dataIndex: 'listeners',
            title: t('事件监听数'),
            width: 150,
        },
        {
            dataIndex: 'timers',
            title: t('计时器监听数'),
            width: 150,
        },
        {
            dataIndex: 'eventsRouted',
            title: t('内部 Routed 的事件数'),
            width: 200,
        },
        {
            dataIndex: 'eventsSent',
            title: t('发送事件数'),
            width: 150,
        },
        {
            dataIndex: 'eventsReceived',
            title: t('接收事件数'),
            width: 150,
        },
        {
            dataIndex: 'eventsConsumed',
            title: t('已处理事件数'),
            width: 150,
        },
        {
            dataIndex: 'lastEventTime',
            title: t('最新接收事件的时间'),
            width: 200,
        },
        {
            dataIndex: 'lastErrorTimestamp',
            title: t('最新错误时间'),
            width: 200,
        },
        {
            dataIndex: 'lastErrorMessage',
            title: t('最新错误信息'),
            width: 300,
            render: msg => <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: t('展开') }}>
                {msg}
            </Typography.Paragraph>
        },
        
    ], [ ])
    
    
    return <>
        <h3>{t('基本信息')}</h3>
        <Descriptions items={info_items} column={6} layout='vertical' colon={false} />
        
        <h3>{t('子引擎信息')}</h3>
        <Table
            size='small'
            className='sub-engine-table'
            tableLayout='fixed'
            columns={cols}
            dataSource={subEngineStat ?? [ ]}
            scroll={{ x: '100%' }}
            rowKey='subEngineName'
            pagination={{
                defaultPageSize: 5,
                pageSizeOptions: ['5', '10', '20'],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true,
                hideOnSinglePage: true
            }}
        />
    </>
}



function DataView ({ info }: { info: ICEPEngineDetail }) {
    
    const { ddb: { username, password } } = model
    // 缓存连接，每次选择 dataview 的时候新建连接，订阅 dataview 的流表，切换的时候关闭
    const [cep_ddb, set_cep_ddb] = useState<DDB>()
    const [loading, set_loading] = useState(false)
    // 用于存储每个 key 对应的数据，初始化的时候或者接受到流表推送的时候更新
    const [key_data_map, set_key_data_map] = useState<Record<string, Record<string, string>>>({ })
    // 当前选中的 key
    const [selected_key, set_selected_key] = useState<string>()
    // dataview 的所有 key
    const [view_keys, set_view_keys] = useState<string[]>([ ])
    const [key_info, set_key_info] = useState({
        // 与 view_keys 可能会有不同，因为做了模糊搜索
        keys: [ ],
        page: 1,
        page_size: 10
    })
    
    
    useEffect(() => {
        return () => { cep_ddb?.disconnect?.() }
    }, [cep_ddb])
    
    const reset = useCallback(() => { 
        set_key_info({
            keys: [ ],
            page: 1,
            page_size: 10
        })
        set_key_data_map({ })
        set_view_keys([ ])
    }, [ ])
    
    useEffect(() => { 
        reset()
    }, [info.engineStat.name])
    
    
    // 订阅流表
    const on_subscribe = useCallback(async (streaming_table: string, key_column: string) => { 
        // 订阅前取消上个 dataview 的订阅
        if (cep_ddb)  
            cep_ddb.disconnect()
            
        const url_search_params = new URLSearchParams(location.search)
        const streaming_host = (model.dev || model.cdn) ? url_search_params.get('hostname') + ':' + new URLSearchParams(location.search).get('port') : location.host
        const url =  (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + streaming_host
        
        const cep_streaming_ddb = new DDB(url, {
            autologin: !!username,
            username,
            password,
            streaming: {
                table: streaming_table,
                handler (message: StreamingMessage) {
                    if (message.error) {
                        console.error(message.error)
                        return
                    }
                    // @ts-ignore
                    const streaming_data = stream_formatter(message.data, 0, message.colnames)
    
                    for (let item of streaming_data)  
                        set_key_data_map(data => ({ ...data, [item[key_column]]: item }))                    
                }
            }
        })
        await cep_streaming_ddb.connect()
        set_cep_ddb(cep_streaming_ddb)
    }, [cep_ddb, info])
    
    // 选择 dataview
    const on_select = useCallback(async name => {         
        set_loading(true)
        const { table, keys, key_col } = await get_dataview_info(info.engineStat.name, name) 
        set_view_keys(keys)
        
        set_key_info(val => ({ ...val, keys }))
        
        const key_map = { }
        for (let key of keys)  
            key_map[key] = table.find(view_item => view_item[key_col] === key)
        
        set_key_data_map(key_map)
        const output_table_name = info.dataViewEngines.find(item => item.name === name).outputTableName
        on_subscribe(output_table_name, key_col)
        
        set_loading(false)
        
    }, [info])
    
    const on_search_key = useCallback((e:  React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = e.target.value
        if (!name)
            set_key_info(val => ({ ...val, keys: view_keys }))
        set_key_info(val => ({ ...val, keys: view_keys.filter(item => item.includes(name)) }))
    }, [view_keys])
    
    const table_data_source = useMemo(() => {
        if (!selected_key)
            return [ ]
        // 将宽表转化为窄表
        return Object.entries(key_data_map?.[selected_key] ?? { }).map(([name, value]) => ({ name, value }))
    }, [key_data_map, selected_key])
    
    return <div className='data-view-info'>
        <div>
            <Select
                allowClear
                className='data-view-select'
                placeholder={t('请选择数据视图')}
                options={info?.dataViewEngines?.map(item => ({
                    label: item.name,
                    value: item.name
                }))}
                onSelect={on_select}
                onClear={() => {
                    reset()
                    cep_ddb?.disconnect?.()
                }}
                showSearch
            />
            <div className='data-view-key-wrapper'>
                <Input className='data-view-key-search-input' placeholder={t('请输入要查询的 key')} suffix={<SearchOutlined />} onChange={on_search_key}/>
                <Spin spinning={loading}> 
                    {
                        !!key_info.keys.length ? <>
                            {
                                key_info.keys
                                    .slice((key_info.page - 1) * key_info.page_size, key_info.page * key_info.page_size)
                                    .map(key => <div
                                        key={key}
                                        className={cn('data-view-key-item', { 'data-view-key-item-active': key === selected_key })}
                                        onClick={() => { set_selected_key(key) }}
                                    >
                                        {key}
                                    </div>)
                            }
                            <Pagination
                                simple
                                size='small'
                                onChange={(page, page_size) => { set_key_info(val => ({ ...val, page, page_size })) }}
                                defaultCurrent={key_info.page}
                                total={key_info.keys.length}
                                hideOnSinglePage
                            />
                        </>
                        : <Empty />
                    }
                </Spin>
            </div>
        <div />
        </div>
        <Table
            size='small'
            className='data-view-table'
            dataSource={table_data_source}
            rowKey='name'
            columns={[
                { title: t('名称'), dataIndex: 'name', width: 300 },
                { title: t('值'), dataIndex: 'value' }
            ]}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('请选择需要观测的 key')} /> }} 
            pagination={{
                defaultPageSize: 10,
                pageSizeOptions: ['5', '10', '20'],
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true,
                hideOnSinglePage: true
            }}
        />
    </div>
        
}

interface IProps { 
    engine: ICEPEngineDetail
    on_refresh: () => void
    className?: string
}

export function CEPEngineDetail (props: IProps) {
    const { engine, className, on_refresh } = props 
    const [page, set_page] = useState(EngineDetailPage.INFO) 
    
    const view = useMemo(() => { 
        switch (page) { 
            case EngineDetailPage.DATAVIEW:
                return <DataView info={engine} />
            default:
                return <EngineInfo info={engine} />
        }
    }, [page, engine])
    
    const on_send_event = useCallback(async () => { 
        await NiceModal.show(SendEventModal, { engine_info: engine, on_refresh })
    }, [engine])
    
    return <div className={`cep-engine-detail ${className}`}>
        <div className='cep-detail-header'>
            <Radio.Group value={page} onChange={e => { set_page(e.target.value) }}>
                <Radio.Button value={EngineDetailPage.INFO}>{t('引擎信息')}</Radio.Button>
                <Radio.Button value={EngineDetailPage.DATAVIEW}>{t('数据视图')}</Radio.Button>
            </Radio.Group>
            
            <Space>
                <Button onClick={on_send_event} icon={<SendOutlined />}>{t('发送事件到引擎')}</Button>
                {page === EngineDetailPage.INFO && <Button onClick={on_refresh} icon={<RedoOutlined />}>{t('刷新')}</Button>}
            </Space>
        </div>
        { view }
    </div>
}
