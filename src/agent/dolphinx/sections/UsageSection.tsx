import { useEffect, useRef, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, DatePicker, Empty, Space, Table, Tag, Tooltip, message } from 'antd'
import type { Dayjs } from 'dayjs'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { IAgentLlmBinding, ILlmBudgetStatus, ILlmModelUsage, ILlmProvider } from '@/agent/model/types.ts'
import {
    AgentListLayout,
    show_error,
    use_agent_options,
    use_user_options,
    use_valid_agent_selection,
} from '@/agent/dolphinx/common.tsx'

import { BudgetModal } from './BudgetModal.tsx'
import { format_remaining_tokens, get_model_usage } from './usage.ts'


interface UsageRow {
    key: string
    userName?: string
    agentName?: string
    agentId?: string
    statusName?: string
    status?: ILlmBudgetStatus
    modelUsage?: ILlmModelUsage
    children?: UsageRow[]
}

type UsageTotalKey = 'requestCount' | 'totalPromptTokens' | 'totalCompletionTokens' | 'totalTokens'
type ModelUsageKey = 'requestCount' | 'promptTokens' | 'completionTokens' | 'totalTokens'


function get_model_rows (parent_key: string, status?: ILlmBudgetStatus, agent_id?: string) {
    const models = get_model_usage(status?.usage)
    return models.length ? models.map((modelUsage, index) => ({
        key: `${parent_key}-${modelUsage.model}-${index}`,
        agentId: agent_id || status?.agentId,
        status,
        modelUsage,
    })) : undefined
}


function render_model_cell (row: UsageRow, bindings_map: Record<string, IAgentLlmBinding[]>) {
    if (!row.modelUsage)
        return '-'
    const raw_model = row.modelUsage.model
    const agent_id = row.agentId || row.status?.agentId
    const bindings = (agent_id && bindings_map[agent_id]) || [ ]
    const matched = bindings.filter(b => b.model === raw_model)
    const providers = Array.from(new Set(matched.map(b => b.providerName || b.providerId || b.adapterType).filter(Boolean)))
    const configs = matched.map(b => b.name).filter(Boolean)
    
    if (providers.length === 0)
        return <span>{raw_model}</span>
    
    if (providers.length > 1) {
        // 不同提供商相同模型名称：清晰标出所有提供商，并提供 Tooltip 显示具体渠道
        return <Tooltip title={t('此模型关联不同提供商：{{providers}}（配置：{{configs}}）', {
            providers: providers.join(', '),
            configs: configs.join(', '),
        })}>
            <Space size={4} wrap>
                <span>{raw_model}</span>
                {providers.map(p => <Tag key={p} color='blue' style={{ fontSize: 11, margin: 0 }}>{p}</Tag>)}
            </Space>
        </Tooltip>
    }
    
    return <Space size={4}>
        <span>{raw_model}</span>
        <Tag color='default' style={{ fontSize: 11, margin: 0 }}>{providers[0]}</Tag>
    </Space>
}


function get_usage_value (row: UsageRow, total_key: UsageTotalKey, model_key: ModelUsageKey) {
    if (row.modelUsage)
        return row.modelUsage[model_key] ?? (model_key === 'totalTokens' ? 0 : '-')
    if (row.statusName && row.statusName !== 'ACTIVE')
        return '-'
    return row.status?.usage?.[total_key] ?? 0
}


function get_remaining_tokens (row: UsageRow) {
    if (row.modelUsage)
        return row.status?.remainingTokensByModel?.[row.modelUsage.model]
    if (row.statusName && row.statusName !== 'ACTIVE')
        return undefined
    return row.status?.remainingTokens
}


async function load_usage_status (params: { agentId: string, targetUserId?: string, startTime?: number, endTime?: number }): Promise<ILlmBudgetStatus> {
    // 预算接口失败时仍保留原有用量功能，便于 Web 兼容尚未提供预算接口的 Server。
    const [usage, budget_status] = await Promise.all([
        chat_model.llm.load_llm_usage(params),
        chat_model.llm.load_llm_budget({ agentId: params.agentId, targetUserId: params.targetUserId }).catch(() => undefined),
    ])
    return budget_status ? { ...budget_status, usage } : {
        agentId: params.agentId,
        userId: params.targetUserId,
        usage,
    }
}


export function UsageSection ({ admin = false }: { admin?: boolean }) {
    const { agent_id, options } = use_agent_options({ active_only: admin })
    const user_options = use_user_options(admin)
    const usage_user_options = user_options.some(user => user.value === 'admin')
        ? user_options
        : [{ value: 'admin', label: 'admin' }, ...user_options]
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [usage_by_agent, set_usage_by_agent] = useState<Record<string, ILlmBudgetStatus>>({ })
    const [usage_by_user, set_usage_by_user] = useState<Record<string, ILlmBudgetStatus>>({ })
    const [time_range, set_time_range] = useState<[Dayjs | null, Dayjs | null] | null>(null)
    const [bindings_map, set_bindings_map] = useState<Record<string, IAgentLlmBinding[]>>({ })
    const [loading_usage, set_loading_usage] = useState(false)
    const personal_usage_request_seq = useRef(0)
    const budget_modal = use_modal()
    const agent_ids_key = options.map(agent => agent.value).join('\n')
    const user_ids_key = usage_user_options.map(user => user.value).join('\n')
    const selected_agent_name = options.find(option => option.value === selected_agent_id)?.label || selected_agent_id || '-'
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id, agent_id)
    
    const start_time = time_range?.[0] ? time_range[0].startOf('day').valueOf() : undefined
    const end_time = time_range?.[1] ? time_range[1].endOf('day').valueOf() : undefined
    
    useEffect(() => {
        if (admin)
            load_admin_usage()
    }, [selected_agent_id, admin, user_ids_key, time_range])
    
    useEffect(() => {
        if (!admin)
            load_usage()
        return () => { personal_usage_request_seq.current++ }
    }, [admin, agent_ids_key, time_range])
    
    async function load_usage () {
        const request_seq = ++personal_usage_request_seq.current
        if (options.length === 0) {
            set_usage_by_agent({ })
            set_loading_usage(false)
            return
        }
        set_loading_usage(true)
        const entries: [string, ILlmBudgetStatus][] = [ ]
        let has_error = false
        try {
            const providers: ILlmProvider[] = await chat_model.llm.load_llm_providers().catch(() => [ ])
            const provider_lookup = new Map<string, ILlmProvider>(providers.map(p => [p.providerId, p]))
            
            for (const [index, agent] of options.entries()) {
                if (agent.statusName !== 'ACTIVE') {
                    entries.push([agent.value, {
                        agentId: agent.value,
                        usage: {
                            agentId: agent.value,
                            requestCount: 0,
                            totalPromptTokens: 0,
                            totalCompletionTokens: 0,
                            totalTokens: 0,
                        },
                    }])
                    continue
                }
                // 使用统计接口按 Agent 查询，串行并留出间隔，避免页面打开时瞬间发送大量请求。
                if (index > 0)
                    await new Promise<void>(resolve => { setTimeout(resolve, 100) })
                if (request_seq !== personal_usage_request_seq.current)
                    return
                try {
                    const [status, bindings] = await Promise.all([
                        load_usage_status({
                            agentId: agent.value,
                            startTime: start_time,
                            endTime: end_time,
                        }),
                        bindings_map[agent.value]
                            ? Promise.resolve(bindings_map[agent.value])
                            : chat_model.llm.load_agent_llm_bindings(agent.value, provider_lookup).catch(() => [ ]),
                    ])
                    entries.push([agent.value, status])
                    if (bindings.length && !bindings_map[agent.value])
                        set_bindings_map(prev => ({ ...prev, [agent.value]: bindings }))
                } catch (error) {
                    has_error = true
                    console.warn(`Failed to load usage for Agent ${agent.value}:`, error)
                }
            }
            if (request_seq !== personal_usage_request_seq.current)
                return
            set_usage_by_agent(Object.fromEntries(entries))
            if (has_error)
                message.warning(t('部分 Agent 用量加载失败'))
        } finally {
            if (request_seq === personal_usage_request_seq.current)
                set_loading_usage(false)
        }
    }
    
    async function load_admin_usage () {
        if (!selected_agent_id || usage_user_options.length === 0) {
            set_usage_by_user({ })
            return
        }
        
        set_loading_usage(true)
        try {
            // 加载当前选定 Agent 的模型绑定信息，以便在子行区分不同提供商
            const providers_p: Promise<ILlmProvider[]> = chat_model.llm.load_llm_providers().catch(() => [ ])
            const entries_p = Promise.all(usage_user_options.map(async user => [
                user.value,
                await load_usage_status({
                    agentId: selected_agent_id,
                    targetUserId: user.value,
                    startTime: start_time,
                    endTime: end_time,
                }),
            ] as [string, ILlmBudgetStatus]))
            
            const [providers, entries] = await Promise.all([providers_p, entries_p])
            const provider_lookup = new Map<string, ILlmProvider>(providers.map(p => [p.providerId, p]))
            const bindings = await chat_model.llm.load_agent_llm_bindings(selected_agent_id, provider_lookup).catch(() => [ ])
            set_bindings_map(prev => ({ ...prev, [selected_agent_id]: bindings }))
            set_usage_by_user(Object.fromEntries(entries))
        } catch (error) {
            show_error(error, t('加载用量失败'))
        } finally {
            set_loading_usage(false)
        }
    }
    
    if (!admin)
        return <div className='ai-settings-list-detail' style={{ height: '100%' }}>
            <div className='ai-settings-detail-header'>
                <div className='ai-settings-detail-title'>{t('个人用量')}</div>
            </div>
            <div className='ai-settings-detail-body'>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <DatePicker.RangePicker
                        value={time_range}
                        onChange={(dates: any) => { set_time_range(dates) }}
                        allowClear
                        placeholder={[t('开始时间'), t('结束时间')]}
                    />
                    <Button loading={loading_usage} onClick={load_usage}>{t('刷新')}</Button>
                </div>
                <Table<UsageRow>
                    className='ai-usage-table'
                    size='small'
                    rowKey='key'
                    loading={loading_usage}
                    dataSource={[...options]
                        .sort((a, b) => Number(b.active) - Number(a.active))
                        .map(agent => {
                            const status = usage_by_agent[agent.value]
                            return {
                                key: agent.value,
                                agentName: agent.label,
                                agentId: agent.value,
                                statusName: agent.statusName,
                                status,
                                children: agent.statusName === 'ACTIVE' ? get_model_rows(agent.value, status, agent.value) : undefined,
                            }
                        })}
                    pagination={false}
                    scroll={{ x: 1000 }}
                    tableLayout='fixed'
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用量')} /> }}
                    columns={[
                        {
                            title: t('Agent 名称'),
                            dataIndex: 'agentName',
                            width: 280,
                            render: (_: unknown, row) =>
                                row.modelUsage ? null :
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <span title={row.agentName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.agentName}
                                    </span>
                                    {row.statusName !== 'ACTIVE' && <Tag color='default' style={{ fontSize: 11, flexShrink: 0, margin: 0 }}>
                                        {t('未激活')}
                                    </Tag>}
                                </div>,
                        },
                        {
                            title: t('模型'),
                            render: (_: unknown, row) => render_model_cell(row, bindings_map),
                            ellipsis: true,
                        },
                        {
                            title: t('请求次数'),
                            render: (_: unknown, row) => get_usage_value(row, 'requestCount', 'requestCount'),
                        },
                        {
                            title: t('输入 Token'),
                            render: (_: unknown, row) => get_usage_value(row, 'totalPromptTokens', 'promptTokens'),
                        },
                        {
                            title: t('输出 Token'),
                            render: (_: unknown, row) => get_usage_value(row, 'totalCompletionTokens', 'completionTokens'),
                        },
                        {
                            title: t('总 Token'),
                            render: (_: unknown, row) => get_usage_value(row, 'totalTokens', 'totalTokens'),
                        },
                        {
                            title: t('剩余 Token'),
                            render: (_: unknown, row) => format_remaining_tokens(get_remaining_tokens(row)),
                        },
                    ]}
                />
            </div>
        </div>
    
    return <AgentListLayout
        detail_title={t('用户用量')}
        list_subtitle={t('选择需要查看用量的 Agent')}
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
        actions={<Space>
            <DatePicker.RangePicker
                value={time_range}
                onChange={(dates: any) => { set_time_range(dates) }}
                allowClear
                placeholder={[t('开始时间'), t('结束时间')]}
            />
            <Button disabled={!selected_agent_id} onClick={budget_modal.open}>{t('预算配置')}</Button>
            <Button loading={loading_usage} onClick={load_admin_usage}>{t('刷新')}</Button>
        </Space>}
    >
        <Table<UsageRow>
            className='ai-usage-table'
            size='small'
            rowKey='key'
            loading={loading_usage}
            dataSource={usage_user_options.map(user => {
                const status = usage_by_user[user.value]
                return {
                    key: user.value,
                    userName: user.label,
                    agentName: selected_agent_name,
                    agentId: selected_agent_id,
                    status,
                    children: get_model_rows(user.value, status, selected_agent_id),
                }
            })}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1100 }}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} /> }}
            columns={[
                {
                    title: t('用户'),
                    dataIndex: 'userName',
                    width: 140,
                    ellipsis: { showTitle: false },
                    defaultSortOrder: 'ascend',
                    sorter: (a, b) => (a.userName || '').localeCompare(b.userName || ''),
                    render: user_name => user_name ? <Tooltip title={user_name}>{user_name}</Tooltip> : null,
                },
                {
                    title: t('Agent 名称'),
                    dataIndex: 'agentName',
                    width: 240,
                    ellipsis: true,
                },
                {
                    title: t('模型'),
                    render: (_: unknown, row) => render_model_cell(row, bindings_map),
                    ellipsis: true,
                },
                {
                    title: t('请求次数'),
                    render: (_: unknown, row) => get_usage_value(row, 'requestCount', 'requestCount'),
                    sorter: (a, b) => (a.status?.usage?.requestCount ?? 0) - (b.status?.usage?.requestCount ?? 0),
                },
                {
                    title: t('输入 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalPromptTokens', 'promptTokens'),
                    sorter: (a, b) => (a.status?.usage?.totalPromptTokens ?? 0) - (b.status?.usage?.totalPromptTokens ?? 0),
                },
                {
                    title: t('输出 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalCompletionTokens', 'completionTokens'),
                    sorter: (a, b) => (a.status?.usage?.totalCompletionTokens ?? 0) - (b.status?.usage?.totalCompletionTokens ?? 0),
                },
                {
                    title: t('总 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalTokens', 'totalTokens'),
                    sorter: (a, b) => (a.status?.usage?.totalTokens ?? 0) - (b.status?.usage?.totalTokens ?? 0),
                },
                {
                    title: t('剩余 Token'),
                    render: (_: unknown, row) => format_remaining_tokens(get_remaining_tokens(row)),
                    sorter: (a, b) => (a.status?.remainingTokens ?? -1) - (b.status?.remainingTokens ?? -1),
                },
            ]}
        />
        <BudgetModal
            agent_id={selected_agent_id}
            visible={budget_modal.visible}
            on_close={budget_modal.close}
            on_saved={load_admin_usage}
        />
    </AgentListLayout>
}
