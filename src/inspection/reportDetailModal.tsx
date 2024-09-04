import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal, Table, type TableColumnsType } from 'antd'
import useSWR from 'swr'

import { useMemo } from 'react'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import type { PlanReport, PlanReportDetail } from './type.ts'
import { inspection } from './model.tsx'

export const reportDetailModal = NiceModal.create((
{ 
    report, 
}: 
{ 
    report: PlanReport 
}) => {
        
    const { data: plan_report_detail } = useSWR([report, 'get_report_detail'],  async () =>  inspection.get_report_detail(report.id))
    const modal = useModal()   
    return <Modal
        className='report-detail-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('巡检报告')}
    >
        <ReportDetailTable plan_report_detail={plan_report_detail}/>
    </Modal>
})


function ReportDetailTable  (
    {
        plan_report_detail
    }: {
        plan_report_detail: PlanReportDetail[]
    }
) {
    
    const cols: TableColumnsType<PlanReportDetail> = useMemo(() => [ 
        {
            title: '指标名',
            dataIndex: 'metricName',
            key: 'metricName',
        },
        {
            title: '指标版本',
            dataIndex: 'metricVersion',
            key: 'metricVersion',
        },
        {
            title: '节点',
            dataIndex: 'node',
            key: 'node',
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
            title: '详细结果',
            dataIndex: 'detail',
            key: 'detail',
        },
        {
            title: '建议',
            dataIndex: 'suggestion',
            key: 'suggestion',
        },
       
    ], [ ])
    
    
    return <Table dataSource={plan_report_detail} columns={cols} />
}
