import { Badge, Descriptions, type DescriptionsProps, Menu, Radio, Table, type TableColumnsType, Tree, Space, type TreeProps, message, Empty } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type ICEPEngineDetail, EngineDetailPage, type SubEngineItem } from '../type.js'
import { t } from '../../../../i18n/index.js'
import { Button } from 'antd/lib/index.js'
import { DatabaseOutlined, RedoOutlined, SendOutlined } from '@ant-design/icons'
import { get_dataview_info, get_dataview_keys } from '../api.js'
import { type ItemType } from 'antd/es/menu/hooks/useItems.js'
import { DDB, type StreamingMessage } from 'dolphindb'
import { model } from '../../../model.js'
import { stream_formatter } from '../../../dashboard/utils.js'
import NiceModal from '@ebay/nice-modal-react'
import { SendEventModal } from './SendEventModal.js'

interface IProps { 
    engine: ICEPEngineDetail
    on_refresh: () => void
    className?: string
}



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
            children: engineStat?.lastErrMsg ?? '-'
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
            dataIndex: 'lastErrMsg',
            title: t('最新错误信息'),
            width: 200,
            fixed: 'right'
        }
    ], [ ])
    
    
    return <>
        <h3>{t('基本信息')}</h3>
        <Descriptions items={info_items} column={6} layout='vertical' colon={false} />
        
        <h3>{t('子引擎信息')}</h3>
        <Table
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
    // 缓存连接，每次展开 dataview 的时候新建连接，切换的时候关闭
    const [cep_ddb, set_cep_ddb] = useState<DDB>()
    
    // 用于存储每个 key 对应的 map
    const [key_data, set_key_data] = useState<Record<string, Record<string, string>>>({ })
    
    // 当前选中的 key
    const [selected_key, set_selected_key] = useState<string>()
    
    // 当前选中的 dataview
    const [current, set_current] = useState<string>()
    
    // 当前 cep 引擎的所有 dataview 
    const [views, set_views] = useState<ItemType[]>(() => info?.dataViewEngines?.map(item => ({
        label: item.name,
        key: item.name,
        icon: <DatabaseOutlined />,
        children: [ ]
    })))
    
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
                        set_key_data(data => ({ ...data, [item[key_column]]: item }))                    
                }
            }
        })
        await cep_streaming_ddb.connect()
        set_cep_ddb(cep_streaming_ddb)
    }, [ cep_ddb, info ])
    
    // 菜单展开关闭的回调
    const on_open_change = useCallback(async (keys: string[]) => { 
        // 收起菜单，并将选中的 key 置为 null
        if (!keys.length) { 
            set_current(null)
            set_selected_key(null)
            cep_ddb.disconnect()
            return
        }
        // 保证每次只展开一个 dataview
        const cur = keys[0]
        
        set_current(cur)
        
        // // 点击 dataview 的时候需要加载该 dataview 的 key 并展示
        const dataview_keys = await get_dataview_keys(info.engineStat.name, cur)
        set_views(views => views.map(item => { 
            if (item.key !== cur)
                return item
            else
                return { ...item, children: dataview_keys.map(key => ({ label: key, key })) }
        }))
        
        
        // 拉取 dataview 的初始数据，初始化 key_data
        const data_view_initial_data = await get_dataview_info(info.engineStat.name, cur) 
        const key_column = info.dataViewEngines.find(view => view.name === cur)?.keyColumns?.split(' ')[0]
        for (let key of dataview_keys) {
            const key_item = data_view_initial_data.find(view_item => view_item[key_column] === key)
            set_key_data(data => ({ ...data, [key]: key_item }))
        }
        
        // 订阅流表
        const output_table_name = info.dataViewEngines.find(item => item.name === cur).outputTableName
        on_subscribe(output_table_name, key_column)
    }, [current, info, cep_ddb])
    
    // 当前选中 key 的数据
    const table_data_source = useMemo(() => {
        if (!selected_key)
            return [ ]
        return Object.entries(key_data[selected_key]).map(([name, value]) => ({ name, value }))
    }, [key_data, selected_key])
    
    return <div className='data-view-info'>
        <Menu
            openKeys={current ? [current] : [ ]}
            className='data-view-menu'
            mode='inline'
            items={views}
            onOpenChange={on_open_change}
            onSelect={({ key }) => { set_selected_key(key) }}
            selectedKeys={[selected_key]}
            multiple={false}
        />
        <Table
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
                <Button onClick={on_send_event} icon={<SendOutlined />} type='primary'>{t('发送事件到引擎')}</Button>
                {page === EngineDetailPage.INFO && <Button onClick={on_refresh} icon={<RedoOutlined />}>{t('刷新')}</Button>}
            </Space>
        </div>
        { view }
    </div>
}
