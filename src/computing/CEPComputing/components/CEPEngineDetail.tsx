import '../index.scss'

import { Badge, Descriptions, type DescriptionsProps, Radio, Table, type TableColumnsType, Space, Empty, Typography, Select, Input, Pagination, Spin, Button } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SearchOutlined, SendOutlined } from '@ant-design/icons'
import { DDB, type StreamingMessage } from 'dolphindb/browser.js'
import NiceModal from '@ebay/nice-modal-react'
import cn from 'classnames'

import { t } from '@i18n'

import { data } from 'react-router'

import useSWRMutation from 'swr/mutation'

import { pick } from 'lodash'

import { type ICEPEngineDetail, EngineDetailPage, type SubEngineItem } from '../type.js'
import { get_dataview_info } from '../api.js'
import { model } from '../../../model.js'
import { stream_formatter } from '../../../dashboard/utils.ts'

import { DDBTable } from '@/components/DDBTable/index.tsx'

import { RefreshButton } from '@/components/RefreshButton/index.tsx'

import { SendEventModal } from './SendEventModal.js'


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
            key: t('子引擎数'),
            label: t('子引擎数'),
            children: engineStat?.numOfSubEngine ?? '-'
        },
        {
            key: t('接收事件数'),
            label: t('接收事件数'),
            children: engineStat?.eventsReceived ?? '-'
        },
        {
            key: t('发送事件数'),
            label: t('发送事件数'),
            children: engineStat?.eventsEmitted ?? '-'
        },
        {
            key: t('事件队列最大深度'),
            label: t('事件队列最大深度'),
            children: engineStat?.queueDepth ?? '-'
        },
        {
            key: t('是否使用系统时间'),
            label: t('是否使用系统时间'),
            children: engineStat?.useSystemTime ? t('是') : t('否')
        },
        {
            key: t('队列中发送事件数'),
            label: t('队列中发送事件数'),
            children: engineStat?.eventsOnOutputQueue ?? '-'
        },
        {
            key: t('最近错误信息'),
            label: t('最近错误信息'),
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
            ellipsis: true,
            fixed: 'left',
        },
        {
            dataIndex: 'eventsOnInputQueue',
            title: t('事件队列中待处理事件数'),
            width: 200,
        },
        {
            dataIndex: 'listeners',
            title: t('事件监听数'),
            width: 150,
        },
        {
            dataIndex: 'timers',
            title: t('计时器数'),
            width: 150,
        },
        {
            dataIndex: 'monitorNumber',
            title: t('监视器数'),
            width: 150
        },
        {
            dataIndex: 'eventsRouted',
            title: t('插入队列头事件数'),
            width: 200,
        },
        {
            dataIndex: 'eventsSent',
            title: t('插入队列尾事件数'),
            width: 150,
        },
        {
            dataIndex: 'eventsReceived',
            title: t('接收事件数'),
            width: 150,
        },
        {
            dataIndex: 'eventsConsumed',
            title: t('匹配成功事件数'),
            width: 150,
        },
        {
            dataIndex: 'lastEventTime',
            title: t('最近接收事件的时间'),
            width: 200,
        },
        {
            dataIndex: 'lastErrorTimestamp',
            title: t('最近错误时间'),
            width: 200,
        },
        {
            dataIndex: 'lastErrorMessage',
            title: t('最近错误信息'),
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
        <DDBTable
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
    
    // 流表数据
    const [dataview_streaming_data, set_dataview_streaming_data] = useState<any[]>([ ])
    // 数据视图 key 选项
    const [dataview_options, set_dataview_options] = useState<{ label: string, value: string }[]>([ ])
    // 数据视图的 keyColumns 列表，keyColumns 对应的 value 组合是唯一的，也是数据视图下面需要筛选的 key
    const [col_keys, set_col_keys] = useState<string[]>([ ])
    // 右边展示的表格
    const [value_table, set_value_table] = useState<any[]>([ ])
    // 当前选中的 key
    const [selected_key, set_selected_key] = useState<string>()
    
    
    
    // 搜索框的值
    const [search_key, set_search_key] = useState<string>()
    
    
    useEffect(() => {
        set_dataview_streaming_data([ ])
        set_dataview_options([ ])
        set_value_table([ ])
        set_selected_key(undefined)
        set_search_key(undefined)
        set_col_keys([ ])
    }, [info])
    
    
    useEffect(() => () => { 
        cep_ddb?.disconnect?.() 
    }, [cep_ddb])
    
    
    
    // 选择 dataview 之后订阅流表
    const on_subscribe = useCallback(async (streaming_table: string) => { 
        // 订阅前取消上个 dataview 的订阅
        cep_ddb?.disconnect()
        const cep_streaming_ddb = new DDB(model.ddb.url, {
            autologin: !!username,
            username,
            password: 'Ddb@1234',
            streaming: {
                table: streaming_table,
                handler (message: StreamingMessage) {
                    if (message.error) {
                        console.error(message.error)
                        return
                    }
                    const streaming_data: any[] = stream_formatter(message.obj, 0, message.data.columns)
                    set_dataview_streaming_data(data => [...streaming_data, ...data])  
                    // 如果新推送的数据存在新的组合，不在 dataview_options 中，更新 dataview_options
                    streaming_data.forEach(item => {
                        const value = pick(item, col_keys)
                        if (!dataview_options.some(option => option.value === JSON.stringify(value))) 
                            set_dataview_options(options => [...options, {
                                label: Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(';\t'),
                                value: JSON.stringify(value)
                            }])
                        
                    })
                }
            }
        })
        await cep_streaming_ddb.connect()
        set_cep_ddb(cep_streaming_ddb)
    }, [cep_ddb, info])
    
    const { trigger: on_select_dataview, isMutating: loading } = useSWRMutation(
        'get_dataview_info',
        async (_url, { arg }: { arg: { name: string } }) => { 
            const { name } = arg
            const { table, key_cols } = await get_dataview_info(info.engineStat.name, name) 
            set_dataview_streaming_data(table)
            set_col_keys(key_cols)
            // 初始化 dataview_options
            set_dataview_options(table.map(item => {
                const key_values = { }
                key_cols.forEach(key => key_values[key] = item[key])
                return {
                    label: Object.entries(key_values).map(([k, v]) => `${k}: ${v}`).join(';\t'),
                    value: JSON.stringify(key_values)
                }
            }))
            // 订阅 dataview 的流表
            const output_table_name = info.dataViewEngines.find(item => item.name === name).outputTableName
            on_subscribe(output_table_name)
        }
    )
    
    
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
                onSelect={async name => on_select_dataview({ name })}
                onClear={() => {
                    cep_ddb?.disconnect?.()
                }}
                showSearch
            />
            <div className='data-view-key-wrapper'>
                <Input 
                    className='data-view-key-search-input' 
                    placeholder={t('请输入要查询的 key')} 
                    suffix={<SearchOutlined />} 
                    onChange={e => { set_search_key(e.target.value) }}
                />
                <Spin spinning={loading}> 
                    {
                        !!dataview_options.length ? <>
                            {
                                dataview_options.filter(item => item.label.includes(search_key ?? '')).map(item => <div
                                    key={item.value}
                                    title={item.label}
                                    className={cn('data-view-key-item', { 'data-view-key-item-active': item.value === selected_key })}
                                    onClick={() => { 
                                        set_selected_key(item.value) 
                                        const key_values = JSON.parse(item.value)
                                        // 找到流表中与选中 key 对应的行，即与 key_values 的 key 和 value 都相等的行
                                        const value_table = dataview_streaming_data.find(item => {
                                            for (let [k, v] of Object.entries(key_values)) 
                                                if (item[k] !== v)
                                                    return false
                                            return true
                                        })
                                        if (value_table)
                                            set_value_table(Object.entries(value_table).map(([k, v]) => ({ name: k, value: v })))
                                    }}
                                >
                                    {item.label}
                                </div>)
                            }
                        </>
                        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    }
                </Spin>
            </div>
        <div />
        </div>
        <DDBTable
            size='small'
            className='data-view-table'
            dataSource={value_table}
            rowKey='name'
            columns={[
                { title: t('名称'), dataIndex: 'name', width: 300 },
                { title: t('值'), dataIndex: 'value' }
            ]}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('请选择需要观测的 key')} /> }} 
            pagination={{
                defaultPageSize: 20,
                pageSizeOptions: ['10', '20', '50'],
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
                {page === EngineDetailPage.INFO && <RefreshButton onClick={on_refresh}  />}
            </Space>
        </div>
        { view }
    </div>
}
