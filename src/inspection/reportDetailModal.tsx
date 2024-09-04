import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Descriptions, Modal, Table, type TableColumnsType } from 'antd'
import useSWR from 'swr'

import { useMemo } from 'react'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import type { PlanReport, PlanReportDetail } from './type.ts'
import { inspection } from './model.tsx'
import { reportLables } from './constants.ts'

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
        title={t('{{report_id}} 巡检报告', { report_id: report.id })}
    >
        <Descriptions column={4} items={Object.entries(reportLables).map(([key, value]) => ({ key, label: value, children: report[key] }))} />
        {plan_report_detail && plan_report_detail.some(({ success }) => !success) && <ReportDetailTable title={t('异常指标列表')} plan_report_detail={plan_report_detail.filter(({ success }) => !success)}/>}
        {plan_report_detail && plan_report_detail.some(({ success }) => success) && <ReportDetailTable title={t('正常指标列表')} plan_report_detail={plan_report_detail.filter(({ success }) => success)}/>}
    </Modal>
})


function ReportDetailTable  (
    {
        title,
        plan_report_detail
    }: {
        title: string
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
    
    
    return <Table 
                title={() => <h3>{title}</h3>}
                dataSource={plan_report_detail} 
                columns={cols} 
                pagination={false}
                />
}
