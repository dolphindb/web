import { useEffect, useState, type ReactNode } from 'react'

import { Card, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { access } from '@/access/model.ts'

import { chat_model } from '@/agent/model.ts'


export function show_error (error: unknown, fallback: string) {
    message.error(error instanceof Error ? error.message : fallback)
}


export function Section ({ title, children }: { title: string, children: ReactNode }) {
    return <Card size='small' title={title} style={{ marginBottom: 12 }}>
        {children}
    </Card>
}


export function format_browser_time (value?: string) {
    if (!value)
        return '-'
    const normalized = (value.includes('T') ? value : value.replace(' ', 'T'))
        .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
    const time = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`)
    if (!Number.isFinite(time))
        return value
    const date = new Date(time)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}


export function use_agent_options () {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    
    useEffect(() => {
        if (agents.length === 0)
            chat_model.load_agents().catch(error => { show_error(error, t('加载 Agent 失败')) })
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
