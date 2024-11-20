import { t } from '@i18n/index.ts'
import { Button, Table, Tooltip } from 'antd'

import { useState, useEffect } from 'react'


import NiceModal from '@ebay/nice-modal-react'


import { MetricGroups } from '@/inspection/constants.ts'
import type { MetricsWithStatus } from '@/inspection/type.ts'
import { EditParamModal } from '@/inspection/modals/editParamModal.tsx'
import { AddParamsModal } from '@/inspection/modals/addParamsModal.tsx'

interface MetricGroupTableProps {
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void
    editing?: boolean
    close?: () => void
    renderFooter?: (footer: React.ReactNode) => React.ReactNode
}

export function MetricGroupTable ({ 
    checked_metrics,
    set_checked_metrics,
    editing = false,
    close = () => { },
    renderFooter
}: MetricGroupTableProps) {    
    const footer = editing ? (
        <div className='modal-footer'>
            <Button htmlType='button' onClick={close}>
                {t('取消')}
            </Button>
            <Button type='primary' onClick={() => {
                let new_checked_metrics = new Map(checked_metrics)
                Array.from(grouped_metrics.values()).flat().forEach(metric => {
                    new_checked_metrics.set(metric.name, metric)
                })
                set_checked_metrics(new_checked_metrics)
                close()
            }}>{t('保存')}</Button>
        </div>
    ) : null
    
    // 根据 group 对指标进行分组，同时用来管理选中状态
    const [grouped_metrics, set_grouped_metrics] = useState(update_checked_metrics())
    
    function update_checked_metrics () {
        const groups = new Map<number, MetricsWithStatus[]>()
        checked_metrics.forEach(metric => {
            // 非 editing 模式下只展示 cheked 的指标
            if (editing || metric.checked) {
                const group = metric.group // 假设每个指标都有 group 属性
                if (!groups.has(group))
                    groups.set(group, [ ])
                groups.get(group).push(metric)
            }
        })
        return groups
    }
    
    useEffect(() => {
        set_grouped_metrics(update_checked_metrics())
    }, [checked_metrics])
    
    return <div className='metric-table'>
            <Table 
                rowKey='group'
                title={() => editing ? null : <div className='metric-table-title'>
                                <h3 className='required'>{t('指标列表')}</h3>
                                <Button type='primary' onClick={async () => NiceModal.show(AddParamsModal, { checked_metrics, set_checked_metrics })}>{t('管理指标')}</Button>
                            
                    </div>}
                dataSource={Array.from(grouped_metrics.keys()).map(group => ({
                    group,
                    metrics: grouped_metrics.get(group) || [ ]
                }))}
                expandable={{
                    defaultExpandAllRows: true,
                    expandedRowRender: record => <div className='expanded-table'><Table
                            rowKey='name'
                            className='themed'
                            dataSource={record.metrics}
                            pagination={false}
                            rowSelection={editing && { 
                                selectedRowKeys: grouped_metrics.get(record.group)?.filter(metric => metric.checked).map(metric => metric.name) || [ ],
                                onChange: keys => {
                                    let metrics = grouped_metrics.get(record.group)
                                    metrics = metrics.map(mc => ({ ...mc, checked: keys.includes(mc.name) }))
                                    set_grouped_metrics(new Map(grouped_metrics.set(record.group, metrics)))
                                },
                                
                            }}
                            columns={[
                                {
                                    title: t('名称'),
                                    dataIndex: 'displayName',
                                    key: 'displayName',
                                },
                                {
                                    title: t('描述'),
                                    dataIndex: 'desc',
                                    key: 'desc',
                                    render: (desc: string) => <div style={{ whiteSpace: 'pre-wrap' }}>{desc}</div>
                                },
                                ...editing ? [ ] : [{
                                    title: t('操作'),
                                    dataIndex: 'action',
                                    key: 'action',
                                    render: (_, record) => <>
                                            <Tooltip title={t('编辑指标')}>
                                                <Button 
                                                    type='link' 
                                                    onClick={async () => 
                                                        NiceModal.show(EditParamModal, { metric: record, checked_metrics, set_checked_metrics })}>
                                                            {t('编辑')}
                                                </Button>
                                            </Tooltip>
                                            <Button 
                                                type='link'
                                                danger
                                                onClick={() => {
                                                    let new_checked_metrics = new Map(checked_metrics)
                                                    new_checked_metrics.set(record.name, { ...record, checked: false })
                                                    set_checked_metrics(new_checked_metrics)
                                                }}
                                                >
                                                {t('删除')}
                                            </Button>
                                        </>
                                }],
                                
                            ]}
                        /></div>,
                    rowExpandable: record => record.metrics.length > 0,
                }}
                columns={[{
                    title: t('分组'),
                    dataIndex: 'group',
                    key: 'group',
                    render: (group: number) => MetricGroups[group]
                }]}
                pagination={false}
        />
        {editing && renderFooter ? renderFooter(footer) : footer}
        </div>
}
