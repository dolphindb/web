import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Popconfirm, Table, type TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'

import useSWR from 'swr'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import { model } from '@/model.ts'

import { addInspectionModal } from './addInspectionModal.tsx'
import { inspection } from './model.tsx'
import type { Plan, PlanReport } from './type.ts'
import { editInspectionModal } from './editInspectionModal.tsx'
import { reportDetailModal } from './reportDetailModal.tsx'


export function Inspection () {
    
    const { inited } = inspection.use(['inited'])
    
    const [seatch_key, set_search_key ] = useState('')
    
    const { data: plans, mutate: mutate_plans } = useSWR([inited, 'get_plans'], async () => {
        if (inited) 
            return inspection.get_plans()
         else 
            inspection.init()
    })
    
    const { data: reports, mutate: mutate_reports } = useSWR('get_reports', async () =>  inspection.get_reports())
    
    function refresh () {
        mutate_plans()
        mutate_reports()
    }
    
    
    return <div>
        <InspectionHeader refresh={refresh} set_search_key={set_search_key}/>
        <ReportListTable reports={reports?.filter(report => report.id.includes(seatch_key))}/>
        <PlanListTable plans={plans?.filter(plan => plan.id.includes(seatch_key))} mutate_plans={mutate_plans}/>
    </div>
}

function InspectionHeader ({
    refresh,
    set_search_key
}: {
    refresh: () => void
    set_search_key: (str: string) => void
}) {
    
    return <div className='inspection-header'>
        <div className='inspection-header-left'>
            <Button onClick={() => {
                refresh()
                model.message.success(t('刷新成功'))
            }}>{t('刷新')}</Button>
            <Input.Search placeholder={t('搜索')} onSearch={set_search_key} className='inspection-search'/>
        </div>
        <Button onClick={async () => NiceModal.show(addInspectionModal, { refresh })}>{t('新增巡检')}</Button>
    </div>
}

function ReportListTable  ({
    reports,
}: {
    reports: PlanReport[]
}) {
    
    const cols: TableColumnsType<PlanReport> = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
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
            render: ( success: boolean ) => success ? <CheckOutlined className='green'/> : <CloseOutlined className='red'/>
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => <Button 
                        type='link'
                        onClick={async () => NiceModal.show(reportDetailModal, { report: record })}
                    >
                        {t('查看详细报告')}
                    </Button>
               
                
        },
    ], [ ])
    
    return <div>
        <Table title={() => <h2>{t('巡检结果')}</h2>} dataSource={reports} columns={cols} />
    </div>
}

function PlanListTable  ({
    plans,
    mutate_plans
}: {
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
            title: '执行频率',
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
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            render: (_, record) => 
                <>
                    <Button 
                        type='link'
                        onClick={async () => NiceModal.show(editInspectionModal, { plan: record, mutate_plans })}
                    >
                        {t('修改')}
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
                <div className='table-header'>
                    <h2>{t('巡检方案')}</h2>
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
