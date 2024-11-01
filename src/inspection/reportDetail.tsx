import { t } from '@i18n/index.ts'
import { Affix, Button, Collapse, Descriptions, Spin, Table, Typography } from 'antd'
import useSWR from 'swr'

import { useMemo, useRef, useState } from 'react'

import { delta2str } from 'xshell/utils.browser.js'

import { UpOutlined } from '@ant-design/icons'

import NiceModal from '@ebay/nice-modal-react'

import { model } from '@/model.ts'

import type {  PlanReportDetailMetric } from './type.ts'
import { inspection } from './model.tsx'
import { metricGroups, reportLables } from './constants.ts'
import { FailedStatus, SuccessStatus } from './index.tsx'
import { LogModal } from './logModal.tsx'

const { Title } = Typography

export function ReportDetailPage () {

    const { current_report } = inspection.use(['current_report'])
    const [active_key, set_active_key] = useState(null)
    
    const topRef = useRef<HTMLDivElement>(null)
    
    const { data: plan_report_detail, isLoading } = useSWR([current_report, 'get_report_detail_metrics'],  async () => {
        // 如果只有 id 则执行 get_reports 获取一次 report
        if (current_report.desc === undefined) {
            const report = await inspection.get_reports(null, current_report.id)
            inspection.set({ current_report: report?.records[0] })
        }
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
        { title: t('指标名'), dataIndex: 'displayName', key: 'displayName' },
        { title: t('指标分类'), dataIndex: 'group', key: 'group', render: (group: number) => metricGroups[group] },
        { title: t('开始时间'), dataIndex: 'startTime', key: 'startTime' },
        { title: t('运行时间'), dataIndex: 'runningTime', key: 'runningTime', render: (runningTime: bigint) => delta2str(Number(runningTime)) },
        {
            title: t('操作'),
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
             // 保存原始标题
            const originalTitle = document.title
            
            // 设置新标题（这可能会影响某些浏览器生成的PDF文件名）
            document.title = t('巡检报告_{{id}}', { id: current_report.id })
            // 创建一个新的样式元素
            const style = document.createElement('style')
            style.textContent = `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #report-detail-content, #report-detail-content * {
                        visibility: visible;
                        zoom: 0.95;
                    }
                    #report-detail-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                }
            `
            // 将样式添加到文档头部
            document.head.appendChild(style)
    
            // 调用打印
            window.print()
    
            // 打印完成后移除样式
            document.head.removeChild(style)
            document.title = originalTitle
        } catch (error) {
            model.message.error(t('打印失败'), error)
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
    
    const has_abnoraml_metrics = abnormal_metrics.length > 0
      
    return isLoading ? <div className='spin-container'><Spin size='large' spinning={isLoading}/></div> : <div className='report-detail' ref={topRef}>
        <div className='report-detail-header'>
            <Button onClick={() => { inspection.set({ current_report: null }) }}>{t('返回')}</Button>
            <Button type='primary' onClick={export_report}>{t('下载巡检报告')}</Button>
        </div>
       
        <div id='report-detail-content' className='report-content'>
            <h1>{t('{{report_id}} 巡检报告', { report_id: current_report.planId })}</h1>
           
            <Descriptions 
                column={4} 
                items={[...Object.entries(reportLables).map(([key, value]) => 
                ({  key, 
                    label: value, 
                    children: key === 'runningTime' 
                                    ? delta2str(Number(current_report[key])) 
                                    : <div style={{ whiteSpace: 'pre-wrap' }}>{current_report[key]}</div> 
                }))]} 
            />
            
            <h2>{t('巡检结果总览')}</h2>
            <div className='abnormal-table-header'>
                <p className='report-summary'>
                    {t('检查项共 {{num}} 项', { num: plan_report_detail?.length || 0 })}
                    <span className={abnormal_metrics.length && 'abnormal-count'}>{t(' {{num}} 项异常。', { num: abnormal_metrics.length })}</span>
                    {has_abnoraml_metrics && t('异常列表指标如下:')}
                    
                </p>
                {has_abnoraml_metrics && <span className='abnormal-count'>
                    {t('{{num_abnormal}}/{{num_total}} 项异常', { num_abnormal: abnormal_metrics.length, num_total: plan_report_detail?.length || 0 })}
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
                return <div key={groupName}>
                    <div className='group-header'>
                        <h2>{groupName}</h2>
                        <span className={`abnormal-count ${abnormalCount === 0 ? 'green' : 'red'}`}>
                        {abnormalCount ? t('{{abnormalCount}}/{{totalCount}} 项异常', { abnormalCount, totalCount })  : t('{{totalCount}}/{{totalCount}} 项正常', { totalCount })}
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
    
    const metric_params = useMemo(() => JSON.parse(metric.metricParams), [metric.metricParams])
       
    return <Typography key={metric.metricName}>
         {is_multi_node && <div style={{ whiteSpace: 'pre-wrap' }}>{t('指标说明: {{desc}}', { desc: metric.desc })}</div>}
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
                        children: <div style={{ whiteSpace: 'pre-wrap' }}>{metric.desc}</div>,
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
                    ...metric_params ? [{
                        key: 'metricParams',
                        label: t('指标参数'),
                        span: 4,
                        children: <div>{Object.entries(metric_params).map(([key, value]) => <div key={key}><strong>{key}</strong>: {Array.isArray(value) ? value.join(',') : value as string}</div>)}</div>,
                    }] : [ ],
                    {
                        key: 'detail',
                        label: t('详情'),
                        children: <div className='report-detail-content'>
                            <Detail content={n.detail}/>
                            {n.extraDetail && <Detail content={n.extraDetail}/>}
                        </div>,
                        span: 4,
                    },
                    ...n.suggestion ? [{
                        key: 'suggestion',
                        label: t('建议'),
                        children: <div style={{ whiteSpace: 'pre-wrap' }}>{n.suggestion}</div>,
                        span: 4,
                    }] : [ ], 
                    {
                        key: 'logs',
                        label: t('日志'),
                        children:  <Button
                            type='link'
                            className='report-detail-log-button'
                            onClick={() => { NiceModal.show(LogModal, { reportId: n.jobId, node: n.node }) }}
                        >
                            {t('查看日志')}
                        </Button>,
                        span: 4,
                    },]}
                    
                />
            </div>)
        }
    </Typography>
}

function Detail ({
   content,
}: {
    content: string
}) {
    const ds = JSON.parse(content)
    return Array.isArray(ds) 
        ? 
        <Table 
            columns={Object.keys(ds[0]).map(k => ({ 
                title: k, 
                dataIndex: k, 
                key: k, 
                render: (str: string) => <div style={{ whiteSpace: 'pre-wrap' }}>{str}</div> }
            ))} 
            dataSource={ds}
            pagination={false}
        /> 
    : <div style={{ whiteSpace: 'pre-wrap' }}>{ds ?? t('检查通过')}</div>    
}

