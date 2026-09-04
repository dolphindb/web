import { useEffect, useState } from 'react'

import { Alert, Button, Form, InputNumber, Modal, Select, Switch, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmBudgetConfig } from '@/agent/model/types.ts'
import { format_model_label } from '@/agent/model/helpers.ts'
import { show_error } from '@/agent/dolphinx/common.tsx'


interface ModelBudgetRow {
    model: string
    max_tokens: number
}


interface ModelOption {
    value: string
    label: string
}


function get_max_tokens (value: number | { maxTokens?: number }) {
    return typeof value === 'number' ? value : value.maxTokens ?? 0
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
    const [model_budgets, set_model_budgets] = useState<ModelBudgetRow[]>([ ])
    const [model_options, set_model_options] = useState<ModelOption[]>([ ])
    const [loading, set_loading] = useState(false)
    
    useEffect(() => {
        if (!visible || !agent_id)
            return
        let disposed = false
        set_loading(true)
        Promise.all([
            chat_model.llm.load_llm_budget({ agentId: agent_id }),
            chat_model.llm.load_llm_usage({ agentId: agent_id }).catch(() => undefined),
            chat_model.llm.load_agent_llm_bindings(agent_id),
        ]).then(([budget_result, usage_result, bindings]) => {
            if (disposed)
                return
            
            const budget = budget_result.budget
            const models = budget?.models || { }
            set_enabled(Boolean(budget) && budget?.enabled !== false)
            set_max_tokens(budget?.maxTokens ?? 0)
            set_model_budgets(Object.entries(models).map(([model, value]) => ({ model, max_tokens: get_max_tokens(value) })))
            
            // 选项按绑定的每个 LLM 配置 (llmConfigId) 独立列出，确保不同提供商（即使底层模型名相同）也能分别设置预算
            const options: ModelOption[] = [ ]
            const seen_keys = new Set<string>()
            for (const binding of bindings) {
                const key = binding.llmConfigId || binding.model
                if (!key)
                    continue
                seen_keys.add(key)
                const label = format_model_label(binding, binding.model) || key
                options.push({ value: key, label })
            }
            
            // 补充已配置预算中存在但不在当前 bindings 中的历史配置
            for (const key of Object.keys(models)) {
                const trimmed = key.trim()
                if (trimmed && !seen_keys.has(trimmed)) {
                    seen_keys.add(trimmed)
                    options.push({ value: trimmed, label: trimmed })
                }
            }
            
            set_model_options(options)
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
            <Form.Item label={t('模型 Token 上限')}>
                <div className='ai-budget-model-list'>
                    {model_budgets.map((item, index) => <div className='ai-budget-model-row' key={`${item.model}-${index}`}>
                        <Select
                            showSearch
                            value={item.model || undefined}
                            placeholder={t('选择模型')}
                            options={model_options}
                            optionFilterProp='label'
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
                        <Button
                            type='text'
                            danger
                            icon={<DeleteOutlined />}
                            aria-label={t('删除')}
                            title={t('删除')}
                            onClick={() => { set_model_budgets(model_budgets.filter((_, i) => i !== index)) }}
                        />
                    </div>)}
                    <Button
                        disabled={model_options.length === 0 || model_budgets.length >= model_options.length}
                        onClick={() => {
                            const used = new Set(model_budgets.map(item => item.model))
                            const available = model_options.find(opt => !used.has(opt.value))
                            if (available)
                                set_model_budgets([...model_budgets, { model: available.value, max_tokens: 0 }])
                        }}
                    >
                        {t('添加模型预算')}
                    </Button>
                </div>
            </Form.Item>
        </Form>
    </Modal>
}
