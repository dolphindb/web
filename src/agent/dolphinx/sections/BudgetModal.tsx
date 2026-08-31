import { useEffect, useState } from 'react'

import { Alert, Button, DatePicker, Form, InputNumber, Modal, Select, Switch, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmBudgetConfig } from '@/agent/model/types.ts'
import { show_error } from '@/agent/dolphinx/common.tsx'


interface ModelBudgetRow {
    model: string
    max_tokens: number
}


function get_max_tokens (value: number | { maxTokens?: number }) {
    return typeof value === 'number' ? value : value.maxTokens ?? 0
}


function parse_time (value?: string | number) {
    if (value === undefined)
        return null
    // DolphinDB timestamp 字符串使用点分隔日期，先转换为 dayjs 可稳定解析的格式。
    const time = dayjs(typeof value === 'string' ? value.replace(/^(\d{4})\.(\d{2})\.(\d{2})T/, '$1-$2-$3T') : value)
    return time.isValid() ? time : null
}


export function BudgetModal ({
    agent_id,
    visible,
    on_close,
    on_saved,
}: {
    agent_id: string
    visible: boolean
    on_close: () => void
    on_saved?: () => Promise<void> | void
}) {
    const [enabled, set_enabled] = useState(false)
    const [max_tokens, set_max_tokens] = useState(0)
    const [start_time, set_start_time] = useState<Dayjs | null>(null)
    const [end_time, set_end_time] = useState<Dayjs | null>(null)
    const [model_budgets, set_model_budgets] = useState<ModelBudgetRow[]>([ ])
    const [model_options, set_model_options] = useState<string[]>([ ])
    const [loading, set_loading] = useState(false)
    
    useEffect(() => {
        if (!visible || !agent_id)
            return
        let disposed = false
        set_loading(true)
        Promise.all([
            chat_model.llm.load_llm_budget({ agentId: agent_id }),
            chat_model.llm.load_agent_llm_bindings(agent_id),
        ]).then(([result, bindings]) => {
            if (disposed)
                return
            const budget = result.budget
            const models = budget?.models || { }
            set_enabled(Boolean(budget) && budget?.enabled !== false)
            set_max_tokens(budget?.maxTokens ?? 0)
            set_start_time(parse_time(budget?.startTime))
            set_end_time(parse_time(budget?.endTime))
            set_model_budgets(Object.entries(models).map(([model, value]) => ({ model, max_tokens: get_max_tokens(value) })))
            set_model_options([...new Set([
                ...bindings.map(binding => binding.model).filter(Boolean),
                ...(result.usage.models || [ ]).map(item => item.model).filter(Boolean),
                ...Object.keys(models),
            ])])
        }).catch(error => {
            if (!disposed)
                show_error(error, t('加载预算配置失败'))
        }).finally(() => {
            if (!disposed)
                set_loading(false)
        })
        return () => { disposed = true }
    }, [visible, agent_id])
    
    async function save_budget () {
        if (start_time && end_time && end_time.isBefore(start_time)) {
            message.error(t('用量统计结束时间不能早于开始时间'))
            return
        }
        const models = model_budgets.map(item => item.model.trim())
        if (models.some(model => !model)) {
            message.error(t('请选择模型'))
            return
        }
        if (new Set(models).size !== models.length) {
            message.error(t('不能重复配置同一个模型'))
            return
        }
        const budget: ILlmBudgetConfig = {
            enabled,
            maxTokens: max_tokens,
            ...(start_time ? { startTime: start_time.valueOf() } : { }),
            ...(end_time ? { endTime: end_time.valueOf() } : { }),
            models: Object.fromEntries(model_budgets.map(item => [item.model, { maxTokens: item.max_tokens }])),
        }
        set_loading(true)
        try {
            await chat_model.llm.update_llm_budget(agent_id, budget)
            message.success(t('预算配置已保存'))
            on_close()
            await on_saved?.()
        } catch (error) {
            show_error(error, t('保存预算配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    return <Modal
        title={t('Token 预算配置')}
        open={visible}
        onCancel={on_close}
        onOk={save_budget}
        confirmLoading={loading}
        okText={t('保存')}
        cancelText={t('取消')}
        width={640}
        destroyOnHidden
    >
        <Alert
            className='ai-budget-tip'
            type='info'
            showIcon
            message={t('0 表示不限制；未配置模型预算时，该模型不单独限制。')}
        />
        <Form layout='vertical'>
            <Form.Item label={t('启用预算限制')}>
                <Switch className='ai-settings-switch-medium' checked={enabled} onChange={set_enabled} />
            </Form.Item>
            <Form.Item label={t('Agent 总 Token 上限')}>
                <InputNumber min={0} precision={0} value={max_tokens} onChange={value => { set_max_tokens(value ?? 0) }} />
            </Form.Item>
            <div className='ai-budget-window-grid'>
                <Form.Item label={t('用量统计开始时间')}>
                    <DatePicker showTime value={start_time} onChange={set_start_time} />
                </Form.Item>
                <Form.Item label={t('用量统计结束时间')}>
                    <DatePicker showTime value={end_time} onChange={set_end_time} />
                </Form.Item>
            </div>
            <Form.Item label={t('模型 Token 上限')}>
                <div className='ai-budget-model-list'>
                    {model_budgets.map((item, index) => <div className='ai-budget-model-row' key={`${item.model}-${index}`}>
                        <Select
                            showSearch
                            value={item.model || undefined}
                            placeholder={t('选择模型')}
                            options={model_options.map(model => ({ value: model, label: model }))}
                            onChange={model => {
                                const next = [...model_budgets]
                                next[index] = { ...item, model }
                                set_model_budgets(next)
                            }}
                        />
                        <InputNumber
                            min={0}
                            precision={0}
                            value={item.max_tokens}
                            placeholder={t('0 表示不限制')}
                            onChange={value => {
                                const next = [...model_budgets]
                                next[index] = { ...item, max_tokens: value ?? 0 }
                                set_model_budgets(next)
                            }}
                        />
                        <Button onClick={() => { set_model_budgets(model_budgets.filter((_, i) => i !== index)) }}>{t('删除')}</Button>
                    </div>)}
                    <Button
                        disabled={model_options.length === model_budgets.length}
                        onClick={() => {
                            const used = new Set(model_budgets.map(item => item.model))
                            set_model_budgets([...model_budgets, { model: model_options.find(model => !used.has(model)) || '', max_tokens: 0 }])
                        }}
                    >
                        {t('添加模型预算')}
                    </Button>
                </div>
            </Form.Item>
        </Form>
    </Modal>
}
