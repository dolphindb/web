import { t } from '@i18n/index.ts'
import { Button, Form, Input, Popover, Select, Table, TimePicker, Tooltip, type TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState, useEffect } from 'react'
import useSWR from 'swr'

import { genid } from 'xshell/utils.browser'

import { model } from '@/model.ts'

import { inspection } from './model.tsx'
import { inspectionFrequencyOptions, metricGroups, weekDays } from './constants.ts'
import type { Metric, MetricsWithNodes, Plan } from './type.ts'
import { parse_minute } from './utils.ts'

export function InspectionForm ({ 
    close, 
    mutate_plans, 
    plan = null
}: { 
    close: () => void
    mutate_plans: () => void
    plan?: Plan 
}) {
    
    const { metrics } = inspection.use(['metrics'])
    
    const is_editing = !!plan
    
    const {  mutate: mutate_plan_detail } = useSWR(
        is_editing ? ['get_plan_detail', plan] : null, 
        async () => inspection.get_plan_detail(plan.id),
        {
            onSuccess: plan_detail => {
                let new_checked_metrics = new Map(metrics_with_nodes) 
                plan_detail.forEach(pd => 
                    (new_checked_metrics.set(pd.metricName, { name: pd.metricName, checked: true, nodes: pd.nodes ? pd.nodes.split(',') : [ ] }) ))
                set_metrics_with_nodes(new_checked_metrics)
            },
        }
    )
    // 保存指标是否选中以及每个指标巡检的节点
    const [metrics_with_nodes, set_metrics_with_nodes] = useState<Map<string, MetricsWithNodes>>(new Map(
        Array.from(metrics.values()).map(mc => ([mc.name, { name: mc.name, checked: false, nodes: [ ] }]))
    ))
    
    useEffect(() => {
        // 编辑模式下，获取巡检详情
        if (is_editing)
            mutate_plan_detail()
    }, [ is_editing, plan ])
    
    function verify_metrics () {
        let selected_metrics = Array.from(metrics_with_nodes.values()).filter(({ checked }) => checked)
        if (selected_metrics.length === 0) {
            model.message.error(t('请至少选中一个指标'))
            return false
        }
         
        // 找出需要选择节点但没有选择的指标
        if (selected_metrics.some(({ name, nodes }) => metrics.get(name).nodes !== '' && nodes.length === 0)) {
            model.message.error(t('请至少选中一个巡检节点'))
            return false
        }
        return true
    }
    
    const [inspection_form] = Form.useForm<Pick<Plan, 'desc' | 'frequency' | 'days' | 'scheduleTime'> >()
    
    return <div className='inspection-form'>
        <h3>{t('指标列表')}</h3>
        <MetricTable
            checked_metrics={metrics_with_nodes} 
            set_checked_metrics={set_metrics_with_nodes}
        />
        
        <h3>{t('巡检周期')}</h3>
        <Form 
            className='inspection-form-inline' 
            form={inspection_form} 
            initialValues={plan ? 
                { 
                    ...plan,
                    scheduleTime: parse_minute(plan.scheduleTime as string),
                    days: (plan.days as string).split(',').map(Number), 
                } : 
                {   
                    scheduleTime: dayjs(), 
                    frequency: 'W', 
                    days: [1], 
                    desc: t('巡检描述') 
                }}>
            <div className='inspection-form-inline-time'>
                <Form.Item label={t('巡检频率')} name='frequency'>
                    <Select 
                        options={inspectionFrequencyOptions} 
                    />
                </Form.Item>
                
                <Form.Item 
                    label={t('巡检日期')} 
                    dependencies={['frequency']} 
                    shouldUpdate={(prevValues, curValues) => prevValues.frequency !== curValues.frequency}>
                    {
                        ({ getFieldValue }) => {
                            const frequency = getFieldValue('frequency')
                            return <Form.Item name='days'>
                                    <Select
                                        mode='multiple'
                                        className='date-select'
                                        options={Array.from({ length: frequency === 'M' ? 31 : frequency === 'W' ? 7 : 1 }, (_, i) => i).
                                                map(idx => ({
                                                    label:  frequency === 'W' ? weekDays[idx] : t('第 {{day}} 天', { day: idx + 1 }),
                                                    value:  frequency === 'W' ? idx : idx + 1
                                                }))} 
                                        /> 
                            </Form.Item>
                        }
                    }
                </Form.Item>
                
                <Form.Item label={t('巡检时间')} name='scheduleTime'>
                    <TimePicker format='HH:mm:ss'/>
                </Form.Item>
            </div>
        
            <Form.Item name='desc' layout='vertical' label={<h3>{t('巡检计划描述')}</h3>} style={{ display: 'block' }}>
                <Input/>
            </Form.Item>
            
          
        </Form>
        
        <div className='inspection-form-footer'>
            <Button onClick={close}>{t('取消')}</Button>
            <Tooltip title={t('保存当前方案并立即执行一次巡检')}>
                <Button type='primary'>{t('立即巡检')}</Button>
            </Tooltip>
            <Tooltip title={t('保存当前方案')}>
                <Button type='primary' onClick={async () => {
                    const values = await inspection_form.validateFields()
                    const metrics = Array.from(metrics_with_nodes.values()).filter(({ checked }) => checked)
                    if (!verify_metrics())
                        return
                    try {
                        const new_plan =  
                            {   
                                id: is_editing ? plan.id : String(genid()),
                                desc: values.desc,
                                metrics: metrics.map(({ name }) => name),
                                nodes: metrics.map(({ nodes }) => nodes.length ? nodes : null),
                                params: new Array(metrics.length).fill('1'),
                                frequency: values.frequency,
                                days: (values.days as number[]).map(Number),                                
                                scheduleTime: (values.scheduleTime as Dayjs).format('HH:mm') + 'm', 
                                ... is_editing ? {  } : { runNow: false }
                            }
                        if (is_editing)
                            await inspection.update_plan(new_plan)
                        else
                            await inspection.create_plan(new_plan)
                        model.message.success(is_editing ? t('修改成功') : t('创建成功'))
                        mutate_plans()
                        mutate_plan_detail()
                        close()
                    } catch (error) {
                        model.show_error({ error })
                    }
                   
                }}>{t('保存')}</Button>
            </Tooltip>
        </div>
        
    </div>
}


function MetricTable ({ 
    checked_metrics,
    set_checked_metrics,
}: 
{ 
    checked_metrics: Map<string, MetricsWithNodes>
    set_checked_metrics: (metrics: Map<string, MetricsWithNodes>) => void
}) {
    console.log('🚀 ~ checked_metrics:', checked_metrics.values())
    
    const { metrics } = inspection.use(['metrics'])
    
    const cols: TableColumnsType = useMemo(() => [ 
        {
            title: t('名称'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('分类'),
            dataIndex: 'group',
            key: 'group',
            render: (group: number) => metricGroups[group]
        },
        {
            title: t('描述'),
            dataIndex: 'desc',
            key: 'desc',
            width: 100,
            render: (desc: string) => <Tooltip title={desc}><p className='ellipsis'>{desc}</p></Tooltip>
        },
        {
            title: t('版本'),
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: t('创建时间'),
            dataIndex: 'createTime',
            key: 'createTime',
        },
        {
            title: t('更新时间'),
            dataIndex: 'updateTime',
            key: 'updateTime',
        },
        {
            title: t('巡检节点'),
            dataIndex: 'nodes',
            key: 'nodes',
            render: (nodesstr: string, record: Metric) => nodesstr && checked_metrics.size ? 
                    <Select 
                        
                        mode='multiple' 
                        className='nodes-select'
                        value={checked_metrics.get(record.name).nodes}
                        onChange={nodes => {
                            let new_checked_metrics = new Map(checked_metrics)
                            new_checked_metrics.set(record.name, { ...new_checked_metrics.get(record.name), nodes })
                            set_checked_metrics(new_checked_metrics)
                        }}
                        placeholder={t('请选择需要巡检的节点')} 
                        options={nodesstr.split(',').map(node => ({
                            label: node,
                            value: node
                    }))}/> : <p>{t('所有节点')}</p>
            
        },
        {
            title: t('脚本内容'),
            dataIndex: 'script',
            key: 'script',
            render: (script: string) => <>
                <Popover content={<pre className='script-popover'>{script}</pre>} title={t('指标脚本')}>
                    <Button type='link'>{t('查看')}</Button>
                </Popover>
                <Button 
                    type='link' 
                    onClick={async () => {
                        await navigator.clipboard.writeText(script)
                        model.message.success(t('复制成功'))
                    }}>
                    {t('复制')}
                </Button>
            </>
        },
    ], [ checked_metrics, set_checked_metrics ])
    
    return <Table 
        rowSelection={ checked_metrics.size && { 
            selectedRowKeys: Array.from(checked_metrics.values()).filter(({ checked }) => checked).map(({ name }) => name),
            onChange: names => {
                // 1.保留每个指标选中的节点
                let newCheckedMetrics = new Map(Array.from(metrics.values()).reduce((map, metric) => {
                    map.set(metric.name, { ...metric, checked: false, nodes: checked_metrics.get(metric.name).nodes })
                    return map
                }, new Map<string, MetricsWithNodes>()))
                // 2.将选中的指标的 checked 更新为 true
                names.forEach((name: string) => {
                    const metric = newCheckedMetrics.get(name)
                    metric.checked = true
                    newCheckedMetrics.set(name, metric)
                })
                set_checked_metrics(newCheckedMetrics)
            }
        }}
        rowKey='name'
        dataSource={Array.from(metrics.values())} 
        columns={cols} 
    />
}
