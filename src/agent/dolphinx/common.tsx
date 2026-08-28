import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

import { Empty, Pagination, Typography } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { access } from '@/access/model.ts'

import { chat_model } from '@/agent/model.ts'


const { Text } = Typography


export function ellipsis_text (value: unknown) {
    const text = String(value ?? '-')
    return <Text title={text} style={{ display: 'block', width: '100%', minWidth: 0 }} ellipsis>{text}</Text>
}


export function tooltip_ellipsis_text (value: unknown) {
    const text = String(value ?? '-')
    return <Text style={{ display: 'block', width: '100%', minWidth: 0 }} ellipsis={{ tooltip: text }}>{text}</Text>
}


export function format_file_size (size?: number) {
    if (size === undefined)
        return '-'
    if (size < 1024)
        return `${size} B`
    const units = ['KB', 'MB', 'GB']
    let value = size / 1024
    for (const unit of units) {
        if (value < 1024)
            return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
        value /= 1024
    }
    return `${value.toFixed(1)} TB`
}


export function optional_nonnegative_number (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? num : undefined
}



export function show_error (error: unknown, fallback: string) {
    model.message.error(error instanceof Error ? error.message : fallback)
}


export function Section ({ title, children }: { title: string, children: ReactNode }) {
    return <section className='ai-settings-section'>
        <div className='ai-settings-section-title'>{title}</div>
        {children}
    </section>
}


export function AgentListLayout ({
    detail_title,
    list_subtitle,
    options,
    selected_agent_id,
    set_selected_agent_id,
    actions,
    children,
    height = '100%',
}: {
    detail_title: string
    list_subtitle: string
    options: { value: string, label: string }[]
    selected_agent_id: string
    set_selected_agent_id: (agent_id: string) => void
    actions?: ReactNode
    children: ReactNode
    height?: number | string
}) {
    return <SettingsListLayout
        title={detail_title}
        list_subtitle={list_subtitle}
        options={options}
        selected_id={selected_agent_id}
        set_selected_id={set_selected_agent_id}
        empty_description={t('暂无 Agent')}
        select_description={t('请选择 Agent')}
        actions={actions}
        height={height}
    >
        {children}
    </SettingsListLayout>
}


export function SettingsListLayout ({
    title,
    list_subtitle,
    options,
    selected_id,
    set_selected_id,
    empty_description,
    select_description,
    actions,
    children,
    height = '100%',
}: {
    title: string
    list_subtitle: string
    options: { value: string, label: string }[]
    selected_id: string
    set_selected_id: (id: string) => void
    empty_description: string
    select_description: string
    actions?: ReactNode
    children: ReactNode
    height?: number | string
}) {
    const [page, set_page] = useState(1)
    const default_page_size = 10
    const [page_size, set_page_size] = useState(default_page_size)
    const paged_options = options.slice((page - 1) * page_size, page * page_size)
    use_valid_agent_selection(options, selected_id, set_selected_id)
    
    useEffect(() => {
        const max_page = Math.max(1, Math.ceil(options.length / page_size))
        if (page > max_page)
            set_page(max_page)
    }, [options.length, page, page_size])
    
    return <div className='ai-settings-list-layout' style={{ height }}>
        <div className='ai-settings-list-sidebar'>
            <div className='ai-settings-list-title'>
                <span className='ai-settings-list-title-text'>{title}</span>
            </div>
            <div className='ai-settings-list-subtitle' title={list_subtitle}>{list_subtitle}</div>
            <div className='ai-settings-list-content'>
                {options.length === 0
                    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty_description} />
                    : paged_options.map(option =>
                        <button
                            type='button'
                            key={option.value}
                            onClick={() => { set_selected_id(option.value) }}
                            title={option.label}
                            className={`ai-settings-list-item${selected_id === option.value ? ' active' : ''}`}
                        >
                            {option.label}
                        </button>
                    )}
            </div>
            {options.length > default_page_size && <Pagination
                size='small'
                simple={{ readOnly: true }}
                current={page}
                pageSize={page_size}
                total={options.length}
                onChange={(page, page_size) => {
                    set_page(page)
                    set_page_size(page_size)
                }}
                className='ai-settings-list-pagination'
            />}
        </div>
        <div className='ai-settings-list-detail'>
            <div className='ai-settings-detail-safe-area' aria-hidden='true' />
            <div className='ai-settings-detail-body'>
                {actions && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>{actions}</div>}
                {selected_id ? children : <Empty description={select_description} />}
            </div>
        </div>
    </div>
}


export function format_browser_time (value?: string) {
    if (!value)
        return '-'
    return value
}


export function use_agent_options ({ active_only = true }: { active_only?: boolean } = { }) {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    const options = agents
        .filter(agent => !active_only || agent.statusName === 'ACTIVE')
        .map(agent => ({
            value: agent.agentId,
            label: agent.agentName || agent.agentId,
            statusName: agent.statusName,
            active: agent.statusName === 'ACTIVE',
        }))
    const active_agent_id = options.some(agent => agent.value === agent_id) ? agent_id : options[0]?.value || ''
    
    useEffect(() => {
        if (agents.length === 0)
            chat_model.agent.load_agents().catch(error => { show_error(error, t('加载 Agent 失败')) })
    }, [ ])
    
    return {
        agent_id: active_agent_id,
        options,
    }
}


export function use_valid_agent_selection (
    options: { value: string, label: string }[],
    selected_agent_id: string,
    set_selected_agent_id: (agent_id: string) => void,
    preferred_agent_id = ''
) {
    const options_key = options.map(option => option.value).join('\n')
    useLayoutEffect(() => {
        const preferred = preferred_agent_id && options.some(option => option.value === preferred_agent_id) ? preferred_agent_id : ''
        const fallback = preferred || options[0]?.value || ''
        if (selected_agent_id && options.some(option => option.value === selected_agent_id))
            return
        if (selected_agent_id !== fallback)
            set_selected_agent_id(fallback)
    }, [options_key, selected_agent_id, preferred_agent_id])
}


export function use_user_options (enabled = true) {
    const [users, set_users] = useState<string[]>([ ])
    
    useEffect(() => {
        if (!enabled || !model.admin)
            return
        access.get_user_list()
            .then(set_users)
            .catch(error => { console.warn('load users failed', error) })
    }, [enabled])
    
    return users.map(user => ({ value: user, label: user }))
}
