import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Popconfirm, Table, DatePicker, type TableColumnsType, Spin, Result, Tooltip } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import useSWR from 'swr'

import { CheckOutlined, CloseOutlined, MailOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'

import { type Dayjs } from 'dayjs'

import { isNull } from 'lodash'

import { model, NodeType } from '@/model.ts'

import { inspection } from './model.tsx'
import type { Plan, PlanReport } from './type.ts'
import { EditInspection } from './editInspection.tsx'
import { ReportDetailPage } from './reportDetail.tsx'
import { EmailConfigModal } from './emailConfigModal.tsx'
import { LogModal } from './logModal.tsx'


export function Inspection () {
    
    const { node_type } = model.use(['node_type'])
    
    const { table_created, inited, defined, current_report, current_plan, email_config } = inspection.use(['table_created', 'inited', 'defined', 'current_report', 'current_plan', 'email_config'])
    
    const [ search_key, set_search_key ] = useState('')
    
    const [ search_input_value, set_search_input_value ] = useState('')
    
    const [ refresh, set_refresh ] = useState(0)
    
    const refresher = useMemo(() => () => { set_refresh(cnt => cnt + 1) }, [ ])
    useEffect(() => {
        (async () => {
            await inspection.check_inited()
        })()
    }, [ ])
    
    useSWR(['inspection', table_created, inited], async () => {
        // 表已创建但未初始化需要 define 和 init
        if (table_created && !inited && node_type !== NodeType.controller) {
            await inspection.define()
            await inspection.init()
        }
    })
    
    if (node_type === NodeType.controller) 
        return <Result
        status='warning'
        className='interceptor'
        title={t('控制节点不支持自动化巡检，请跳转到数据节点或计算节点查看。')}
    />
    
    if (table_created !== null && !table_created) 
        return  <Result
        title={t('请点击下方按钮完成初始化')}
        subTitle={
            <>
                <p>{t('初始化操作将新增以下数据库表：')}</p>
                <p>dfs://autolnspection/metrics</p>
                <p>dfs://autolnspection/planDetails</p>
                <p>dfs://autolnspection/plans</p>
                <p>dfs://autolnspection/reportDetails</p>
                <p>dfs://autolnspection/reports</p>
            </>
        }
        extra={
            <Popconfirm
                title={t('你确定要初始化自动化巡检功能吗？')}
                onConfirm={async () => { 
                    await inspection.create_table()
                    model.message.success(t('初始化自动化巡检成功！'))
                }}
                okText={t('确定')}
                cancelText={t('取消')}
                >
                <Button type='primary' size='large'>{t('初始化')}</Button>
            </Popconfirm>
        }
    />
    
    
    // table_created 未 null 代表未从 server 获取到 table_created 状态
    if (isNull(table_created) || !inited || !defined) 
        return <div className='spin-container'>
            <Spin size='large' delay={300}/>
        </div>
    
    
    return current_report 
                ?   <ReportDetailPage/> 
                :   current_plan 
                        ? <EditInspection plan={current_plan} refresher={refresher}  disabled/> 
                        : <div>
        <div className='inspection-header'>
            <Button 
                type='primary'
                icon={<PlusOutlined />}
                onClick={ () => { inspection.set({ current_plan:  {   
                    frequency: 'W', 
                    days: '1', 
                } as Plan }) } }>
                    {t('新增巡检')}
            </Button>
                
            <Tooltip 
                title={!email_config.can_config ? email_config.error_msg : ''}>
                <Button
                    icon={<MailOutlined />}
                    disabled={!email_config.can_config}
                    onClick={ () => { NiceModal.show(EmailConfigModal) } }>
                        {t('邮件告警设置')}
                </Button>
            </Tooltip>
            
            <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                    set_search_input_value('')
                    set_search_key('')
                    refresher()
                    model.message.success(t('刷新成功'))
                }}>{t('刷新')}
            </Button>
               
            <Input.Search 
                placeholder={t('请输入想要搜索的巡检名称')} 
                value={search_input_value}
                onChange={e => { set_search_input_value(e.target.value) }}
                onSearch={set_search_key} 
                className='inspection-search'
            />
            
        </div>
       
        {
            defined &&  
            <>
                <PlanListTable enabled search_key={search_key}  refresh={refresh} refresher={refresher}/>
                <PlanListTable search_key={search_key} refresh={refresh} refresher={refresher}/>
                <ReportListTable
                    search_key={search_key} 
                    refresh={refresh}
                />
            </>
        }
        
    </div>
}

function ReportListTable  ({
    search_key,
    refresh
}: {
    search_key: string
    refresh: number
}) {    
    const { inited } = inspection.use(['inited'])
    
    const [ids, set_ids] = useState([ ])
    
    const [current_page, set_current_page] = useState(1)
    const [current_page_size, set_current_page_size] = useState(5)
    
    const [sorter, set_sorter] = useState<[string, 0 | 1] | null>(['receivedTime', 0])
    
    const [success, set_success] = useState<number | null>(null)
    
    const [dates, set_dates] = useState<[Dayjs | null, Dayjs | null] | null>([ null, null ])
    
    useEffect(() => {
        // 刷新重新定位到第一页
        set_current_page(1)
    }, [refresh])
    
    const { data: reports_obj, mutate: mutate_reports } = 
        useSWR([inited, refresh, 'get_reports', dates, sorter, success, current_page, current_page_size, search_key], async () =>  {
            if (inited) {
                const [startTime, endTime] = dates.map(d => d && d.format('YYYY.MM.DD HH:mm:ss'))
                return inspection.get_reports(null, null, startTime, endTime, success, current_page, current_page_size, search_key, sorter[0], sorter[1])
            }
            else 
                inspection.define()
    }, { keepPreviousData: true })
    
    
    const cols: TableColumnsType<PlanReport> = useMemo(() => [ 
        {
            title: t('ID'),
            dataIndex: 'planId',
            key: 'planId',
        },
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: t('提交人'),
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: t('收到作业时间'),
            dataIndex: 'receivedTime',
            key: 'receivedTime',
            sorter: true,
        },
        {
            title: t('开始时间'),
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: t('结束时间'),
            dataIndex: 'endTime',
            key: 'endTime',
        },
        {
            title: t('结果'),
            dataIndex: 'success',
            key: 'success',
            filterMultiple: false,
            filters: [
                {
                    text: t('正常'),
                    value: 1,
                },
                {
                    text: t('异常'),
                    value: 0,
                },
                {
                    text: t('执行中'),
                    value: 2,
                },
              ],
            sorter: true,
            render: ( success: boolean | null, record: PlanReport ) => isNull(success) ? <span className='yellow'>{t('执行中')}</span> : success ? 
                <span className='green'>{t('{{success}}/{{total}} 正常', { success: record.totalNum, total: record.totalNum })}</span> : 
                <span className='red'>{t('{{failedNum}}/{{total}} 异常', { failedNum: record.failedNum, total: record.totalNum })}</span>
        },
        {
            title: t('操作'),
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <>
                    <Button
                        type='link'
                        disabled={isNull(record.success)}
                        onClick={() => { inspection.set({ current_report: record }) }}
                    >
                        {t('查看详细报告')}
                    </Button>
                    
                    <Button
                        type='link'
                        onClick={() => { NiceModal.show(LogModal, { reportId: record.id, node: record.enabledNode }) }}
                    >
                        {t('查看日志')}
                    </Button>
                    
                    <Popconfirm   
                        title={t('删除巡检结果')} 
                        description={t('确认删除此巡检结果吗？')} 
                        onConfirm={async () => { 
                            await inspection.delete_reprorts([record.id])
                            model.message.success(t('删除成功'))
                            mutate_reports()
                        }} >
                        <Button
                            type='link'
                            disabled={isNull(record.success)}
                            danger
                        >
                        {t('删除')}
                        </Button>
                    </Popconfirm> 
            </>
               
                
        },
    ], [ ])
    
    return <Table 
                title={() => <div className='report-table-header'>
                    <div className='report-table-header-left'>
                        <h2>{t('巡检结果')}</h2>
                        <DatePicker.RangePicker 
                            value={dates} 
                            onChange={set_dates} 
                            showTime 
                            placeholder={[t('开始时间'), t('结束时间')]}/>
                    </div>
                <Popconfirm   
                    title={t('批量删除巡检结果')} 
                    description={t('确认删除选中的巡检结果吗？')} 
                    onConfirm={async () => {
                        await inspection.delete_reprorts(ids)
                        model.message.success(t('批量删除成功'))
                        set_current_page(1)
                        mutate_reports()
                    }} >
                        <Button danger disabled={ids.length === 0}>{t('批量删除')}</Button>
                </Popconfirm>
                </div>}
                onChange={(_, filter, sorter) => {
                    if (filter?.success && filter.success.length > 0) 
                        set_success(Number(filter.success[0]))
                    else
                        set_success(null)
                    
                    if (Array.isArray(sorter))
                        sorter = sorter[0]
                    if (sorter.order) 
                        set_sorter([String(sorter.field), sorter.order === 'ascend' ? 1 : 0])
                }}
                rowSelection={{ type: 'checkbox', selectedRowKeys: ids, onChange: set_ids }}
                dataSource={reports_obj?.records} 
                columns={cols}
                rowKey='id' 
                pagination={{
                    current: current_page,
                    pageSize: current_page_size,
                    pageSizeOptions: [5, 10, 20, 50, 100],
                    total: Number(reports_obj?.total),
                    showSizeChanger: true,
                    onChange: (current_page, current_page_size) => {
                        set_current_page(current_page)
                        set_current_page_size(current_page_size)
                    }
            }} 
        />
}

function PlanListTable  ({
    search_key,
    enabled = false,
    refresh,
    refresher
}: {
    search_key: string
    enabled?: boolean
    refresh: number
    refresher: () => void
})  {
    const { inited } = inspection.use(['inited'])
    
    const [ids, set_ids] = useState([ ])
    
    useEffect(() => {
        // 刷新重新定位到第一页
        set_current_page(1)
    }, [refresh])
    
    const [current_page, set_current_page] = useState(1)
    const [current_page_size, set_current_page_size] = useState(5)
    
    const { data: plans_obj, mutate: mutate_plans } = 
        useSWR([inited, 'get_plans',  enabled, search_key, refresh, current_page, current_page_size], async () => {
            if (inited) 
                return inspection.get_plans(enabled, current_page, current_page_size, search_key)
            else 
                inspection.define()
    }, { keepPreviousData: true })
    
    const cols: TableColumnsType<Plan> = useMemo(() => [ 
        {
            title: t('ID'),
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: t('提交人'),
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: t('开始日期'),
            dataIndex: 'startDate',
            key: 'startDate',
        },
        {
            title: t('结束日期'),
            dataIndex: 'endDate',
            key: 'endDate',
        },
        {
            title: t('巡检频率'),
            dataIndex: 'frequency',
            key: 'frequency',
        },
        {
            title: t('巡检日期'),
            dataIndex: 'days',
            key: 'days',
        },
        {
            title: t('巡检时间'),
            dataIndex: 'scheduleTime',
            key: 'scheduleTime',
            render: (scheduleTime: string[]) => scheduleTime.join(', ')
        },
        {
            title: t('操作'),
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => 
                <>
                     <Popconfirm
                        placement='topLeft'
                        title={t('确定巡检')}
                        description={t('确定立即巡检 {{name}} 吗？', { name: record.name })}
                        okText={t('确定')}
                        cancelText={t('取消')}
                        onConfirm={async () => {
                            await inspection.run_plan(record.id)
                            model.message.success(t('执行成功'))
                            refresher()
                        }}
                        >
                        <Button 
                            type='link'
                            >
                        {t('立即巡检')}
                        </Button>
                    </Popconfirm>
                   
                    <Button 
                        type='link'
                        onClick={() => { inspection.set({ current_plan: record }) }}
                    >
                        {t('查看详情')}
                    </Button>
                    
                    <Button 
                        type='link'
                        disabled={record.lastReportId === ''}
                        onClick={() => { inspection.set({ current_report: { id: record.lastReportId } as PlanReport }) }}
                    >
                        {t('查看最近一次巡检结果')}
                    </Button>
                    <Button 
                        type='link'
                        onClick={async () => {
                            if (enabled) 
                                await inspection.disable_plan(record.id) 
                            else
                                await inspection.enable_plan(record.id)
                            model.message.success(t('执行成功'))
                            // 这里需要全局刷新
                            refresher()
                        }}
                    >
                        {enabled ?  t('暂停') : t('启用')}
                    </Button>
                    <Popconfirm 
                        title={t('删除方案')} 
                        description={t('确认删除巡检方案 {{plan}} 吗？', { plan: record.name })} 
                        onConfirm={async () => {
                            await inspection.delete_plans([record.id])
                            model.message.success(t('删除成功'))
                            mutate_plans()
                        }} >
                        <Button type='text' danger >{t('删除')}</Button>
                    </Popconfirm> 
                </>
        },
    ], [ refresher ])
    
    return <Table
                title={() => 
                    <div className='plan-table-header'>
                        <h2>{enabled ? t('进行中的巡检队列') : t('未进行的巡检队列')}</h2>
                        <Popconfirm   
                            title={t('批量删除巡检方案')} 
                            description={t('确认删除选中的巡检方案吗？')} 
                            onConfirm={async () => {
                                await inspection.delete_plans(ids)
                                model.message.success(t('批量删除成功'))
                                set_current_page(1)
                                mutate_plans()
                            }} >
                                <Button danger disabled={ids.length === 0}>{t('批量删除')}</Button>
                        </Popconfirm>
                    </div>}
                rowSelection={{ type: 'checkbox', selectedRowKeys: ids, onChange: set_ids }}
                pagination={{
                    current: current_page,
                    pageSize: current_page_size,
                    pageSizeOptions: [5, 10, 20, 50, 100],
                    total: plans_obj?.total || 0,
                    showSizeChanger: true,
                    onChange: (current_page, current_page_size) => {
                        set_current_page(current_page)
                        set_current_page_size(current_page_size)
                    }
                }} 
                rowKey='id' 
                dataSource={plans_obj?.records} 
                columns={cols} />        
}

export const SuccessStatus = <CheckOutlined className='green'/>
export const FailedStatus = <CloseOutlined className='red'/>
