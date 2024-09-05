import { t } from '@i18n/index.ts'
import { Button, Descriptions, Table, type TableColumnsType } from 'antd'
import useSWR from 'swr'

import { useMemo } from 'react'

import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import html2canvas from 'html2canvas'

import jsPDF from 'jspdf'

import { model } from '@/model.ts'

import type {  PlanReportDetail } from './type.ts'
import { inspection } from './model.tsx'
import { reportLables } from './constants.ts'


export function ReportDetailPage () {

    const { current_report } = inspection.use(['current_report'])
    
    const { data: plan_report_detail } = useSWR([current_report, 'get_report_detail'],  async () =>  inspection.get_report_detail(current_report.id))
    
    async function export_report  () {
        const element = document.getElementById('report-detail-content')
        if (!element)
            return
        
        try {
            const padding = 40
            const canvas = await html2canvas(element, {
                logging: true,
                useCORS: true,
                // 增加canvas的尺寸以容纳padding
                width: element.offsetWidth + (padding * 2),
                height: element.offsetHeight + (padding * 2),
                x: -padding,
                y: -padding
            })
            const img = canvas.toDataURL('image/png')
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })
            const img_props = pdf.getImageProperties(img)
            const width = pdf.internal.pageSize.getWidth()
            const height = (img_props.height * width) / img_props.width
            
            pdf.addImage(img, 'PNG', 0, 0, width, height)
            const pdfBlob = pdf.output('blob')
            const url = URL.createObjectURL(pdfBlob)
            const link = document.createElement('a')
            link.href = url
            link.download = `巡检报告_${current_report.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            model.message.success(t('PDF生成成功'))
        } catch (error) {
            model.message.error(t('PDF生成失败'), error)
        }
      
    }
    
    
    return <div
        className='report-detail'       
    >
        <div className='report-detail-header'>
            <Button onClick={() => { inspection.set({ current_report: null }) }}>{t('返回')}</Button>
            <Button type='primary' onClick={export_report}>{t('下载巡检报告')}</Button>
        </div>
       
        <div id='report-detail-content'>
            <h1>{t('{{report_id}} 巡检报告', { report_id: current_report.id })}</h1>
            <Descriptions column={4} items={Object.entries(reportLables).map(([key, value]) => ({ key, label: value, children: current_report[key] }))} />
            {plan_report_detail && plan_report_detail.some(({ success }) => !success) && <ReportDetailTable title={t('异常指标列表')} plan_report_detail={plan_report_detail.filter(({ success }) => !success)}/>}
            {plan_report_detail && plan_report_detail && plan_report_detail.some(({ success }) => success) && <ReportDetailTable title={t('正常指标列表')} plan_report_detail={plan_report_detail.filter(({ success }) => success)}/>}
        </div>
    </div>
}


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
