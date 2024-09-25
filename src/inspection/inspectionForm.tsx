import { t } from '@i18n/index.ts'
import { Button, Form, Input, Select, Table, TimePicker, Tooltip } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState, useEffect } from 'react'
import useSWR from 'swr'

import NiceModal from '@ebay/nice-modal-react'

import { isEmpty, isObject } from 'lodash'

import { model } from '@/model.ts'

import { inspection } from './model.tsx'
import { inspectionFrequencyOptions, metricGroups, weekDays } from './constants.ts'
import type { MetricsWithStatus, Plan } from './type.ts'
import { parse_minute } from './utils.ts'
import { EditParamModal } from './editParamModal.tsx'
import { addParamModal } from './addParamModal.tsx'

export function InspectionForm ({ 
    close, 
    refresh, 
    plan = null,
    disabled = false
}: { 
    close: () => void
    refresh: () => void
    plan?: Plan
    disabled?: boolean 
}) {
    
    const { metrics } = inspection.use(['metrics'])
    
    const [view_only, set_view_only] = useState(disabled)
    
    const is_editing = !!plan
    
    const {  mutate: mutate_plan_detail } = useSWR(
        is_editing ? ['get_plan_detail', plan] : null, 
        async () => inspection.get_plan_detail(plan.id),
        {
            onSuccess: plan_detail => {
                let new_checked_metrics = new Map<string, MetricsWithStatus>(metrics_with_nodes) 
                plan_detail.forEach(pd => 
                    (new_checked_metrics.set(pd.metricName, {  ...metrics.get(pd.metricName), checked: true, selected_nodes: pd.nodes.split(','), selected_params: JSON.parse(pd.params) }) ))
                set_metrics_with_nodes(new_checked_metrics)
            },
        }
    )
    // 保存指标是否选中以及每个指标巡检的节点
    const [metrics_with_nodes, set_metrics_with_nodes] = useState<Map<string, MetricsWithStatus>>(new Map(
        Array.from(metrics.values()).map(mc => ([mc.name, { ...mc, checked: false, selected_nodes: [ ], selected_params: { } }]))
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
    
    const [inspection_form] = Form.useForm<Pick<Plan, 'name' | 'desc' | 'frequency' | 'days' | 'scheduleTime'> >()
    
    async function on_save  (run_now: boolean) {
        const values = await inspection_form.validateFields()
        const metrics = Array.from(metrics_with_nodes.values()).filter(({ checked }) => checked)
        
        if (!verify_metrics())
            return
        try {
            const new_plan =  
                {   
                    desc: values.desc,
                    metrics: metrics.map(({ name }) => name),
                    nodes: metrics.map(({ selected_nodes }) => selected_nodes.length ? selected_nodes : ''),
                    params: metrics.map(({ selected_params, params }) => {
                        if (isObject(selected_params) && !isEmpty(selected_params)) {
                            let formatted_params = { }
                            for (const [key, value] of Object.entries(selected_params)) {
                                let param = params.get(key)
                                if (param.type === 'TIMESTAMP')
                                    formatted_params[key] = dayjs(value).format('YYYY.MM.DDTHH:mm:ss.SSS')
                                else
                                    formatted_params[key] = value
                            }
                            return JSON.stringify(formatted_params)
                        } 
                        else
                            return ''
                    }),
                    frequency: values.frequency,
                    days: (values.days as number[]).map(Number),                                
                    scheduleTime: (values.scheduleTime as Dayjs).format('HH:mm') + 'm', 
                    ... is_editing ? { enabled: plan.enabled } : { runNow: run_now }
                }
            if (is_editing)
                await inspection.update_plan({ id: plan.id, ...new_plan  })
            else
                await inspection.create_plan({ name: values.name, ...new_plan,  })
            model.message.success(is_editing ? t('修改成功') : t('创建成功'))
            refresh()
            mutate_plan_detail()
            close()
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    
    
    return <div className='inspection-form'>
        <Form
            disabled={view_only} 
            className='inspection-form-inline' 
            form={inspection_form}
            requiredMark={false}
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
            <Form.Item 
                name='name' 
                layout='vertical'
                label={<h3>{t('巡检名称')}</h3>} 
                rules={[
                    { required: true, message: t('请输入巡检名称') }, 
                    ]}>
                <Input disabled={is_editing}/>
            </Form.Item>
            
            <Form.Item style={{ marginTop: '40px' }} name='desc' layout='vertical' label={<h3>{t('巡检计划描述')}</h3>} rules={[{ required: true, message: t('请输入巡检计划描述') }]}>
                <Input/>
            </Form.Item>
            
            <div className='metric-table'>
                <MetricGroupTable
                    checked_metrics={metrics_with_nodes} 
                    set_checked_metrics={set_metrics_with_nodes}
                />
            </div>
            <h3>{t('巡检周期')}</h3>
            <div className='inspection-form-inline-time'>
                <Form.Item label={t('巡检频率')} name='frequency' required>
                    <Select 
                        options={inspectionFrequencyOptions} 
                        onChange={() => {
                            inspection_form.setFieldsValue({ days: undefined })
                        }}
                    />
                </Form.Item>
                
                <Form.Item 
                    label={t('巡检日期')} 
                    dependencies={['frequency']} 
                    shouldUpdate={(prevValues, curValues) => prevValues.frequency !== curValues.frequency}>
                    {
                        ({ getFieldValue }) => {
                            const frequency = getFieldValue('frequency')
                            return <Form.Item name='days' rules={[{ required: true, message: t('请选择巡检日期') }]}>
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
                
                <Form.Item label={t('巡检时间')} name='scheduleTime' rules={[{ required: true, message: t('请选择巡检时间') }]}>
                    <TimePicker format='HH:mm:ss'/>
                </Form.Item>
            </div>
            
          
        </Form>
        
        <div className='inspection-form-footer'>
            <Button onClick={close}>{t('取消')}</Button>
            {
                is_editing && (view_only ? <Button onClick={() => { set_view_only(false) }}>{t('编辑计划')}</Button> : <Button onClick={() => { set_view_only(true) }}>{t('取消编辑')}</Button>)
            }
            <Tooltip title={t('保存当前方案并立即执行一次巡检')}>
                <Button type='primary'  onClick={async () => on_save(true)}>{t('立即巡检')}</Button>
            </Tooltip>
            <Tooltip title={t('保存当前方案')}>
                <Button type='primary' onClick={async () => on_save(false)}>{t('保存')}</Button>
            </Tooltip>
        </div>
        
    </div>
}


export function MetricGroupTable ({ 
    checked_metrics,
    set_checked_metrics,
    editing = false,
    close = () => { }
}: 
{ 
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void
    editing?: boolean
    close?: () => void
}) {    

    // 根据 group 对指标进行分组，同时用来管理选中状态
    const [grouped_metrics, set_grouped_metrics] = useState(update_checked_metrics())
    
    function update_checked_metrics () {
        const groups = new Map<number, MetricsWithStatus[]>()
        checked_metrics.forEach(metric => {
            // 非 editing 模式下只展示 cheked 的指标
            if (editing ||  metric.checked) {
                const group = metric.group // 假设每个指标都有 group 属性
                if (!groups.has(group)) 
                    groups.set(group, [ ])
                    groups.get(group)?.push(metric)
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
                title={() => editing ? null :  <div className='metric-table-title'>
                                <h3>{t('指标列表')}</h3>
                                <div className='metric-table-title-action'>
                                    <Button onClick={async () => NiceModal.show(addParamModal, { checked_metrics, set_checked_metrics })}>{t('添加指标')}</Button>
                                    <Button danger>{t('批量删除')}</Button>
                                </div>
                            
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
                            pagination={{ pageSize: 5, size: 'small' }}
                            rowSelection={ editing && { 
                                selectedRowKeys: grouped_metrics.get(record.group)?.filter(metric => metric.checked).map(metric => metric.name) || [ ],
                                onChange: keys => {
                                    let metrics = grouped_metrics.get(record.group)
                                    metrics = metrics.map(mc => ({ ...mc, checked: keys.includes(mc.name) }))
                                    set_grouped_metrics(new Map(grouped_metrics.set(record.group, metrics)))
                                }
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
                    render: (group: number) => metricGroups[group]
                }]}
                pagination={false}
        />
        {editing && <Button type='primary' onClick={() => {
            let new_checked_metrics = new Map(checked_metrics)
            // 更新checked
            Array.from(grouped_metrics.values()).flat(1).forEach(metric => {
                new_checked_metrics.set(metric.name, metric)
            })
            set_checked_metrics(new_checked_metrics)
            close()
        }}>{t('保存')}</Button>}
        </div>
}
