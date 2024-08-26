import NiceModal from '@ebay/nice-modal-react'
import './index.sass'

import { t } from '@i18n/index.ts'
import { Button, Input, Table } from 'antd'
import { useMemo } from 'react'

import { addInspectionModal } from './addInspectionModal.tsx'


export function Inspection () {
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
    
    const cols = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'key',
            key: 'key',
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: '提交人',
            dataIndex: 'subbmiter',
            key: 'subbmiter',
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
            dataIndex: 'result',
            key: 'result',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
        },
    ], [ ])
    
    return <div>
        <h2>巡检结果</h2>
        <Table dataSource={[ ]} columns={cols} />
    </div>
}

function InspectionPlanTable  ()  {
    
    const cols = useMemo(() => [ 
        {
            title: 'ID',
            dataIndex: 'key',
            key: 'key',
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: '提交人',
            dataIndex: 'subbmiter',
            key: 'subbmiter',
        },
        {
            title: '执行频率',
            dataIndex: 'frequency',
            key: 'frequency',
        },
        {
            title: '执行时间',
            dataIndex: 'executeTime',
            key: 'executeTime',
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
        },
    ], [ ])
    
    return <div>
        <h2>巡检方案</h2>
        <Table dataSource={[ ]} columns={cols} />
    </div>
}
