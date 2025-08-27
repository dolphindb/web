import { t } from '@i18n'
import { Affix, Button, Collapse, Descriptions, Spin, Table, Typography } from 'antd'
import useSWR from 'swr'

import { useMemo, useRef, useState } from 'react'

import { delay, delta2str } from 'xshell/utils.browser.js'

import { UpOutlined } from '@ant-design/icons'

import NiceModal from '@ebay/nice-modal-react'

import { useParams } from 'react-router'

import { model } from '@model'

import { safe_json_parse } from '@/dashboard/utils.ts'

import type {  PlanReportDetailMetric } from '@/inspection/type.ts'
import { inspection } from '@/inspection/model.ts'
import { MetricGroups, ReportLables } from '@/inspection/constants.ts'
import { LogModal } from '@/inspection/modals/LogModal.tsx'   
import { FailedStatus, SuccessStatus } from '@/inspection/pages/InspectionListPage.tsx'
import { BackButton } from '@/components/BackButton.tsx'

const { Title } = Typography

export function ReportDetailPage () {
    const { reportId } = useParams()
    const [active_key, set_active_key] = useState(null)
    
    const top_ref = useRef<HTMLDivElement>(null)
    
    const { data: report, isLoading: get_report_loading } = useSWR([reportId, 'get_report'], async () => {
        const report = await inspection.get_report(reportId)
        return report
    })
    
    const { data: plan_report_detail, isLoading: get_report_detail_loading } = useSWR([reportId, 'get_report_detail_metrics'],  async () => {
        // 如果只有 id 则执行 get_reports 获取一次 report
        const metrics =  await inspection.get_report_detail_metrics(reportId)
        const nodes = await inspection.get_report_detail_nodes(reportId)
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
            element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
            
        }, 100)
    }
    
    function scroll_to_top () {
        if (top_ref.current) 
            top_ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        
    }
    
    const abnormal_columns = [
        { title: t('指标名'), dataIndex: 'displayName', key: 'displayName' },
        { title: t('指标版本'), dataIndex: 'metricVersion', key: 'metricVersion' },
        { title: t('指标分类'), dataIndex: 'group', key: 'group', render: (group: number) => MetricGroups[group] },
        { title: t('开始时间'), dataIndex: 'startTime', key: 'startTime' },
        { title: t('运行时间'), dataIndex: 'runningTime', key: 'runningTime', render: (runningTime: bigint) => delta2str(Number(runningTime)) },
        {
            title: t('操作'),
            key: 'action',
            render: (_, record) => <a onClick={() => { scroll_to_metric(record.metricName) }}>{t('查看详情')}</a>,
        },
    ]
    
    async function export_report () {
        set_active_key(plan_report_detail.map(d => d.metricName))
        
        // 等待DOM更新
        await delay(500)
        
        try {
             // 保存原始标题
            const old_title = document.title
            
            // 设置新标题（这可能会影响某些浏览器生成的PDF文件名）
            document.title = t('巡检报告_{{id}}', { id: reportId })
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
            document.title = old_title
        } catch (error) {
            model.message.error(t('打印失败'), error)
        } finally {
            // 恢复原来的展开状态
            set_active_key(active_key)
        }
    }
    
    const grouped_report_items = useMemo(() => {
        if (!plan_report_detail)
            return [ ]
        
        let metric_idx = 1
      
        return MetricGroups.map((groupName, index) => {
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
      
    return get_report_loading || get_report_detail_loading 
        ? <div className='spin-container'><Spin size='large' spinning={get_report_loading || get_report_detail_loading}/></div>
        : <div className='report-detail' ref={top_ref}>
            <div className='report-detail-header'>
                <BackButton to='/inspection' />
                <Button type='primary' onClick={export_report}>{t('下载巡检报告')}</Button>
            </div>
        
            <div id='report-detail-content' className='report-content'>
                <h1>{t('{{report_id}} 巡检报告', { report_id: reportId })}</h1>
            
                <Descriptions 
                    column={4} 
                    items={[...Object.entries(ReportLables).map(([key, value]) => 
                    ({  key, 
                        label: value, 
                        children: key === 'runningTime' 
                                        ? delta2str(Number(report[key])) 
                                        : <div style={{ whiteSpace: 'pre-wrap' }}>{report[key]}</div> 
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
            
        
                {grouped_report_items.map(({ groupName, items, abnormalCount, totalCount }) => <div key={groupName}>
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
                        </div>)}
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
                        key: 'metricVersion',
                        label: t('指标版本'),
                        children: metric.metricVersion,
                    },
                    {
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
                            {n.extraDetail && <Detail content={n.extraDetail} extra/>}
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
                            onClick={() => { NiceModal.show(LogModal, { report_id: n.jobId, node: n.node }) }}
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
   extra = false,
}: {
    content: string
    extra?: boolean
}) {
    const ds = safe_json_parse(content)
    
    if (extra && !ds) 
        return null
    return Array.isArray(ds) && ds.length > 0
        ? 
        <Table 
            columns={Object.keys(ds[0]).map(k => ({ 
                title: k, 
                dataIndex: k, 
                key: k, 
                minWidth: 150,
                render: (str: string) => <div style={{ whiteSpace: 'pre-wrap' }}>{str}</div> }
            ))} 
            dataSource={ds}
            pagination={false}
        /> 
    : <div style={{ whiteSpace: 'pre-wrap' }}>{ds ?? t('检查通过')}</div>    
}

