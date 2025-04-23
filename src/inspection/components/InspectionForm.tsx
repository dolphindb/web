import { t } from '@i18n'
import dayjs from 'dayjs'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Button, Form,  Switch, Tooltip } from 'antd'
import { isEmpty, isObject } from 'lodash'

import { DdbType } from 'dolphindb/browser'

import { model, NodeType } from '@model'

import { DDB_TYPE_MAP } from '@utils'

import { inspection } from '@/inspection/model.ts'

import type { MetricsWithStatus, Plan } from '@/inspection/type.ts'

import { InspectionFormContent } from '@/inspection/components/InspectionFormContent.tsx'

import { BackButton } from '@/components/BackButton.tsx'



interface InspectionFormProps {
    plan?: Plan
    disabled?: boolean
}

export function InspectionForm ({ 
    plan = null,
    disabled = false,
}: InspectionFormProps) {
    const { nodes } = model.use(['nodes'])
    
    const { metrics } = inspection.use(['metrics'])
    
    const is_editing = !!plan
    
    const [view_only, set_view_only] = useState(disabled)
    
    useSWR(
        is_editing ? ['get_plan_detail', plan.id] : null, 
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
    
    const [enabled, set_enabled] = useState(plan?.enabled)
    
    // 保存指标是否选中以及每个指标巡检的节点
    const [metrics_with_nodes, set_metrics_with_nodes] = useState<Map<string, MetricsWithStatus>>(new Map(
        Array.from(metrics.values()).map(mc => ([mc.name, { ...mc, checked: false, selected_nodes: [ ], selected_params: { } }]))
    ))
    
    const execute_node_names = useMemo(
        () => nodes.filter(({ mode }) => 
                                mode === NodeType.data || 
                                mode === NodeType.computing || 
                                mode === NodeType.single)
                    .map(({ name }) => name), [ nodes ])
    
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
    
    const [inspection_form] = Form.useForm<Pick<Plan, 'name' | 'desc' | 'frequency' | 'days' | 'enabledNode' | 'scheduleTime' | 'alertEnabled' | 'alertRecipient'> >()
    
    async function on_save  (run_now?: boolean) {
        try {
            const values = await inspection_form.validateFields()
            if (!verify_metrics())
                return
            const metrics = Array.from(metrics_with_nodes.values()).filter(({ checked }) => checked)
            const new_plan =  
                {   
                    name: values.name,
                    desc: values.desc ?? '',
                    metrics: metrics.map(({ name }) => name),
                    nodes: metrics.map(({ selected_nodes }) => selected_nodes.length && selected_nodes[0] !== '' ? selected_nodes : ''),
                    params: metrics.map(({ selected_params, params }) => {
                        if (isObject(selected_params) && !isEmpty(selected_params)) {
                            let formatted_params = { }
                            for (const [key, value] of Object.entries(selected_params)) {
                                let param = params.get(key)
                                if (param.type === DDB_TYPE_MAP[DdbType.timestamp])
                                    formatted_params[key] = value ? dayjs(value).format('YYYY.MM.DDTHH:mm:ss.SSS') : null
                                else
                                    formatted_params[key] = value
                            }
                            return JSON.stringify(formatted_params)
                        } 
                        else
                            return ''
                    }),
                    frequency: values.frequency,
                    days: values.days ? (values.days as number[]).map(Number) : [1],                                
                    scheduleTime: values.scheduleTime.filter(time => time).map(time => dayjs(time).format('HH:mm') + 'm'), 
                    enabled,
                    enabledNode: values.enabledNode,
                    alertEnabled: values.alertEnabled,
                    alertRecipient: values.alertRecipient,
                    runNow: run_now
                }
            if (is_editing)
                await inspection.update_plan({ id: plan.id, ...new_plan  })
            else
                await inspection.create_plan(new_plan)
            model.message.success(is_editing ? t('修改成功') : t('创建成功'))
            model.goto('/inspection')
        } catch (error) {
            if (error instanceof Error)
                model.show_error({ error })
        }
    }
    
    async function on_run () {
        try {
            await inspection.run_plan(plan.id)
            model.message.success( t('执行成功'))
            model.goto('/inspection')
        } catch (error) {
            if (error instanceof Error)
                model.show_error({ error })
        }
    }
    
    
    return <div className='inspection-form'>
        <div className='inspection-form-header'>
            <div className='inspection-form-header-left'>
                <BackButton to='/inspection' />
                <h3>{is_editing ? (view_only ? t('查看巡检计划') : t('修改巡检计划')) : t('新增巡检计划')}</h3>
            </div>
            <div className='inspection-form-header-right'>
                <div>
                    <span>{t('启用：')}</span>
                    <Switch value={enabled} onChange={set_enabled} />
                </div>
                {
                    is_editing && <div>
                        <span>{t('编辑模式：')}</span>
                        <Switch value={!view_only} onChange={checked => { set_view_only(!checked) }}/></div>
                }
                <Tooltip title={view_only ? t('立即执行一次巡检') : t('保存当前方案并立即执行一次巡检')}>
                    <Button type='primary'  onClick={async () => {
                        if (view_only) 
                            await on_run()
                         else 
                            on_save(true)
                        
                    }}>{t('立即巡检')}</Button>
                </Tooltip>
                <Tooltip title={t('保存当前方案')}>
                    <Button type='primary' disabled={view_only} onClick={async () => on_save(false)}>{t('保存')}</Button>
                </Tooltip>
            </div>
        </div>
        <InspectionFormContent
            plan={plan}
            view_only={view_only}
            metrics_with_nodes={metrics_with_nodes}
            set_checked_metrics={set_metrics_with_nodes}
            execute_node_names={execute_node_names}
            inspection_form={inspection_form}
        />
    </div>
}



