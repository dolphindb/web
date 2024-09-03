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
import type { Plan } from './type.ts'


export function Inspection () {
    
    const { inited } = inspection.use(['inited'])
    
    const { data: plans, mutate: mutate_plans } = useSWR([inited, 'get_plans'], async () => {
        if (inited) 
            return inspection.get_plans()
         else 
            inspection.init()
    })
    
    return <div>
        <InspectionHeader mutate_plans={mutate_plans}/>
        <InspectionResultTable/>
        <InspectionPlanTable plans={plans} mutate_plans={mutate_plans}/>
    </div>
}

function InspectionHeader ({
    mutate_plans
}: {
    mutate_plans: () => void
}) {
    
    return <div className='inspection-header'>
        <div className='inspection-header-left'>
            <Button>{t('刷新')}</Button>
            <Input.Search placeholder={t('搜索')} className='inspection-search'/>
        </div>
        <Button onClick={async () => NiceModal.show(addInspectionModal, { mutate_plans })}>{t('新增巡检')}</Button>
    </div>
}

function InspectionResultTable  () {
    
    const cols: TableColumnsType = useMemo(() => [ 
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
            render: ( success: boolean ) => success ? <CheckOutlined color='green'/> : <CloseOutlined color='red'/>
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
        },
    ], [ ])
    
    const { data: reports } = useSWR('get_reports', inspection.get_reports)
    
    return <div>
        <h2>{t('巡检结果')}</h2>
        <Table dataSource={reports} columns={cols} />
    </div>
}

function InspectionPlanTable  ({
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
            render: (_, record) => <Popconfirm 
                                        title={t('删除方案')} 
                                        description={t('确认删除此巡检方案吗？')} 
                                        onConfirm={async () => {
                                            await inspection.delete_plans([record.id])
                                            model.message.success(t('删除成功'))
                                            mutate_plans()
                                        }} >
                                        <Button type='text' danger >{t('删除')}</Button>
                                    </Popconfirm> 
        },
    ], [ ])
    
    return <div>
        
        <Table
            title={() => <div className='table-header'>
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
    </div>
}
