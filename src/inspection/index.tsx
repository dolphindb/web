import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Popconfirm, Table, DatePicker, type TableColumnsType, Spin } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import useSWR from 'swr'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import { type Dayjs } from 'dayjs'

import { isNull } from 'lodash'

import { model } from '@/model.ts'

import { inspection } from './model.tsx'
import type { Plan, PlanReport } from './type.ts'
import { EditInspectionModal } from './editInspectionModal.tsx'
import { ReportDetailPage } from './reportDetail.tsx'
import { emailConfigModal } from './emailConfigModal.tsx'


export function Inspection () {
    
    const { inited, current_report, current_plan } = inspection.use(['inited', 'current_report', 'current_plan'])
    
    const [search_key, set_search_key ] = useState('')
    
    const [refresh, set_refresh] = useState({ })
    
    useEffect(() => {
        if (!inited) 
            inspection.init()
        
    }, [inited])
    
    const refresher = useCallback(() => { set_refresh({ }) }, [ ])
    
    if (!inited) 
        return <div className='spin-container'>
            <Spin size='large' delay={300} tip={t('自动化巡检模块初始化中')}/>
        </div>
    
    
    return current_report ? <ReportDetailPage/> : current_plan ? <EditInspectionModal plan={current_plan} mutate_plans={refresher} disabled/> : <div>
        <div className='inspection-header'>
            <div className='inspection-header-left'>
                <Input.Search placeholder={t('搜索')} onSearch={set_search_key} className='inspection-search'/>
            </div>
            
            
            <div className='inspection-header-right'>
                    <Button 
                        onClick={() => {
                            set_refresh({ })
                            model.message.success(t('刷新成功'))
                        }}>{t('刷新')}
                    </Button>
                <Button 
                    onClick={ () => { NiceModal.show(emailConfigModal) } }>
                        {t('邮件告警设置')}
                </Button>
                
                <Button 
                    onClick={ () => { inspection.set({ current_plan:  {   
                        frequency: 'W', 
                        days: '1', 
                    } as Plan }) } }>
                        {t('新增巡检')}
                </Button>
            </div>
            
        </div>
       
        {
            inited &&  
            <>
                <PlanListTable enabled search_key={search_key}  refresh={refresh} />
                <PlanListTable enabled={false} search_key={search_key} refresh={refresh} />
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
    refresh: object
}) {    
    const { inited } = inspection.use(['inited'])
    
    const [ids, set_ids] = useState([ ])
    
    const [current_page, set_current_page] = useState(1)
    const [current_page_size, set_current_page_size] = useState(5)
    
    const [dates, set_dates] = useState<[Dayjs | null, Dayjs | null] | null>([ null, null ])
    
    useEffect(() => {
        // 刷新重新定位到第一页
        set_current_page(1)
    }, [refresh])
    
    const { data: reports_obj, mutate: mutate_reports } = 
        useSWR([inited, refresh, 'get_reports', dates, current_page, current_page_size, search_key], async () =>  {
            if (inited) {
                const [startTime, endTime] = dates.map(d => d && d.format('YYYY.MM.DD HH:mm:ss'))
                return inspection.get_reports(null, null, startTime, endTime, current_page, current_page_size, search_key)
            }
            else 
                inspection.init()
    })
    
    const cols: TableColumnsType<PlanReport> = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'planId',
            key: 'planId',
        },
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '描述',
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: '提交人',
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: '收到作业时间',
            dataIndex: 'receivedTime',
            key: 'receivedTime',
        },
        {
            title: '开始时间',
            dataIndex: 'startTime',
            key: 'startTime',
        },
        {
            title: '结束时间',
            dataIndex: 'endTime',
            key: 'endTime',
        },
        {
            title: '结果',
            dataIndex: 'success',
            key: 'success',
            render: ( success: boolean | null, record: PlanReport ) => isNull(success) ? <span className='yellow'>{t('执行中')}</span> : success ? 
                <span className='green'>{t('{{success}}/{{total}} 正常', { success: record.totalNum, total: record.totalNum })}</span> : 
                <span className='red'>{t('{{failedNum}}/{{total}} 异常', { failedNum: record.failedNum, total: record.totalNum })}</span>
        },
        {
            title: '操作',
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
                        disabled={isNull(record.success)}
                        danger
                        onClick={async () => { 
                            await inspection.delete_reprorts([record.id])
                            model.message.success(t('删除成功'))
                            mutate_reports()
                         }}
                    >
                        {t('删除')}
                    </Button>
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
                    title={t('批量删除巡检方案')} 
                    description={t('确认删除选中的巡检方案吗？')} 
                    onConfirm={async () => {
                        await inspection.delete_reprorts(ids)
                        model.message.success(t('批量删除成功'))
                        set_current_page(1)
                        mutate_reports()
                    }} >
                        <Button danger disabled={ids.length === 0}>{t('批量删除')}</Button>
                </Popconfirm>
            </div>}
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
    enabled,
    refresh
}: {
    search_key: string
    enabled: boolean
    refresh: object
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
                inspection.init()
    })
    
    const cols: TableColumnsType<Plan> = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '描述',
            dataIndex: 'desc',
            key: 'desc',
        },
        {
            title: '提交人',
            dataIndex: 'user',
            key: 'user',
        },
        {
            title: '开始日期',
            dataIndex: 'startDate',
            key: 'startDate',
        },
        {
            title: '结束日期',
            dataIndex: 'endDate',
            key: 'endDate',
        },
        {
            title: '巡检频率',
            dataIndex: 'frequency',
            key: 'frequency',
        },
        {
            title: '巡检日期',
            dataIndex: 'days',
            key: 'days',
        },
        {
            title: '巡检时间',
            dataIndex: 'scheduleTime',
            key: 'scheduleTime',
            render: (scheduleTime: string[]) => scheduleTime.join(', ')
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => 
                <>
                    <Button 
                        type='link'
                        onClick={async () => {
                            await inspection.run_plan(record.id)
                            model.message.success(t('执行成功'))
                            // todo
                        }}
                    >
                        {t('立即巡检')}
                    </Button>
                    <Button 
                        type='link'
                        onClick={() => { inspection.set({ current_plan: record }) }}
                    >
                        {t('查看详情')}
                    </Button>
                    
                    <Button 
                        type='link'
                        disabled={isNull(record.lastReportld)}
                        onClick={() => { inspection.set({ current_report: { id: record.lastReportld } as PlanReport }) }}
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
                        }}
                    >
                        {enabled ?  t('暂停') : t('启用')}
                    </Button>
                    <Popconfirm 
                        title={t('删除方案')} 
                        description={t('确认删除此巡检方案吗？')} 
                        onConfirm={async () => {
                            await inspection.delete_plans([record.id])
                            model.message.success(t('删除成功'))
                            mutate_plans()
                        }} >
                        <Button type='text' danger >{t('删除')}</Button>
                    </Popconfirm> 
                </>
        },
    ], [ ])
    
    return <Table
                title={() => 
                    <div className='plan-table-header'>
                        <h2>{enabled ? t('进行中的巡检队列') : t('未进行的巡检队列')}</h2>
                        <Popconfirm   
                            title={t('批量删除巡检方案')} 
                            description={t('确认删除选种的巡检方案吗？')} 
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
