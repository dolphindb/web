import { t } from '@i18n'
import { Button, Table, Tooltip } from 'antd'

import { useState, useEffect } from 'react'


import NiceModal from '@ebay/nice-modal-react'

import { noop } from 'xshell/prototype.browser.js'


import { cloneDeep } from 'lodash'

import { MetricGroups } from '@/inspection/constants.ts'
import type { MetricsWithStatus } from '@/inspection/type.ts'
import { EditParamModal } from '@/inspection/modals/EditParamModal.tsx'
import { AddParamsModal } from '@/inspection/modals/AddParamsModal.tsx'
import { DDBTable } from '@components/DDBTable/index.tsx'


interface MetricTableProps {
    checked_metrics: MetricsWithStatus[]
    set_checked_metrics: (metrics: MetricsWithStatus[]) => void
    editing?: boolean
    close?: () => void
    setFooter?: (footer: React.ReactNode) => void
}

export function MetricTable ({ 
    checked_metrics,
    set_checked_metrics,
    editing = false,
    close = noop,
    setFooter: renderFooter
}: MetricTableProps) {    
   
    const [grouped_metrics, set_grouped_metrics] = useState(update_checked_metrics())
    
    function update_checked_metrics () {
        const groups = new Map<number, MetricsWithStatus[]>()
        // 优先排 checked 放上面
        const metrics_to_process: MetricsWithStatus[] = [...checked_metrics]
        metrics_to_process.sort((a, b) => (a.checked ? -1 : 1))
        metrics_to_process.forEach(metric => {
            if (editing || metric.checked) {
                const group = metric.group 
                if (!groups.has(group))
                    groups.set(group, [ ])
                const group_metrics = groups.get(group)
                if (!group_metrics.find(m => m.name === metric.name))
                    group_metrics.push(metric)
            }
        })
        return groups
    }
    
    useEffect(() => {
        if (editing && renderFooter)
            renderFooter(
                <div className='modal-footer'>
                    <Button htmlType='button' onClick={close}>
                        {t('取消')}
                    </Button>
                    <Button type='primary' onClick={() => {
                        let new_checked_metrics = cloneDeep(checked_metrics)
                        Array.from(grouped_metrics.values()).flat().forEach(metric => {
                            if (metric.checked) {
                                if (!new_checked_metrics.find(m => m.name === metric.name && m.checked))
                                    new_checked_metrics.find(m => m.name === metric.name).checked = true
                            }
                            else
                                new_checked_metrics.forEach(m => {
                                    if (m.name === metric.name)
                                        m.checked = false
                                })
                        })
                        set_checked_metrics(new_checked_metrics)
                        close()
                        }}>{t('保存')}</Button>
                </div>  
            )
    }, [editing, grouped_metrics])
    
    useEffect(() => {
        set_grouped_metrics(update_checked_metrics())
    }, [checked_metrics])
    
    return <div className='metric-table'>
            <DDBTable 
                rowKey='group'
                {
                    ...editing ? { } : {
                        buttons: <Button type='primary' onClick={async () => NiceModal.show(AddParamsModal, { checked_metrics, set_checked_metrics })}>{t('管理指标')}</Button>,
                        title: t('指标列表')
                    }
                }
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
                                ...!editing ? [{
                                    title: t('版本'),
                                    dataIndex: 'version',
                                    key: 'version',
                                    render: (version: number) => version === null ? t('最新') : version
                                }] : [ ],
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
                                                    let new_checked_metrics = cloneDeep(checked_metrics)
                                                    new_checked_metrics.forEach(m => {
                                                        if (m.name === record.name)
                                                            m.checked = false
                                                    })
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
        </div>
}
