import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Table, type TableColumnsType } from 'antd'
import { useEffect, useMemo } from 'react'

import useSWR from 'swr'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import { addInspectionModal } from './addInspectionModal.tsx'
import { inspection } from './model.tsx'


export function Inspection () {
     
    useEffect(() => {
        if (!inspection.inited) 
            inspection.init()
        
    }, [ ])
    
    return <div>
        <InspectionHeader/>
        <InspectionResultTable/>
        <InspectionPlanTable/>
    </div>
}

function InspectionHeader () {
   
    return <div className='inspection-header'>
        <div className='inspection-header-left'>
            <Button>{t('刷新')}</Button>
            <Input.Search placeholder={t('搜索')} className='inspection-search'/>
        </div>
        <Button onClick={async () => NiceModal.show(addInspectionModal)}>{t('新增巡检')}</Button>
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

function InspectionPlanTable  ()  {
    
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
        },
    ], [ ])
    
    const { data: plans } = useSWR('get_plans', inspection.get_plans)
    
    return <div>
        <h2>{t('巡检方案')}</h2>
        <Table dataSource={plans} columns={cols} />
    </div>
}
