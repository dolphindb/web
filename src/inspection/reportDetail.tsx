import { t } from '@i18n/index.ts'
import { Affix, Button, Collapse, Descriptions, Spin, Table, Typography } from 'antd'
import useSWR from 'swr'

import html2canvas from 'html2canvas'

import jsPDF from 'jspdf'

import { useMemo, useRef, useState } from 'react'

import { delta2str } from 'xshell/utils.browser.js'

import { UpOutlined } from '@ant-design/icons'

import { model } from '@/model.ts'

import type {  PlanReportDetailMetric } from './type.ts'
import { inspection } from './model.tsx'
import { metricGroups, reportLables } from './constants.ts'
import { FailedStatus, SuccessStatus } from './index.tsx'

const { Title } = Typography

export function ReportDetailPage () {

    const { current_report } = inspection.use(['current_report'])
    const [active_key, set_active_key] = useState(null)
    
    const topRef = useRef<HTMLDivElement>(null)
    
    const { data: plan_report_detail, isLoading } = useSWR([current_report, 'get_report_detail_metrics'],  async () => {
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
        return Array.from(metrics_map.values())
    })
    
    const abnormal_metrics = plan_report_detail?.filter(detail => !detail.success) || [ ]
   
    function scroll_to_metric (metric_name: string) {
        set_active_key(active_key ? Array.from(new Set([...active_key, metric_name])) : [metric_name])
        // 使用 setTimeout 延迟滚动操作
        setTimeout(() => {
            const element = document.getElementById(`collapse-item-${metric_name}`)
            if (element) 
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            
        }, 100)
    }
    
    function scroll_to_top () {
        if (topRef.current) 
            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        
    }
    
    const abnormal_columns = [
        { title: '指标名', dataIndex: 'displayName', key: 'displayName' },
        { title: '指标分类', dataIndex: 'group', key: 'group', render: (group: number) => metricGroups[group] },
        { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
        { title: '运行时间', dataIndex: 'runningTime', key: 'runningTime', render: (runningTime: bigint) => delta2str(Number(runningTime)) },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => <a onClick={() => { scroll_to_metric(record.metricName) }}>查看详情</a>,
        },
    ]
    
    async function export_report () {
        const current_active_key = active_key
        // 展开所有面板
        set_active_key(plan_report_detail.map(d => d.metricName))
        
        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
            const ele = document.getElementById('report-detail-content')
            const padding = 20
            // 根据dpi放大，防止图片模糊
            const scale = window.devicePixelRatio > 1 ? window.devicePixelRatio : 2
            // 下载尺寸 a4 纸 比例
            let pdf = new jsPDF('p', 'pt', 'a4')
            let width = ele.offsetWidth
            let height = ele.offsetHeight
            console.log('height', height)
            console.log('aa', width, height, scale)
          
            const canvas = document.createElement('canvas')
            canvas.width = width * scale
            canvas.height = height * scale
            var contentWidth = canvas.width
            var contentHeight = canvas.height
          
            console.log('contentWidth', contentWidth, contentHeight)
            // 一页pdf显示html页面生成的canvas高度;
            var pageHeight = contentWidth / 592.28 * 841.89
            // 未生成pdf的html页面高度
            var leftHeight = contentHeight
            console.log('leftHeight', leftHeight)
            // 页面偏移
            var position = 0
            // a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
            var imgWidth = 595.28 - padding * 2
            var imgHeight = 592.28 / contentWidth * contentHeight - padding * 2
            const pdfCanvas = await html2canvas(ele, {
              useCORS: true,
              canvas,
              scale,
              width,
              height,
              x: 0,
              y: 0,
            })
            const imgDataUrl = pdfCanvas.toDataURL()
          
            if (height > 14400) { // 超出jspdf高度限制时
              const ratio = 14400 / height
              // height = 14400;
              width = width * ratio
            }
          
            // 缩放为 a4 大小  pdfpdf.internal.pageSize 获取当前pdf设定的宽高
            height = height * pdf.internal.pageSize.getWidth() / width
            width = pdf.internal.pageSize.getWidth()
            if (leftHeight < pageHeight)
                pdf.addImage(imgDataUrl, 'png', padding, padding, imgWidth, imgHeight)
             else
                while (leftHeight > 0) {
                pdf.addImage(imgDataUrl, 'png', padding, position + padding, imgWidth, imgHeight)
                leftHeight -= pageHeight
                position -= 841.89
                // 避免添加空白页
                if (leftHeight > 0)
                    pdf.addPage()
                
              }
            
            // 导出下载 
            await pdf.save(`巡检报告_${current_report.id}.pdf`)
        } catch (error) {
            model.message.error(t('PDF生成失败'), error)
        } finally {
            // 恢复原来的展开状态
            set_active_key(current_active_key)
        }
     
      }
      
    
    const grouped_report_items = useMemo(() => {
        if (!plan_report_detail)
            return [ ]
        
        let metric_idx = 1
      
        return metricGroups.map((groupName, index) => {
          const group_items = plan_report_detail.filter(detail => Number(detail.group) === index)
          const abnormal_count = group_items.filter(detail => !detail.success).length
          const total_count = group_items.length
      
          return {
            groupName,
            items: group_items.map(detail => ({
              key: detail.metricName,
              label: <span className='report-item-header'>
                {detail.success ? SuccessStatus : FailedStatus}{`${metric_idx++}. ${detail.displayName} `}
              </span>,
              children: <div id={`collapse-item-${detail.metricName}`}>
                <DetailDescription key={detail.metricName} metric={detail}/>
              </div>
            })),
            abnormalCount: abnormal_count,
            totalCount: total_count
          }
        }).filter(group => group.items.length > 0)
      }, [plan_report_detail])
      
    
    return isLoading ? <div className='spin-container'><Spin size='large' spinning={isLoading}/></div> : <div className='report-detail' ref={topRef}>
        <div className='report-detail-header'>
            <Button onClick={() => { inspection.set({ current_report: null }) }}>{t('返回')}</Button>
            <Button type='primary' onClick={export_report}>{t('下载巡检报告')}</Button>
        </div>
       
        <div id='report-detail-content' className='report-content'>
            <h1>{t('{{report_id}} 巡检报告', { report_id: current_report.planId })}</h1>
           
            <Descriptions column={5} items={[...Object.entries(reportLables).map(([key, value]) => ({ key, label: value, children: key === 'runningTime' ? delta2str(Number(current_report[key])) : current_report[key] }))]} />
            
            <h2>{t('巡检结果总览')}</h2>
            <div className='abnormal-table-header'>
                <p className='report-summary'>
                    检查项共 {plan_report_detail?.length || 0} 项，
                    <span className={abnormal_metrics.length && 'abnormal-count'}>{abnormal_metrics.length} 项异常</span>
                    {abnormal_metrics.length ? '，异常列表指标如下:' : '。'}
                    
                </p>
                {!!abnormal_metrics.length && <span className='abnormal-count'>
                    {abnormal_metrics.length}/{plan_report_detail?.length || 0} 项异常
                </span>}
            </div>
            
            {abnormal_metrics.length > 0 && (
                    <Table
                        dataSource={abnormal_metrics}
                        columns={abnormal_columns}
                        rowKey='metricName'
                        pagination={false}
                    />
            )}
           
     
            {grouped_report_items.map(({ groupName, items, abnormalCount, totalCount }) => {
                const statusClass = abnormalCount === 0 ? 'green' : 'red'
                
                return <div key={groupName}>
                    <div className='group-header'>
                        <h2>{groupName}</h2>
                        <span className={`abnormal-count ${statusClass}`}>
                        {abnormalCount ? `${abnormalCount}/${totalCount} 项异常` : `${totalCount}/${totalCount} 项正常`}
                        </span>
                    </div>
                    <Collapse
                        activeKey={active_key}
                        onChange={set_active_key}
                        items={items}
                    />
                    </div>
                })}
        </div>
        
        <Affix style={{ position: 'fixed', bottom: 50, right: 50 }}>
            <Button 
                type='primary' 
                shape='circle' 
                icon={<UpOutlined />} 
                onClick={scroll_to_top}
                size='large'
            />
        </Affix>
    </div>
}

function DetailDescription ({
    metric,
}: {
    metric: PlanReportDetailMetric
}) {
    const is_multi_node = metric.detail_nodes.length > 1
    console.log('metric.metricParams', metric.metricParams)
    return <Typography key={metric.metricName} className='report-description'>
         {is_multi_node && <p>{t('指标说明: {{desc}}', { desc: metric.desc })}</p>}
        {
            metric.detail_nodes.map(n => <div
                key={n.node}
            >
                {is_multi_node && <Title level={5}>{n.node}</Title>}
                <Descriptions
                
                    column={4}
                    items={[ ...is_multi_node ? [ ] : [{
                        key: 'desc',
                        label:  t('指标说明'),
                        children: metric.desc,
                        span: 4,
                    }], {
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
                        key: 'runningTime',
                        label: t('运行时间'),
                        children: delta2str(Number(n.runningTime)),
                    },
                   
                    {
                        key: 'success',
                        label: t('是否正常'),
                        children: n.success ? SuccessStatus : FailedStatus,
                    },
                    ...JSON.parse(metric.metricParams) ? [{
                        key: 'metricParams',
                        label: t('指标参数'),
                        span: 4,
                        children: <div>{Object.entries(JSON.parse(metric.metricParams)).map(([key, value]) => <div key={key}><strong>{key}</strong>: {Array.isArray(value) ? value.join(',') : value as string}</div>)}</div>,
                    }] : [ ],
                    {
                        key: 'detail',
                        label: t('详情'),
                        children: <DetailTable content={n.detail}/>,
                        span: 4,
                    },
                    ...n.suggestion ? [{
                        key: 'suggestion',
                        label: t('建议'),
                        children: n.suggestion,
                        span: 4,
                    }] : [ ]]}
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
    : ds ?? t('检查通过')    
}

