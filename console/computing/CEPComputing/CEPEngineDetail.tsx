import { Badge, Descriptions, type DescriptionsProps, Divider, Menu, Radio, Spin, Table, type TableColumnsType, TableProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type CEPEngineDetail, EngineDetailPage, type SubEngineItem } from './type.js'
import { t } from '../../../i18n/index.js'
import { get_cep_engine_detail } from './api.js'
import { Button } from 'antd/lib/index.js'
import { SendOutlined } from '@ant-design/icons'

interface IProps { 
    engine: string
}


function EngineInfo ({ info = { } }: { info: CEPEngineDetail }) {
    
    const { EngineStat, SubEngineStat, msgSchema } = info 
    
    const info_items = useMemo<DescriptionsProps['items']>(() => [
        {
            key: t('引擎名称'),
            label: t('引擎名称'),
            children: EngineStat?.name ?? '-'
        },
        {
            key: t('创建人'),
            label: t('创建人'),
            children: EngineStat?.user ?? '-'
        },
        {
            key: t('状态'),
            label: t('状态'),
            children: <Badge status='processing' text={t('运行中')} />
        },
        {
            key: t('子引擎数量'),
            label: t('子引擎数量'),
            children: EngineStat?.numOfSubEngine ?? '-'
        },
        {
            key: t('收到事件数量'),
            label: t('收到事件数量'),
            children: EngineStat?.eventsReceived ?? '-'
        },
        {
            key: t('发送事件数量'),
            label: t('发送事件数量'),
            children: EngineStat?.eventsEmitted ?? '-'
        },
        {
            key: t('队列深度'),
            label: t('队列深度'),
            children: EngineStat?.queueDepth ?? '-'
        },
        {
            key: t('是否使用系统时间'),
            label: t('是否使用系统时间'),
            children: EngineStat?.useSystemTime ? t('是') : t('否')
        },
        {
            key: t('队列中发送事件数量'),
            label: t('队列中发送事件数量'),
            children: EngineStat?.eventsOnOutputQueue ?? '-'
        },
        {
            key: t('最后一条错误信息'),
            label: t('最后一条错误信息'),
            children: EngineStat?.lastErrMsg ?? '-'
        }
    ], [info])
    
    const cols = useMemo<TableColumnsType<SubEngineItem>>(() => [
        {
            dataIndex: 'subEngineName',
            title: t('名称'),
            width: 200,
            fixed: 'left',
        },
        {
            dataIndex: 'eventsOnInputQueue',
            title: t('输入队列中待处理事件数'),
            width: 300,
        },
        {
            dataIndex: 'listeners',
            title: t('事件监听数'),
            width: 200,
        },
        {
            dataIndex: 'timers',
            title: t('计时器监听数'),
            width: 200,
        },
        {
            dataIndex: 'eventsRouted',
            title: t('内部 Routed 的事件数'),
            width: 200,
        },
        {
            dataIndex: 'eventsSent',
            title: t('发送事件数'),
            width: 200,
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
            width: 150,
        },
        {
            dataIndex: 'lastErrMsg',
            title: t('最新错误信息'),
            width: 200,
            fixed: 'right',
        }
    ], [ ])
    
    
    return <>
        <h3>{t('基本信息')}</h3>
        <Descriptions items={info_items} column={6} layout='vertical' colon={false} />
        
        <h3>{t('子引擎信息')}</h3>
        <Table scroll={{ x: '100%' }} columns={cols} dataSource={SubEngineStat ?? [ ]}/>
    </>
}


function DataView ({ info }: { info: CEPEngineDetail }) {
    
    const [data_views, set_data_views] = useState([ ])
    // 当前选中的 key
    const [current_key, set_current_key] = useState<string>()
    
    const on_refresh = useCallback(() => { 
        // 调用 getDataViewEngine 获取最新的数据
    }, [ ])
    
    // 订阅流表
    const on_subscribe = useCallback(() => { }, [ ])
    
    useEffect(() => { 
        // 首次进入调用 getDataViewEngine 获取最新数据，之后非手动刷新的情况下采用流订阅的方式更新数据
        on_refresh()
    }, [ ])
    
    return <>
        <div className='cep-btn-wrapper'>
            <Button onClick={on_refresh}>{t('刷新')}</Button>
        </div>
        <Menu items={[ ]} onClick={({ key }) => { set_current_key(key) }} />
        <Table />
    </>
}

export function CEPEngineDetail (props: IProps) {
    const { engine } = props 
    const [page, set_page] = useState(EngineDetailPage.INFO) 
    const [engine_info, set_engine_info] = useState<CEPEngineDetail>()
    const [loading, set_loading] = useState(false)
    
    const get_engine_info = useCallback(async () => { 
        if (!engine)
            return
        const detail = await get_cep_engine_detail(engine)
        set_engine_info(detail)
        set_loading(false)
    }, [engine])
    
    console.log(engine_info, 'detail')
    
    useEffect(() => { 
        get_engine_info()
    }, [ ])
    
    const view = useMemo(() => { 
        switch (page) { 
            case EngineDetailPage.DATAVIEW:
                return <DataView info={engine_info} />
            default:
                return <EngineInfo info={engine_info}/>
        }
    }, [page, engine, engine_info])
    
    return <div className='cep-engine-detail'>
        <div>
            <Radio.Group value={page} onChange={e => { set_page(e.target.value) }}>
                <Radio.Button value={EngineDetailPage.INFO}>{t('引擎信息')}</Radio.Button>
                <Radio.Button value={EngineDetailPage.DATAVIEW}>{t('数据视图')}</Radio.Button>
            </Radio.Group>
            <Button icon={<SendOutlined />}>{ t('发送事件到引擎') }</Button>
        </div>
        {
            loading
                ? <Spin spinning={loading}><div className='spin-content' /></Spin>
                : view
        }
    </div>
}
