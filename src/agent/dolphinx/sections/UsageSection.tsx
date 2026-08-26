import { useEffect, useRef, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Space, Table, Tag, Tooltip, message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmBudgetStatus, ILlmModelUsage } from '@/agent/model/types.ts'
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
    statusName?: string
    status?: ILlmBudgetStatus
    modelUsage?: ILlmModelUsage
    children?: UsageRow[]
}

type UsageTotalKey = 'requestCount' | 'totalPromptTokens' | 'totalCompletionTokens' | 'totalTokens'
type ModelUsageKey = 'requestCount' | 'promptTokens' | 'completionTokens' | 'totalTokens'


function get_model_rows (parent_key: string, status?: ILlmBudgetStatus) {
    const models = get_model_usage(status?.usage)
    return models.length ? models.map((modelUsage, index) => ({
        key: `${parent_key}-${modelUsage.model}-${index}`,
        status,
        modelUsage,
    })) : undefined
}


function get_usage_value (row: UsageRow, total_key: UsageTotalKey, model_key: ModelUsageKey) {
    if (row.modelUsage)
        return row.modelUsage[model_key] ?? (model_key === 'totalTokens' ? 0 : '-')
    if (row.statusName && row.statusName !== 'ACTIVE')
        return '-'
    return row.status?.usage[total_key] ?? 0
}


function get_remaining_tokens (row: UsageRow) {
    if (row.modelUsage)
        return row.status?.remainingTokensByModel?.[row.modelUsage.model]
    if (row.statusName && row.statusName !== 'ACTIVE')
        return undefined
    return row.status?.remainingTokens
}


async function load_usage_status (params: { agentId: string, targetUserId?: string }): Promise<ILlmBudgetStatus> {
    // 预算接口失败时仍保留原有用量功能，便于 Web 兼容尚未提供预算接口的 Server。
    const [usage, budget_status] = await Promise.all([
        chat_model.llm.load_llm_usage(params),
        chat_model.llm.load_llm_budget(params).catch(() => undefined),
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
    const [loading_usage, set_loading_usage] = useState(false)
    const personal_usage_request_seq = useRef(0)
    const budget_modal = use_modal()
    const agent_ids_key = options.map(agent => agent.value).join('\n')
    const user_ids_key = usage_user_options.map(user => user.value).join('\n')
    const selected_agent_name = options.find(option => option.value === selected_agent_id)?.label || selected_agent_id || '-'
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id, agent_id)
    
    useEffect(() => {
        if (admin)
            load_admin_usage()
    }, [selected_agent_id, admin, user_ids_key])
    
    useEffect(() => {
        if (!admin)
            load_usage()
        return () => { personal_usage_request_seq.current++ }
    }, [admin, agent_ids_key])
    
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
                    entries.push([agent.value, await load_usage_status({ agentId: agent.value })])
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
            const entries = await Promise.all(usage_user_options.map(async user => [
                user.value,
                await load_usage_status({
                    agentId: selected_agent_id,
                    targetUserId: user.value,
                }),
            ] as const))
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
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
                                statusName: agent.statusName,
                                status,
                                children: agent.statusName === 'ACTIVE' ? get_model_rows(agent.value, status) : undefined,
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
                            render: (_: unknown, row) => row.modelUsage?.model || '-',
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
                    status,
                    children: get_model_rows(user.value, status),
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
                    render: (_: unknown, row) => row.modelUsage?.model || '-',
                    ellipsis: true,
                },
                {
                    title: t('请求次数'),
                    render: (_: unknown, row) => get_usage_value(row, 'requestCount', 'requestCount'),
                    sorter: (a, b) => (a.status?.usage.requestCount ?? 0) - (b.status?.usage.requestCount ?? 0),
                },
                {
                    title: t('输入 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalPromptTokens', 'promptTokens'),
                    sorter: (a, b) => (a.status?.usage.totalPromptTokens ?? 0) - (b.status?.usage.totalPromptTokens ?? 0),
                },
                {
                    title: t('输出 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalCompletionTokens', 'completionTokens'),
                    sorter: (a, b) => (a.status?.usage.totalCompletionTokens ?? 0) - (b.status?.usage.totalCompletionTokens ?? 0),
                },
                {
                    title: t('总 Token'),
                    render: (_: unknown, row) => get_usage_value(row, 'totalTokens', 'totalTokens'),
                    sorter: (a, b) => (a.status?.usage.totalTokens ?? 0) - (b.status?.usage.totalTokens ?? 0),
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
