import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Popconfirm, Table, DatePicker, type TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'

import useSWR from 'swr'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import dayjs, { type  Dayjs } from 'dayjs'

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
    
    const { data: plans, mutate: mutate_plans } = useSWR([inited, 'get_plans'], async () => {
        if (inited) 
            return inspection.get_plans()
         else 
            inspection.init()
    })
    
    const [dates, set_dates] = useState<[Dayjs | null, Dayjs | null] | null>([ null, null ])
    
    const { data: reports, mutate: mutate_reports } = useSWR([inited, 'get_reports', dates], async () =>  {
        if (inited) 
            return inspection.get_reports(dates.map(d => d && d.format('YYYY.MM.DD HH:mm:ss')))
        else 
            inspection.init()
    })
    
    function refresh () {
        mutate_plans()
        mutate_reports()
    }
    
    const [enabled_plans, disabled_palns] = useMemo(() => {
        let enabled_plans = [ ]
        let disabled_palns = [ ]
        plans?.filter(plan => plan.id.includes(search_key)).forEach(plan => {
            plan.enabled ? enabled_plans.push(plan) : disabled_palns.push(plan)
            
        })
        return [enabled_plans, disabled_palns]
    }, [ plans, search_key ])
    
    return current_report ? <ReportDetailPage/> : current_plan ? <EditInspectionModal plan={current_plan} mutate_plans={refresh} disabled/> : <div>
        <div className='inspection-header'>
            <div className='inspection-header-left'>
                <Button onClick={() => {
                    refresh()
                    model.message.success(t('刷新成功'))
                }}>{t('刷新')}</Button>
                <Input.Search placeholder={t('搜索')} onSearch={set_search_key} className='inspection-search'/>
            </div>
            
            
            <div className='inspection-header-right'>
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
        <ReportListTable reports={reports?.filter(report => report.id.includes(search_key))} dates={dates} set_dates={set_dates}/>
        <PlanListTable type='enabled' plans={enabled_plans?.filter(({ enabled }) => enabled)} mutate_plans={refresh}/>
        <PlanListTable type='disabled' plans={disabled_palns?.filter(({ enabled }) => !enabled)} mutate_plans={refresh}/>
    </div>
}

function ReportListTable  ({
    reports,
    dates,
    set_dates
}: {
    reports: PlanReport[]
    dates: [Dayjs | null, Dayjs | null]
    set_dates: (dates: [Dayjs | null, Dayjs | null]) => void
}) {
    
    const cols: TableColumnsType<PlanReport> = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'planId',
            key: 'planId',
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
            render: (_, record) => <Button
                        type='link'
                        onClick={() => { inspection.set({ current_report: record }) }}
                    >
                        {t('查看详细报告')}
                    </Button>
               
                
        },
    ], [ ])
    
    return <Table 
            title={() => <div className='report-table-header'>
                <h2>{t('巡检结果')}</h2>
                <DatePicker.RangePicker value={dates} onChange={set_dates} showTime placeholder={[t('开始时间'), t('结束时间')]}/>
            </div>} 
            dataSource={reports} 
            columns={cols} 
        />
}

function PlanListTable  ({
    type,
    plans,
    mutate_plans
}: {
    type: 'enabled' | 'disabled'
    plans: Plan[]
    mutate_plans: () => void
})  {
    
    const [ids, set_ids] = useState([ ])
    
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
                            mutate_plans()
                        }}
                    >
                        {t('立即巡检')}
                    </Button>
                    {/* <Button 
                        type='link'
                        onClick={async () => NiceModal.show(editInspectionModal, { plan: record, mutate_plans })}
                    >
                        {t('修改')}
                    </Button> */}
                    <Button 
                        type='link'
                        onClick={() => { inspection.set({ current_plan: record }) }}
                    >
                        {t('查看详情')}
                    </Button>
                    <Button 
                        type='link'
                        onClick={async () => {
                            if (type === 'enabled') 
                                await inspection.disable_plan(record.id) 
                            else
                                await inspection.enable_plan(record.id)
                            model.message.success(t('执行成功'))
                            mutate_plans()
                        }}
                    >
                        {type === 'enabled' ?  t('暂停') : t('启用')}
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
                        <h2>{type === 'enabled' ? t('进行中的巡检队列') : t('未进行的巡检队列')}</h2>
                        <Popconfirm   
                            title={t('批量删除巡检方案')} 
                            description={t('确认删除选种的巡检方案吗？')} 
                            onConfirm={async () => {
                                await inspection.delete_plans(ids)
                                model.message.success(t('批量删除成功'))
                                mutate_plans()
                            }} >
                                <Button danger disabled={ids.length === 0}>{t('批量删除')}</Button>
                        </Popconfirm>
                    </div>}
                rowSelection={{ type: 'checkbox', selectedRowKeys: ids, onChange: set_ids }}
                rowKey='id' 
                dataSource={plans} 
                columns={cols} />        
}

export const SuccessStatus = <CheckOutlined className='green'/>
export const FailedStatus = <CloseOutlined className='red'/>
