import '../index.scss'

import { Badge, Descriptions, type DescriptionsProps, Radio, type TableColumnsType, Space, Empty, Typography, Select, Input, Spin, Button } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SearchOutlined, SendOutlined } from '@ant-design/icons'
import { DDB, type StreamingMessage } from 'dolphindb/browser.js'
import NiceModal from '@ebay/nice-modal-react'
import cn from 'classnames'
import { strcmp } from 'xshell/utils.browser.js'

import { t } from '@i18n'

import useSWR from 'swr'

import { type ICEPEngineDetail, EngineDetailPage, type SubEngineItem } from '../type.js'
import { model } from '../../../model.js'

import { DDBTable } from '@components/DDBTable/index.tsx'

import { RefreshButton } from '@components/RefreshButton/index.tsx'

import { get_dataview_info } from '../api.ts'

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
    const subscribe_ref = useRef<{
        ddb: DDB
        table: string
    }>(null)
    
    const [dataview, set_dataview] = useState<string>()
    
    // 当前选中的 key
    const [selected_key, set_selected_key] = useState<string>( )
    // 搜索框的值
    const [search_key, set_search_key] = useState<string>()
    
     // 引擎变更，重置所有状态
     useEffect(() => {
        set_selected_key(undefined)
        set_dataview(undefined)
        set_search_key(undefined)
        subscribe_ref.current?.ddb?.disconnect()
        subscribe_ref.current = null
    }, [info.engineStat.name])
    
    
    // 组件卸载，断开连接
    useEffect(() => 
        () => { subscribe_ref.current?.ddb?.disconnect() },
        [ ])
    
    const { data: keys = [ ], mutate, isLoading: loading } = useSWR(
        dataview ? ['get_dataview_info', dataview] : null,
        async () => {
            const { table = [ ], key_cols = [ ] } = await get_dataview_info(info.engineStat.name, dataview) 
            // dataview 的输出流表
            const output_table_name = info.dataViewEngines.find(item => item.name === dataview).outputTableName
            // 如果输出流表与当前订阅的流表不同，则重新订阅流表
            if (subscribe_ref.current?.table !== output_table_name && output_table_name) 
                subscribe_streaming_table(output_table_name)
                  
            // 生成 key 列表
            return table.map(item => {
                const label = key_cols?.map(key => `${key}: ${item[key]}`).join('  ') 
                // value 用于存储当前 key 对应的行
                return { label, value: item }
            })
        }
    )
    
    async function subscribe_streaming_table (streaming_table: string) { 
        subscribe_ref.current?.ddb?.disconnect()
        const cep_streaming_ddb = new DDB(model.ddb.url, {
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
                    // 检测到流表更新，重新更新 dataview 截面信息
                    mutate()
                }
            }
        })
        await cep_streaming_ddb.connect()
        subscribe_ref.current = { 
            ddb: cep_streaming_ddb,
            table: streaming_table
        }
    }
    
    
    return <div className='data-view-info'>
        <div>
            <Select
                className='data-view-select'
                placeholder={t('请选择数据视图')}
                value={dataview}
                // dataview 名称按照字母序排序
                options={(info.dataViewEngines ?? [ ])
                    .sort((a, b) => strcmp(a.name, b.name))
                    .map(item => ({
                        label: item.name,
                        value: item.name
                    }))
                }
                onSelect={value => {
                    set_dataview(value)
                    set_selected_key(undefined)
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
                        keys.length ? <div className='key-list'>
                            {
                                 (search_key ? keys.filter(item => item.label.includes(search_key)) : keys).map(item => <div
                                        key={item.label}
                                        title={item.label}
                                        className={cn(
                                            'data-view-key-item', 
                                            { 'data-view-key-item-active': item.label === selected_key }
                                        )}
                                        onClick={() => { 
                                            set_selected_key(item.label)
                                        }}
                                    >
                                        {item.label}
                                    </div>)
                                
                            }
                        </div>
                        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                    }
                </Spin>
            </div>
        <div />
        </div>
        <DDBTable
            size='small'
            className='data-view-table'
            dataSource={Object.entries(keys.find(item => item.label === selected_key)?.value ?? { })
                .map(([name, value]) => {
                    if (['string', 'number'].includes(typeof value) || value === null)
                        return { name, value }
                    else if (typeof value === 'bigint')
                        return { name, value: value.toString() }
                    else
                        return { name, value: JSON.stringify(value) }
                })}
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
