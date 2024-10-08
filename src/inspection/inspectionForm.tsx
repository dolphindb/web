import { t } from '@i18n/index.ts'
import { Button, Form, Input, Select, Space, Switch, Table, TimePicker, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useState, useEffect } from 'react'
import useSWR from 'swr'

import NiceModal from '@ebay/nice-modal-react'

import { isEmpty, isObject } from 'lodash'

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

import { model } from '@/model.ts'

import { inspection } from './model.tsx'
import { inspectionFrequencyOptions, metricGroups, weekDays } from './constants.ts'
import type { MetricsWithStatus, Plan } from './type.ts'
import { EditParamModal } from './editParamModal.tsx'
import { addParamModal } from './addParamModal.tsx'

export function InspectionForm ({ 
    refresh, 
    plan = null,
    disabled = false,
}: { 
    refresh: () => void
    plan?: Plan
    disabled?: boolean 
}) {
    
    
    const { metrics } = inspection.use(['metrics'])
    
    const is_editing = !!plan.id
    
    const [view_only, set_view_only] = useState(is_editing ? disabled : false)
    
    const [enabled, set_enabled] = useState(plan.enabled)
    
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
                    name: values.name,
                    desc: values.desc ?? '',
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
                    scheduleTime: values.scheduleTime.map(time => dayjs(time).format('HH:mm') + 'm'), 
                    enabled: is_editing ? plan.enabled : false,
                    runNow: run_now
                }
            if (is_editing)
                await inspection.update_plan({ id: plan.id, ...new_plan  })
            else
                await inspection.create_plan(new_plan)
            model.message.success(is_editing ? t('修改成功') : t('创建成功'))
            refresh()
            inspection.set({ current_plan: null })
            mutate_plan_detail()
        } catch (error) {
            model.show_error({ error })
        }
    }
    
    
    return <div className='inspection-form'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', columnGap: '20px' }}>
                <Button onClick={() => { inspection.set({ current_plan: null }) }}>{t('返回')}</Button>
                <h3>{is_editing ? (view_only ? t('查看巡检计划') : t('修改巡检计划')) : t('新增巡检计划')}</h3>
            </div>
            <div className='inspection-form-action'>
                {
                    is_editing && <div>
                        <span>{t('启用：')}</span>
                        <Switch value={enabled} onChange={async checked => {
                            try {
                                if (checked) {
                                    await inspection.enable_plan(plan.id)
                                    model.message.success(t('启用成功'))
                                } else {
                                    await inspection.disable_plan(plan.id)
                                    model.message.success(t('禁用成功'))
                                }
                                set_enabled(checked)
                            } catch (error) {
                                model.message.error(error)
                            }
                           
                        }}/></div>
                }
                {
                    is_editing && <div>
                        <span>{t('编辑模式：')}</span>
                        <Switch value={!view_only} onChange={checked => { set_view_only(!checked) }}/></div>
                }
                <Tooltip title={view_only ? t('立即执行一次巡检') : t('保存当前方案并立即执行一次巡检')}>
                    <Button type='primary'  onClick={async () => {
                        view_only ? inspection.run_plan(plan.id) : on_save(true)
                        inspection.set({ current_plan: null })
                    }}>{t('立即巡检')}</Button>
                </Tooltip>
                <Tooltip title={t('保存当前方案')}>
                    <Button type='primary' disabled={view_only} onClick={async () => on_save(false)}>{t('保存')}</Button>
                </Tooltip>
            </div>
        </div>
        <Form
            disabled={view_only} 
            className='inspection-form-inline' 
            form={inspection_form}
            requiredMark={false}
            layout='vertical'
            initialValues={plan ? 
                { 
                    ...plan,
                    scheduleTime: [ ],
                    days: (plan.days as string).split(',').map(Number), 
                } : 
                {   
                    scheduleTime: dayjs(), 
                    frequency: 'W', 
                    days: [1], 
                }}>
            <Form.Item 
                name='name' 
                layout='vertical'
                label={<h3>{t('巡检名称')}</h3>} 
                rules={[
                    { required: true, message: t('请输入巡检名称') }, 
                    ]}>
                <Input/>
            </Form.Item>
            
            <Form.Item name='desc' layout='vertical' label={<h3>{t('巡检计划描述')}</h3>} >
                <Input placeholder={t('巡检计划描述(非必填)')}/>
            </Form.Item>
            
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
                
                <Form.Item label={t('巡检时间')} >
                    <Form.List name='scheduleTime' >
                        {(fields, { add, remove }) =>
                            <Space>
                            {
                                fields.map(field => <Space>
                                <Form.Item {...field} required>
                                    <TimePicker format='HH:mm:ss'/>
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => { remove(field.name) }} />
                                </Space>)
                                
                            }
                            <Form.Item>
                                <Button type='dashed' onClick={() => { add() }} block icon={<PlusOutlined />}>
                                {t('添加')}
                                </Button>
                            </Form.Item>
                            </Space>
                        }
                    </Form.List>
                </Form.Item>
                {/*                 
                <Form.Item label={t('巡检时间')} name='scheduleTime' rules={[{ required: true, message: t('请选择巡检时间') }]}>
                    <TimePicker format='HH:mm:ss'/>
                </Form.Item> */}
            </div>
            
            <div className='metric-table'>
                <MetricGroupTable
                    checked_metrics={metrics_with_nodes} 
                    set_checked_metrics={set_metrics_with_nodes}
                />
            </div>
           
        </Form>
        
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
                                <Button type='primary' onClick={async () => NiceModal.show(addParamModal, { checked_metrics, set_checked_metrics })}>{t('管理指标')}</Button>
                            
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
        {editing &&  <div className='modal-footer'>
                        <Button htmlType='button' onClick={close}>
                            {t('取消')}
                        </Button>
                        <Button type='primary' onClick={() => {
                            let new_checked_metrics = new Map(checked_metrics)
                            // 更新checked
                            Array.from(grouped_metrics.values()).flat().forEach(metric => {
                                new_checked_metrics.set(metric.name, metric)
                            })
                            set_checked_metrics(new_checked_metrics)
                            close()
                        }}>{t('保存')}</Button>
                </div>}
        </div>
}
