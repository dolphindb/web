import { useEffect, useRef, useState } from 'react'

import { Button, Empty, Table, Tag, message } from 'antd'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmUsageStats } from '@/agent/model.ts'
import {
    AgentListLayout,
    show_error,
    use_agent_options,
    use_user_options,
    use_valid_agent_selection,
} from '@/agent/dolphinx/common.tsx'


export function UsageSection ({ admin = false }: { admin?: boolean }) {
    const { agent_id, options } = use_agent_options({ active_only: admin })
    const user_options = use_user_options(admin)
    const usage_user_options = user_options.some(user => user.value === 'admin')
        ? user_options
        : [{ value: 'admin', label: 'admin' }, ...user_options]
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [usage_by_agent, set_usage_by_agent] = useState<Record<string, ILlmUsageStats>>({ })
    const [usage_by_user, set_usage_by_user] = useState<Record<string, ILlmUsageStats>>({ })
    const [loading_usage, set_loading_usage] = useState(false)
    const personal_usage_request_seq = useRef(0)
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
        const entries: [string, ILlmUsageStats][] = [ ]
        let has_error = false
        try {
            for (const [index, agent] of options.entries()) {
                if (agent.statusName !== 'ACTIVE') {
                    entries.push([agent.value, {
                        agentId: agent.value,
                        requestCount: 0,
                        totalPromptTokens: 0,
                        totalCompletionTokens: 0,
                        totalTokens: 0,
                    }])
                    continue
                }
                // 使用统计接口按 Agent 查询，串行并留出间隔，避免页面打开时瞬间发送大量请求。
                if (index > 0)
                    await new Promise<void>(resolve => { setTimeout(resolve, 100) })
                if (request_seq !== personal_usage_request_seq.current)
                    return
                try {
                    entries.push([agent.value, await chat_model.llm.load_llm_usage({ agentId: agent.value })])
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
                await chat_model.llm.load_llm_usage({
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
                <Table<{ agentId: string, agentName: string, statusName?: string, usage?: ILlmUsageStats }>
                    size='small'
                    rowKey='agentId'
                    loading={loading_usage}
                    dataSource={options.map(agent => ({
                        agentId: agent.value,
                        agentName: agent.label,
                        statusName: agent.statusName,
                        usage: usage_by_agent[agent.value],
                    }))}
                    pagination={false}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用量')} /> }}
                    columns={[
                        {
                            title: t('Agent 名称'),
                            dataIndex: 'agentName',
                            width: 220,
                            render: (_: unknown, row) =>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.agentName}
                                    </span>
                                    {row.statusName !== 'ACTIVE' && <Tag color='default' style={{ fontSize: 11 }}>
                                        {t('未激活')}
                                    </Tag>}
                                </div>,
                        },
                        {
                            title: t('请求次数'),
                            render: (_: unknown, row) => row.statusName !== 'ACTIVE' ? '-' : (row.usage?.requestCount ?? 0),
                        },
                        {
                            title: t('输入 Token'),
                            render: (_: unknown, row) => row.statusName !== 'ACTIVE' ? '-' : (row.usage?.totalPromptTokens ?? 0),
                        },
                        {
                            title: t('输出 Token'),
                            render: (_: unknown, row) => row.statusName !== 'ACTIVE' ? '-' : (row.usage?.totalCompletionTokens ?? 0),
                        },
                        {
                            title: t('总 Token'),
                            render: (_: unknown, row) => row.statusName !== 'ACTIVE' ? '-' : (row.usage?.totalTokens ?? 0),
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
        actions={<Button loading={loading_usage} onClick={load_admin_usage}>{t('刷新')}</Button>}
    >
        <Table<{ value: string, label: string, agentName: string, usage?: ILlmUsageStats }>
            size='small'
            rowKey='value'
            loading={loading_usage}
            dataSource={usage_user_options.map(user => ({ ...user, agentName: selected_agent_name, usage: usage_by_user[user.value] }))}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} /> }}
            columns={[
                {
                    title: t('用户'),
                    dataIndex: 'label',
                    defaultSortOrder: 'ascend',
                    sorter: (a, b) => a.label.localeCompare(b.label),
                },
                {
                    title: t('Agent 名称'),
                    dataIndex: 'agentName',
                    width: 200,
                    ellipsis: true,
                },
                {
                    title: t('请求次数'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.requestCount ?? 0,
                    sorter: (a, b) => (a.usage?.requestCount ?? 0) - (b.usage?.requestCount ?? 0),
                },
                {
                    title: t('输入 Token'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.totalPromptTokens ?? 0,
                    sorter: (a, b) => (a.usage?.totalPromptTokens ?? 0) - (b.usage?.totalPromptTokens ?? 0),
                },
                {
                    title: t('输出 Token'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.totalCompletionTokens ?? 0,
                },
                {
                    title: t('总 Token'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.totalTokens ?? 0,
                },
            ]}
        />
    </AgentListLayout>
}
