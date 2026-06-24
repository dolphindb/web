import { useEffect, useState, type ReactNode } from 'react'

import { Card, Empty, Pagination } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { access } from '@/access/model.ts'

import { chat_model } from '@/agent/model.ts'


export function show_error (error: unknown, fallback: string) {
    model.message.error(error instanceof Error ? error.message : fallback)
}


export function Section ({ title, children }: { title: string, children: ReactNode }) {
    return <Card size='small' title={title} style={{ marginBottom: 12 }}>
        {children}
    </Card>
}


export function AgentListLayout ({
    options,
    selected_agent_id,
    set_selected_agent_id,
    actions,
    children,
    height = '100%',
}: {
    options: { value: string, label: string }[]
    selected_agent_id: string
    set_selected_agent_id: (agent_id: string) => void
    actions?: ReactNode
    children: ReactNode
    height?: number | string
}) {
    const [agent_page, set_agent_page] = useState(1)
    const agent_page_size = 10
    const paged_agent_options = options.slice((agent_page - 1) * agent_page_size, agent_page * agent_page_size)
    
    useEffect(() => {
        const max_page = Math.max(1, Math.ceil(options.length / agent_page_size))
        if (agent_page > max_page)
            set_agent_page(max_page)
    }, [options.length, agent_page])
    
    return <div style={{ display: 'flex', gap: 12, height, minHeight: 0 }}>
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', paddingRight: 12, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{t('Agent')}</div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {options.length === 0
                    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无 Agent')} />
                    : paged_agent_options.map(agent =>
                        <div
                            key={agent.value}
                            onClick={() => { set_selected_agent_id(agent.value) }}
                            title={agent.label}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                marginBottom: 4,
                                background: selected_agent_id === agent.value ? '#e6f4ff' : undefined,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {agent.label}
                        </div>
                    )}
            </div>
            {options.length > agent_page_size && <Pagination
                size='small'
                simple
                current={agent_page}
                pageSize={agent_page_size}
                total={options.length}
                onChange={set_agent_page}
                style={{ marginTop: 8 }}
            />}
        </div>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
            {actions && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{actions}</div>}
            {selected_agent_id ? children : <Empty description={t('请选择 Agent')} />}
        </div>
    </div>
}


export function format_browser_time (value?: string) {
    if (!value)
        return '-'
    return value
}


export function use_agent_options () {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    
    useEffect(() => {
        if (agents.length === 0)
            chat_model.agent.load_agents().catch(error => { show_error(error, t('加载 Agent 失败')) })
    }, [ ])
    
    return {
        agent_id,
        options: agents
            .filter(agent => agent.statusName !== 'DELETED')
            .map(agent => ({ value: agent.agentId, label: agent.agentName || agent.agentId })),
    }
}


export function use_user_options () {
    const [users, set_users] = useState<string[]>([ ])
    
    useEffect(() => {
        if (!model.admin)
            return
        access.get_user_list()
            .then(set_users)
            .catch(error => { console.warn('load users failed', error) })
    }, [ ])
    
    return users.map(user => ({ value: user, label: user }))
}
