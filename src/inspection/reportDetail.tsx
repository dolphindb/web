import { t } from '@i18n/index.ts'
import { Button, Descriptions, Table, Typography } from 'antd'
import useSWR from 'swr'

import html2canvas from 'html2canvas'

import jsPDF from 'jspdf'

import { model } from '@/model.ts'

import type {  PlanReportDetailMetric } from './type.ts'
import { inspection } from './model.tsx'
import { reportLables } from './constants.ts'
import { FailedStatus, SuccessStatus } from './index.tsx'

const { Title } = Typography

export function ReportDetailPage () {

    const { current_report } = inspection.use(['current_report'])
    
    const { data: plan_report_detail } = useSWR([current_report, 'get_report_detail_metrics'],  async () => {
        const metrics =  await inspection.get_report_detail_metrics(current_report.id)
        const nodes = await inspection.get_report_detail_nodes(current_report.id)
        let metrics_map = new Map<string, PlanReportDetailMetric>()
        metrics.forEach(m => metrics_map.set(m.metricName, { ...m, detail_nodes: [ ] }))
        nodes.forEach(node => {
            let { metricName } = node
            const current_metric = metrics_map.get(metricName)
            metrics_map.set(metricName, {
                ...current_metric,
                detail_nodes: [...current_metric.detail_nodes, node]
            })
        })
        const failures = Array.from(metrics_map.values()).filter(m => !m.success)
        const successes = Array.from(metrics_map.values()).filter(m => m.success)
        return { successes, failures }
    })
   
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
            
            {   Boolean(plan_report_detail?.failures?.length) &&
                <>
                    <h2 className='red'>{t('异常指标列表')}</h2>
                    {
                        plan_report_detail.failures.
                        map(metric => <DetailDescription key={metric.metricName} metric={metric}/>)
                    }
                </>
                    
            }
           
            {  Boolean(plan_report_detail?.successes?.length) &&
                <>
                    <h2 className='green'>{t('正常指标列表')}</h2>
                    {
                        plan_report_detail.successes.
                        map(metric => <DetailDescription key={metric.metricName} metric={metric}/>)
                    }
                </>
                   
            }
        </div>
    </div>
}

function DetailDescription ({
    metric,
}: {
    metric: PlanReportDetailMetric
}) {
    return <Typography key={metric.metricName}>
    <Title level={4}>{metric.desc}</Title>
        {
            metric.detail_nodes.map(n => <div
                key={n.node}
            >
                <Title level={5}>{n.node}</Title>
                <Descriptions
                    bordered     
                    column={3}
                    items={[ {
                        key: 'startTime',
                        label:  t('开始时间'),
                        children: n.startTime,
                    },
                    {
                        key: 'endTime',
                        label: t('结束时间'),
                        children: n.endTime,
                    },
                    {
                        key: 'success',
                        label: t('是否正常'),
                        children: n.success ? SuccessStatus : FailedStatus,
                    },
                    {
                        key: 'detail',
                        label: t('详情'),
                        children: <DetailTable content={n.detail}/>,
                        span: 3,
                    },
                    {
                        key: 'suggestion',
                        label: t('建议'),
                        children: n.suggestion,
                        span: 3,
                    }]}
                />
            </div>)
        }
    </Typography>
}

function DetailTable ({
   content 
}: {
    content: string
}) {
    const ds = JSON.parse(content)
    return Array.isArray(ds) 
        ? 
        <Table 
            columns={Object.keys(ds[0]).map(k => ({ title: k, dataIndex: k, key: k }))} 
            dataSource={ds}
            pagination={false}
        /> 
    : ds    
}

