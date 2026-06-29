import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Input, InputNumber, Modal, Pagination, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { shell } from '@/shell/model.ts'

import { chat_model, get_chat_model } from '@/agent/model.ts'
import type { ILlmConfig, ILlmUsageStats, IMemoryEntry, IMemoryJob, IMemoryStats, IPublicMemory, ISession } from '@/agent/model.ts'
import { AgentListLayout, format_browser_time, show_error, use_agent_options, use_user_options } from './common.tsx'


const { Text } = Typography

function ellipsis_text (value: unknown) {
    const text = String(value ?? '-')
    return <Text title={text} style={{ display: 'block', maxWidth: '100%' }} ellipsis>{text}</Text>
}


function format_file_size (size?: number) {
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


function optional_nonnegative_number (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? num : undefined
}


function SessionSection () {
    const { agent_id, options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [session_page, set_session_page] = useState(1)
    const [session_page_size, set_session_page_size] = useState(20)
    const [session_total, set_session_total] = useState(0)
    const [summary_session, set_summary_session] = useState<ISession | null>(null)
    const [editing_session, set_editing_session] = useState<ISession | null>(null)
    const [editing_title, set_editing_title] = useState('')
    const [summary_instructions, set_summary_instructions] = useState('')
    const [force_summary, set_force_summary] = useState(false)
    const [summary, set_summary] = useState('')
    const [generating_summary, set_generating_summary] = useState(false)
    const [triggering_session_id, set_triggering_session_id] = useState('')
    const [loading, set_loading] = useState(false)
    const summary_modal = use_modal()
    const title_modal = use_modal()
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    async function load_sessions (page = session_page, page_size = session_page_size) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const result = await chat_model.session.list_sessions({
                agentId: selected_agent_id,
                offset: (page - 1) * page_size,
                limit: page_size,
            })
            if (result.items.length === 0 && result.size > 0 && page > 1) {
                await load_sessions(page - 1, page_size)
                return
            }
            const stats = await Promise.all(result.items.map(session => chat_model.session.load_session_workspace_stats(session.sessionId)))
            set_sessions(result.items.map((session, index) => stats[index] ? { ...session, ...stats[index] } : session))
            set_session_page(page)
            set_session_page_size(page_size)
            set_session_total(result.size ?? result.items.length)
        } catch (error) {
            show_error(error, t('加载会话失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (selected_agent_id)
            load_sessions(1, session_page_size)
    }, [selected_agent_id])
    
    
    async function delete_session (session_id: string) {
        if (!session_id)
            return
        try {
            await chat_model.session.delete_session(session_id)
            message.success(t('删除成功'))
            await load_sessions()
        } catch (error) {
            show_error(error, t('删除会话失败'))
        }
    }
    
    
    async function save_session_title () {
        if (!editing_session)
            return
        const title = editing_title.trim()
        if (!title) {
            message.warning(t('请输入标题'))
            return
        }
        try {
            await chat_model.session.update_session_title(editing_session.sessionId, title)
            message.success(t('保存成功'))
            title_modal.close()
            set_editing_session(null)
            await load_sessions()
        } catch (error) {
            show_error(error, t('保存失败'))
        }
    }
    
    
    async function generate_summary () {
        if (!summary_session)
            return
        set_generating_summary(true)
        try {
            const result = await chat_model.session.generate_session_summary(summary_session.sessionId, {
                instructions: summary_instructions || undefined,
                force: force_summary,
            })
            set_summary(result.content || '')
            message.success(t('摘要已生成'))
        } catch (error) {
            show_error(error, t('摘要生成失败'))
        } finally {
            set_generating_summary(false)
        }
    }
    
    
    async function trigger_session_memory (session: ISession) {
        set_triggering_session_id(session.sessionId)
        try {
            await chat_model.memory.trigger_personal_session_pipeline(session.sessionId)
            message.success(t('记忆任务已触发'))
        } catch (error) {
            show_error(error, t('触发记忆任务失败'))
        } finally {
            set_triggering_session_id('')
        }
    }
    
    
    function open_summary_modal (session: ISession) {
        set_summary_session(session)
        set_summary('')
        set_summary_instructions('')
        set_force_summary(false)
        summary_modal.open()
    }
    
    
    function open_title_modal (session: ISession) {
        set_editing_session(session)
        set_editing_title(session.title || '')
        title_modal.open()
    }
    
    
    async function restore_session (session: ISession) {
        if (chat_model.agent_id !== session.agentId)
            chat_model.agent.select_agent(session.agentId)
        chat_model.set({ sessions: [session, ...chat_model.sessions.filter(item => item.sessionId !== session.sessionId)] })
        get_chat_model(session.sessionId).set({
            agent_id: session.agentId,
            sessions: [session],
            selected_llm_config_id: session.llmConfigId || '',
        })
        const added = await shell.add_ai_tab(session.sessionId, session.title || t('新会话'))
        if (!added)
            return
        chat_model.set({ settings_visible: false })
        if (model.view !== 'shell')
            model.goto('/shell/')
    }
    
    const show_workspace_size = sessions.some(session => session.workspaceSize !== undefined)
    
    return <>
        <AgentListLayout
            options={options}
            selected_agent_id={selected_agent_id}
            set_selected_agent_id={set_selected_agent_id}
            actions={<Button loading={loading} onClick={() => { load_sessions() }}>{t('刷新')}</Button>}
        >
        <Table
            size='small'
            rowKey='sessionId'
            loading={loading}
            dataSource={sessions}
            pagination={{
                current: session_page,
                pageSize: session_page_size,
                total: session_total,
                showSizeChanger: true,
                onChange: load_sessions,
            }}
            tableLayout='fixed'
            scroll={{ x: show_workspace_size ? 960 : 840 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无会话')} /> }}
            columns={[
                {
                    title: t('标题'),
                    dataIndex: 'title',
                    width: 260,
                    ellipsis: true,
                    render: (value: string, session: ISession) => <Text
                        ellipsis={{ tooltip: value }}
                        style={{ display: 'block', color: '#1677ff', cursor: 'pointer' }}
                        onClick={async () => {
                            try {
                                await restore_session(session)
                            } catch (error) {
                                show_error(error, t('恢复会话失败'))
                            }
                        }}
                    >{value}</Text>,
                },
                {
                    title: t('更新时间'),
                    dataIndex: 'updateTime',
                    width: 190,
                    render: format_browser_time,
                },
                ...show_workspace_size ? [{
                    title: t('工作区'),
                    width: 120,
                    render: (_: unknown, session: ISession) => session.workspaceSize === undefined
                        ? '-'
                        : <Text title={t('{{count}} 个文件', { count: session.workspaceFileCount ?? 0 })}>
                            {format_file_size(session.workspaceSize)}
                        </Text>,
                }] : [ ],
                {
                    title: t('操作'),
                    width: 380,
                    render: (_: unknown, session: ISession) => <Space size={4}>
                        <Button size='small' onClick={() => { open_title_modal(session) }}>{t('改标题')}</Button>
                        <Button size='small' onClick={() => { open_summary_modal(session) }}>{t('生成摘要')}</Button>
                        <Button size='small' loading={triggering_session_id === session.sessionId} onClick={() => { trigger_session_memory(session) }}>{t('触发记忆提取')}</Button>
                        <Popconfirm title={t('确定删除此会话？')} okButtonProps={{ danger: true }} onConfirm={() => delete_session(session.sessionId)}>
                            <Button danger size='small'>{t('删除')}</Button>
                        </Popconfirm>
                    </Space>,
                },
            ]}
        />
        </AgentListLayout>
        <Modal
            title={t('修改会话标题')}
            open={title_modal.visible}
            onCancel={title_modal.close}
            onOk={save_session_title}
            okText={t('保存')}
        >
            <Input
                value={editing_title}
                onChange={event => { set_editing_title(event.target.value) }}
                placeholder={t('请输入标题')}
                onPressEnter={save_session_title}
            />
        </Modal>
        
        <Modal
            title={<Text
                title={summary_session ? t('会话摘要：{{title}}', { title: summary_session.title || summary_session.sessionId }) : t('会话摘要')}
                style={{ display: 'block', maxWidth: 640 }}
                ellipsis
            >
                {summary_session ? t('会话摘要：{{title}}', { title: summary_session.title || summary_session.sessionId }) : t('会话摘要')}
            </Text>}
            open={summary_modal.visible}
            onCancel={summary_modal.close}
            footer={null}
            width={720}
        >
            <Input.TextArea
                rows={3}
                value={summary_instructions}
                onChange={event => { set_summary_instructions(event.target.value) }}
                placeholder={t('摘要要求（可选，例如：重点保留结论和关键 SQL）')}
            />
            <Space style={{ marginTop: 8 }} wrap>
                <Switch checked={force_summary} onChange={set_force_summary} />
                <span>{t('重新生成完整摘要')}</span>
                <Button type='primary' loading={generating_summary} disabled={!summary_session} onClick={generate_summary}>{t('生成摘要')}</Button>
            </Space>
            {summary && <div style={{ marginTop: 12, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {summary}
            </div>}
        </Modal>
    </>
}


type MemoryViewType = 'user_personal' | 'public_memory'

const memory_kind_options: Array<{ value: IMemoryEntry['memoryKind'], label: string }> = [
    { value: 'default', label: t('默认') },
    { value: 'preference', label: t('偏好') },
    { value: 'fact', label: t('事实') },
    { value: 'procedure', label: t('流程') },
    { value: 'failure_shield', label: t('失败防护') },
]


export function MemoryManagementTab ({ can_manage_memory = false }: { can_manage_memory?: boolean }) {
    return <Tabs
        className='ai-settings-tabs'
        destroyOnHidden
        items={[
            {
                key: 'memories',
                label: t('记忆'),
                children: <MemorySection can_manage_memory={can_manage_memory} can_view_public_memory />,
            },
            ...can_manage_memory ? [{
                key: 'config',
                label: t('配置'),
                children: <MemoryConfigManagementSection />,
            },
            {
                key: 'jobs',
                label: t('任务'),
                children: <MemoryJobsSection />,
            }] : [ ],
        ]}
    />
}


function MemorySection ({ can_manage_memory = false, can_view_public_memory = false }: { can_manage_memory?: boolean, can_view_public_memory?: boolean }) {
    const { agent_id, options } = use_agent_options()
    const [view_type, set_view_type] = useState<MemoryViewType>('user_personal')
    const personal_memory = view_type === 'user_personal'
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [agent_page, set_agent_page] = useState(1)
    const [memory_kind, set_memory_kind] = useState<IMemoryEntry['memoryKind'] | ''>('')
    const [query, set_query] = useState('')
    const [sort_by, set_sort_by] = useState<'RECENCY' | 'IMPORTANCE' | 'TEXT_SEARCH' | 'RANKED'>('RECENCY')
    const [items, set_items] = useState<IMemoryEntry[]>([ ])
    const [memory_total, set_memory_total] = useState(0)
    const [memory_enabled, set_memory_enabled] = useState(false)
    const [detail_memory, set_detail_memory] = useState<IMemoryEntry | null>(null)
    const [detail_loading_id, set_detail_loading_id] = useState('')
    const [editing_memory_id, set_editing_memory_id] = useState('')
    const [form_memory_kind, set_form_memory_kind] = useState<IMemoryEntry['memoryKind']>('default')
    const [form_title, set_form_title] = useState('')
    const [form_content, set_form_content] = useState('')
    const [form_importance, set_form_importance] = useState(0.5)
    const [public_memory, set_public_memory] = useState<IPublicMemory | null>(null)
    const [public_content, set_public_content] = useState('')
    const [public_editing, set_public_editing] = useState(false)
    const [loading, set_loading] = useState(false)
    const [public_loading, set_public_loading] = useState(false)
    const [public_saving, set_public_saving] = useState(false)
    const [settings_loading, set_settings_loading] = useState(false)
    const [forget_sessions, set_forget_sessions] = useState<ISession[]>([ ])
    const [forget_session_id, set_forget_session_id] = useState('')
    const [forget_loading, set_forget_loading] = useState(false)
    const [memory_stats, set_memory_stats] = useState<IMemoryStats | null>(null)
    const [stats_loading, set_stats_loading] = useState(false)
    const memory_modal = use_modal()
    const forget_modal = use_modal()
    const agent_page_size = 10
    const paged_agent_options = options.slice((agent_page - 1) * agent_page_size, agent_page * agent_page_size)
    const has_memory_query = Boolean(query.trim())
    const saved_public_content = public_memory?.content || ''
    const public_dirty = public_content !== saved_public_content
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    useEffect(() => {
        const max_page = Math.max(1, Math.ceil(options.length / agent_page_size))
        if (agent_page > max_page)
            set_agent_page(max_page)
    }, [options.length, agent_page])
    
    useEffect(() => {
        if (selected_agent_id) {
            if (personal_memory) {
                load_memory_settings()
                search_memory()
            } else
                load_public_memory()
            if (can_manage_memory)
                load_memory_stats()
        } else {
            set_items([ ])
            set_memory_total(0)
            set_memory_stats(null)
            set_public_memory(null)
            set_public_content('')
            set_public_editing(false)
        }
    }, [selected_agent_id, personal_memory, can_manage_memory])
    
    useEffect(() => {
        if (!can_view_public_memory && view_type === 'public_memory')
            set_view_type('user_personal')
    }, [can_view_public_memory, view_type])
    
    useEffect(() => {
        if (!can_manage_memory && public_editing)
            set_public_editing(false)
    }, [can_manage_memory, public_editing])
    
    useEffect(() => {
        if (!has_memory_query && sort_by === 'TEXT_SEARCH')
            set_sort_by('RANKED')
    }, [has_memory_query, sort_by])
    
    async function load_memory_settings () {
        if (!selected_agent_id)
            return
        set_settings_loading(true)
        try {
            const settings = await chat_model.memory.get_personal_settings(selected_agent_id)
            set_memory_enabled(settings.personalMemoryEnabled)
        } catch (error) {
            show_error(error, t('加载记忆设置失败'))
        } finally {
            set_settings_loading(false)
        }
    }
    
    async function set_personal_memory_enabled (enabled: boolean) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        const previous_enabled = memory_enabled
        set_memory_enabled(enabled)
        set_settings_loading(true)
        try {
            const settings = await chat_model.memory.set_personal_enabled(selected_agent_id, enabled)
            set_memory_enabled(settings.personalMemoryEnabled)
            message.success(t('记忆设置已更新'))
        } catch (error) {
            set_memory_enabled(previous_enabled)
            show_error(error, t('更新记忆设置失败'))
        } finally {
            set_settings_loading(false)
        }
    }
    
    async function search_memory (next_sort_by = sort_by) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const params = {
                agentId: selected_agent_id,
                memoryKind: memory_kind || undefined,
                textQuery: query.trim() || undefined,
                limit: 50,
                sortBy: next_sort_by,
            }
            const result = await chat_model.memory.search_memory(params)
            const next_items = result.items.map(item => ({ ...item, scopeType: item.scopeType || 'user_personal' as const }))
            set_items(next_items)
            set_memory_total(result.size ?? next_items.length)
        } catch (error) {
            show_error(error, t('加载记忆失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function load_public_memory () {
        if (!selected_agent_id)
            return
        set_public_loading(true)
        try {
            const memory = await chat_model.memory.get_public_memory(selected_agent_id)
            set_public_memory(memory)
            set_public_content(memory.content || '')
            set_public_editing(false)
        } catch (error) {
            show_error(error, t('加载公共记忆失败'))
        } finally {
            set_public_loading(false)
        }
    }
    
    async function do_save_public_memory () {
        if (!can_manage_memory)
            return
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_public_saving(true)
        try {
            const memory = await chat_model.memory.update_public_memory(selected_agent_id, public_content)
            set_public_memory(memory)
            set_public_content(memory.content || '')
            set_public_editing(false)
            message.success(t('公共记忆已保存'))
        } catch (error) {
            show_error(error, t('保存公共记忆失败'))
        } finally {
            set_public_saving(false)
        }
    }
    
    function confirm_save_public_memory () {
        if (!can_manage_memory || !selected_agent_id || !public_dirty)
            return
        model.modal.confirm({
            title: t('确认保存公共记忆？'),
            content: t('公共记忆会注入该 Agent 下所有用户的后续对话上下文，修改后可能影响所有用户的回答结果。确定保存？'),
            okText: t('确认保存'),
            cancelText: t('取消'),
            onOk: do_save_public_memory,
        })
    }
    
    async function do_clear_public_memory () {
        if (!can_manage_memory)
            return
        if (!selected_agent_id)
            return
        set_public_saving(true)
        try {
            const memory = await chat_model.memory.clear_public_memory(selected_agent_id)
            set_public_memory(memory)
            set_public_content(memory.content || '')
            set_public_editing(false)
            message.success(t('已清空'))
        } catch (error) {
            show_error(error, t('清空公共记忆失败'))
        } finally {
            set_public_saving(false)
        }
    }
    
    function confirm_clear_public_memory () {
        if (!can_manage_memory || !selected_agent_id)
            return
        model.modal.confirm({
            title: t('确认清空公共记忆？'),
            content: t('清空公共记忆会影响该 Agent 下所有用户的后续对话上下文。该操作会移除当前公共记忆内容，确定清空？'),
            okText: t('确认清空'),
            cancelText: t('取消'),
            okButtonProps: { danger: true },
            onOk: do_clear_public_memory,
        })
    }
    
    function open_public_editing () {
        if (!can_manage_memory)
            return
        set_public_content(saved_public_content)
        set_public_editing(true)
    }
    
    function cancel_public_editing () {
        if (!public_dirty) {
            set_public_content(saved_public_content)
            set_public_editing(false)
            return
        }
        model.modal.confirm({
            title: t('放弃未保存修改？'),
            content: t('当前公共记忆修改尚未保存，放弃后将恢复为上次保存的内容。'),
            okText: t('放弃修改'),
            cancelText: t('继续编辑'),
            okButtonProps: { danger: true },
            onOk: () => {
                set_public_content(saved_public_content)
                set_public_editing(false)
            },
        })
    }
    
    async function save_memory () {
        if (!selected_agent_id || !form_content.trim()) {
            message.warning(t('请填写记忆内容'))
            return
        }
        const updates = {
            memoryKind: form_memory_kind,
            title: form_title.trim() || undefined,
            content: form_content.trim(),
            importance: form_importance,
        }
        try {
            if (editing_memory_id)
                await chat_model.memory.update_memory(editing_memory_id, updates)
            else
                await chat_model.memory.store_memory({
                    agentId: selected_agent_id,
                    ...updates,
                })
            message.success(t('保存成功'))
            memory_modal.close()
            set_editing_memory_id('')
            set_form_title('')
            set_form_content('')
            await search_memory()
            await load_memory_stats()
        } catch (error) {
            show_error(error, t('保存记忆失败'))
        }
    }
    
    function open_create_memory () {
        set_editing_memory_id('')
        set_form_memory_kind(memory_kind || 'default')
        set_form_title('')
        set_form_content('')
        set_form_importance(0.5)
        memory_modal.open()
    }
    
    
    function open_edit_memory (item: IMemoryEntry) {
        set_editing_memory_id(item.memoryId)
        set_form_memory_kind(item.memoryKind || 'default')
        set_form_title(item.title || '')
        set_form_content(item.content || '')
        set_form_importance(item.importance ?? 0.5)
        memory_modal.open()
    }
    
    
    async function open_memory_detail (item: IMemoryEntry) {
        if (!item.memoryId)
            return
        set_detail_loading_id(item.memoryId)
        try {
            set_detail_memory(await chat_model.memory.get_memory(item.memoryId))
        } catch (error) {
            show_error(error, t('加载记忆详情失败'))
        } finally {
            set_detail_loading_id('')
        }
    }
    
    
    async function delete_memory (item: IMemoryEntry) {
        if (!item.memoryId)
            return
        try {
            await chat_model.memory.delete_memory(item.memoryId)
            message.success(t('删除成功'))
            await search_memory()
            await load_memory_stats()
        } catch (error) {
            show_error(error, t('删除记忆失败'))
        }
    }
    
    async function open_forget_modal () {
        if (!selected_agent_id)
            return
        set_forget_loading(true)
        try {
            const result = await chat_model.session.list_sessions({ agentId: selected_agent_id, limit: 100 })
            set_forget_sessions(result.items)
            set_forget_session_id(result.items[0]?.sessionId || '')
            forget_modal.open()
        } catch (error) {
            show_error(error, t('加载会话失败'))
        } finally {
            set_forget_loading(false)
        }
    }
    
    async function forget_session_memory () {
        if (!selected_agent_id || !forget_session_id) {
            message.warning(t('请选择会话'))
            return
        }
        set_forget_loading(true)
        try {
            await chat_model.memory.forget_session(selected_agent_id, forget_session_id)
            message.success(t('忘记请求已提交'))
            forget_modal.close()
            await search_memory()
        } catch (error) {
            show_error(error, t('忘记会话记忆失败'))
        } finally {
            set_forget_loading(false)
        }
    }
    
    async function load_memory_stats () {
        if (!selected_agent_id || !can_manage_memory)
            return
        set_stats_loading(true)
        try {
            set_memory_stats(await chat_model.memory.load_memory_stats(selected_agent_id))
        } catch (error) {
            show_error(error, t('加载记忆统计失败'))
        } finally {
            set_stats_loading(false)
        }
    }
    
    function PersonalMemoryContent () {
        return <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Space wrap>
                    <Switch checked={memory_enabled} loading={settings_loading} disabled={!selected_agent_id} onChange={set_personal_memory_enabled} />
                    <span>{t('启用记忆')}</span>
                </Space>
                <Space wrap>
                    <Text type='secondary'>{t('共 {{count}} 条', { count: memory_total })}</Text>
                    <Button loading={forget_loading} onClick={open_forget_modal}>{t('忘记')}</Button>
                    <Button loading={loading} onClick={() => { search_memory() }}>{t('刷新')}</Button>
                    <Button type='primary' onClick={open_create_memory}>{t('新增记忆')}</Button>
                </Space>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <Space wrap>
                    <Select
                        style={{ width: 130 }}
                        value={sort_by}
                        onChange={value => {
                            set_sort_by(value)
                            search_memory(value)
                        }}
                        options={[
                            { value: 'RANKED', label: t('综合排序') },
                            { value: 'RECENCY', label: t('最近更新') },
                            { value: 'IMPORTANCE', label: t('重要度') },
                            ...has_memory_query ? [{ value: 'TEXT_SEARCH', label: t('文本相关度') }] : [ ],
                        ]}
                    />
                    <Select
                        allowClear
                        style={{ width: 140 }}
                        value={memory_kind || undefined}
                        onChange={value => { set_memory_kind((value || '') as IMemoryEntry['memoryKind'] | '') }}
                        placeholder={t('主分类')}
                        options={memory_kind_options}
                    />
                </Space>
                <Input.Search
                    style={{ width: 240 }}
                    value={query}
                    onChange={event => { set_query(event.target.value) }}
                    onSearch={() => {
                        const next_sort_by = query.trim() ? 'TEXT_SEARCH' : sort_by === 'TEXT_SEARCH' ? 'RANKED' : sort_by
                        set_sort_by(next_sort_by)
                        search_memory(next_sort_by)
                    }}
                    placeholder={t('搜索记忆')}
                    enterButton={t('搜索')}
                    loading={loading}
                />
            </div>
            <Table
                size='small'
                rowKey='memoryId'
                loading={loading}
                dataSource={items}
                pagination={false}
                tableLayout='fixed'
                scroll={{ x: 980 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无记忆')} /> }}
                columns={[
                    {
                        title: t('主分类'),
                        dataIndex: 'memoryKind',
                        width: 120,
                        render: (value: IMemoryEntry['memoryKind']) => <Tag title={value} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</Tag>,
                    },
                    {
                        title: t('标题'),
                        dataIndex: 'title',
                        width: 160,
                        render: ellipsis_text,
                    },
                    {
                        title: t('重要度'),
                        dataIndex: 'importance',
                        width: 90,
                    },
                    {
                        title: t('来源'),
                        dataIndex: 'source',
                        width: 100,
                        render: ellipsis_text,
                    },
                    {
                        title: t('更新时间'),
                        dataIndex: 'updateTime',
                        width: 160,
                        render: format_browser_time,
                    },
                    {
                        title: t('内容'),
                        dataIndex: 'content',
                        render: ellipsis_text,
                    },
                    {
                        title: t('操作'),
                        width: 190,
                        render: (_: unknown, item: IMemoryEntry) => <Space>
                            <Button size='small' loading={detail_loading_id === item.memoryId} onClick={() => { open_memory_detail(item) }}>{t('详情')}</Button>
                            <Button size='small' onClick={() => { open_edit_memory(item) }}>{t('编辑')}</Button>
                            <Popconfirm title={t('确定删除这条记忆？')} okButtonProps={{ danger: true }} onConfirm={() => delete_memory(item)}>
                                <Button danger size='small'>{t('删除')}</Button>
                            </Popconfirm>
                        </Space>,
                    },
                ]}
            />
        </>
    }
    
    function PublicMemoryContent () {
        return <div style={{ maxWidth: 880 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <Space wrap>
                    <Text type='secondary'>{t('{{count}} / {{limit}} tokens', { count: public_memory?.estimatedTokens ?? 0, limit: public_memory?.tokenLimit ?? '-' })}</Text>
                    {public_memory?.updatedBy && <Text type='secondary'>{t('更新人：{{user}}', { user: public_memory.updatedBy })}</Text>}
                    {public_memory?.updateTime && <Text type='secondary'>{format_browser_time(public_memory.updateTime)}</Text>}
                </Space>
                <Space wrap>
                    {can_manage_memory && public_editing
                        ? <>
                            <Button disabled={public_saving} onClick={cancel_public_editing}>{t('取消')}</Button>
                            <Button danger loading={public_saving} onClick={confirm_clear_public_memory}>{t('清空')}</Button>
                            <Button type='primary' loading={public_saving} disabled={!public_dirty} onClick={confirm_save_public_memory}>{t('保存')}</Button>
                        </>
                        : <>
                            <Button loading={public_loading} onClick={load_public_memory}>{t('刷新')}</Button>
                            {can_manage_memory && <>
                                <Button disabled={public_loading} onClick={open_public_editing}>{t('编辑')}</Button>
                                <Button danger loading={public_saving} onClick={confirm_clear_public_memory}>{t('清空')}</Button>
                            </>}
                        </>}
                </Space>
            </div>
            <Input.TextArea
                value={public_content}
                onChange={event => {
                    if (public_editing)
                        set_public_content(event.target.value)
                }}
                rows={14}
                disabled={public_loading || public_saving}
                readOnly={!public_editing}
                placeholder={t('公共记忆内容')}
            />
        </div>
    }
    
    function stats_content () {
        if (!can_manage_memory)
            return null
        const stats_items = [
            [t('总数'), memory_stats?.totalCount],
            [t('个人记忆'), memory_stats?.userPersonalCount],
            [t('活跃'), memory_stats?.activeCount],
            [t('已删除'), memory_stats?.deletedCount],
            [t('平均重要度'), memory_stats?.avgImportance?.toFixed(2)],
        ]
        return <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4 }}>
            <Space size={24} wrap>
                {stats_items.map(([label, value]) => <span key={label}>
                    <Text type='secondary'>{label}</Text>
                    <Text strong style={{ marginLeft: 6 }}>{stats_loading ? '-' : value ?? '-'}</Text>
                </span>)}
            </Space>
        </div>
    }
    
    return <>
        <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>
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
                {selected_agent_id ? <>
                    {stats_content()}
                    <Tabs
                        activeKey={view_type}
                        onChange={key => {
                            set_view_type(key as MemoryViewType)
                            set_items([ ])
                            set_memory_total(0)
                        }}
                        items={[
                            {
                                key: 'user_personal',
                                label: t('个人'),
                                children: <PersonalMemoryContent />,
                            },
                            ...can_view_public_memory ? [{
                                key: 'public_memory',
                                label: t('公共'),
                                children: <PublicMemoryContent />,
                            }] : [ ],
                        ]}
                    />
                </> : <Empty description={t('请选择 Agent')} />}
            </div>
        </div>
        <Modal
            title={editing_memory_id ? t('编辑记忆') : t('新增记忆')}
            open={memory_modal.visible}
            onCancel={memory_modal.close}
            onOk={save_memory}
            okText={editing_memory_id ? t('更新') : t('新增')}
            width={640}
        >
            <Space orientation='vertical' style={{ width: '100%' }}>
                <div>
                    <div style={{ marginBottom: 4 }}>{t('主分类')}</div>
                    <Select style={{ width: '100%' }} value={form_memory_kind} onChange={set_form_memory_kind} options={memory_kind_options} />
                </div>
                <div>
                    <div style={{ marginBottom: 4 }}>{t('标题')}</div>
                    <Input value={form_title} onChange={event => { set_form_title(event.target.value) }} placeholder={t('标题')} />
                </div>
                <div>
                    <div style={{ marginBottom: 4 }}>{t('记忆内容')}</div>
                    <Input.TextArea value={form_content} onChange={event => { set_form_content(event.target.value) }} rows={5} placeholder={t('记忆内容')} />
                </div>
                <div>
                    <span style={{ marginRight: 8 }}>{t('重要度')}</span>
                    <InputNumber min={0} max={1} step={0.1} value={form_importance} onChange={value => { set_form_importance(value ?? 0.5) }} />
                </div>
            </Space>
        </Modal>
        <Modal
            title={t('忘记会话记忆')}
            open={forget_modal.visible}
            onCancel={forget_modal.close}
            onOk={forget_session_memory}
            confirmLoading={forget_loading}
            okText={t('忘记')}
        >
            <Select
                style={{ width: '100%' }}
                value={forget_session_id || undefined}
                onChange={set_forget_session_id}
                placeholder={t('选择会话')}
                options={forget_sessions.map(session => ({
                    value: session.sessionId,
                    label: session.title || session.sessionId,
                }))}
            />
        </Modal>
        <Modal
            title={t('记忆详情')}
            open={Boolean(detail_memory)}
            onCancel={() => { set_detail_memory(null) }}
            footer={null}
            width={760}
        >
            {detail_memory && <Space direction='vertical' style={{ width: '100%' }}>
                <Table
                    size='small'
                    pagination={false}
                    showHeader={false}
                    rowKey='key'
                    tableLayout='fixed'
                    dataSource={[
                        { key: 'id', label: 'ID', value: detail_memory.memoryId },
                        { key: 'memoryKind', label: t('主分类'), value: detail_memory.memoryKind || '-' },
                        { key: 'title', label: t('标题'), value: detail_memory.title || '-' },
                        { key: 'importance', label: t('重要度'), value: detail_memory.importance ?? '-' },
                        { key: 'confidence', label: t('置信度'), value: detail_memory.confidence ?? '-' },
                        { key: 'summary', label: t('摘要'), value: detail_memory.shortSummary || '-' },
                        { key: 'keywords', label: t('关键词'), value: detail_memory.keywords || '-' },
                        { key: 'tags', label: t('标签'), value: detail_memory.tags || '-' },
                        { key: 'source', label: t('来源'), value: detail_memory.source || '-' },
                        { key: 'sourceRefs', label: t('来源引用'), value: detail_memory.sourceRefs || '-' },
                        { key: 'rankScore', label: t('综合分'), value: detail_memory.rankScore ?? '-' },
                        { key: 'textScore', label: t('文本分'), value: detail_memory.textScore ?? '-' },
                        { key: 'vectorScore', label: t('向量分'), value: detail_memory.vectorScore ?? '-' },
                        { key: 'updateTime', label: t('更新时间'), value: format_browser_time(detail_memory.updateTime) },
                    ]}
                    columns={[
                        { dataIndex: 'label', width: 120 },
                        { dataIndex: 'value', render: ellipsis_text },
                    ]}
                />
                <Input.TextArea value={detail_memory.content} rows={6} readOnly />
            </Space>}
        </Modal>
    </>
}


function MemoryConfigSection ({ agent_id }: { agent_id: string }) {
    const [form, set_form] = useState<{
        allowPersonalMemory: boolean
        memoryLlmConfigId: string
        memoryEmbeddingConfigId: string
        memoryTopK?: number
        residentPreferenceTopK?: number
        residentPreferenceBudget?: number
        relevantMemoryBudget?: number
        publicMemoryTokenLimit?: number
        embeddingTopK?: number
        embeddingWeight?: number
        memoryEmbeddingIndexType: string
        phase2RelatedVectorTopK?: number
        phase2RelatedTextTopK?: number
        phase2RelatedRecentTopK?: number
        phase2RelatedMax?: number
        minSessionIdleMinutes?: number
        maxSessionAgeDays?: number
        phase2CooldownMinutes?: number
        maxRawMemoriesForConsolidation?: number
        maxUnusedDays?: number
    }>({
        allowPersonalMemory: true,
        memoryLlmConfigId: '',
        memoryEmbeddingConfigId: '',
        memoryEmbeddingIndexType: 'flat',
    })
    const [llm_configs, set_llm_configs] = useState<ILlmConfig[]>([ ])
    const [loading, set_loading] = useState(false)
    const chat_llm_configs = llm_configs.filter(config => config.capability !== 'embedding')
    const embedding_llm_configs = llm_configs.filter(config => config.capability === 'embedding')
    
    async function load_config () {
        set_loading(true)
        try {
            const [result, configs] = await Promise.all([
                chat_model.memory.get_memory_config(agent_id),
                chat_model.llm.load_llm_configs(),
            ])
            const config = result.memoryConfig || { }
            set_llm_configs(configs.filter(item => item.statusName !== 'DELETED'))
            set_form({
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                memoryTopK: optional_nonnegative_number(config.memoryTopK),
                residentPreferenceTopK: optional_nonnegative_number(config.residentPreferenceTopK),
                residentPreferenceBudget: optional_nonnegative_number(config.residentPreferenceBudget),
                relevantMemoryBudget: optional_nonnegative_number(config.relevantMemoryBudget),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
                embeddingTopK: optional_nonnegative_number(config.embeddingTopK),
                embeddingWeight: optional_nonnegative_number(config.embeddingWeight),
                memoryEmbeddingIndexType: String(config.memoryEmbeddingIndexType || 'flat'),
                phase2RelatedVectorTopK: optional_nonnegative_number(config.phase2RelatedVectorTopK),
                phase2RelatedTextTopK: optional_nonnegative_number(config.phase2RelatedTextTopK),
                phase2RelatedRecentTopK: optional_nonnegative_number(config.phase2RelatedRecentTopK),
                phase2RelatedMax: optional_nonnegative_number(config.phase2RelatedMax),
                minSessionIdleMinutes: optional_nonnegative_number(config.minSessionIdleMinutes),
                maxSessionAgeDays: optional_nonnegative_number(config.maxSessionAgeDays),
                phase2CooldownMinutes: optional_nonnegative_number(config.phase2CooldownMinutes),
                maxRawMemoriesForConsolidation: optional_nonnegative_number(config.maxRawMemoriesForConsolidation),
                maxUnusedDays: optional_nonnegative_number(config.maxUnusedDays),
            })
        } catch (error) {
            show_error(error, t('加载记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function save_config () {
        const memory_config = {
            allowPersonalMemory: form.allowPersonalMemory,
            memoryLlmConfigId: form.memoryLlmConfigId || null,
            memoryEmbeddingConfigId: form.memoryEmbeddingConfigId || null,
            memoryTopK: form.memoryTopK ?? null,
            residentPreferenceTopK: form.residentPreferenceTopK ?? null,
            residentPreferenceBudget: form.residentPreferenceBudget ?? null,
            relevantMemoryBudget: form.relevantMemoryBudget ?? null,
            publicMemoryTokenLimit: form.publicMemoryTokenLimit ?? null,
            embeddingTopK: form.embeddingTopK ?? null,
            embeddingWeight: form.embeddingWeight ?? null,
            memoryEmbeddingIndexType: form.memoryEmbeddingIndexType || null,
            phase2RelatedVectorTopK: form.phase2RelatedVectorTopK ?? null,
            phase2RelatedTextTopK: form.phase2RelatedTextTopK ?? null,
            phase2RelatedRecentTopK: form.phase2RelatedRecentTopK ?? null,
            phase2RelatedMax: form.phase2RelatedMax ?? null,
            minSessionIdleMinutes: form.minSessionIdleMinutes ?? null,
            maxSessionAgeDays: form.maxSessionAgeDays ?? null,
            phase2CooldownMinutes: form.phase2CooldownMinutes ?? null,
            maxRawMemoriesForConsolidation: form.maxRawMemoriesForConsolidation ?? null,
            maxUnusedDays: form.maxUnusedDays ?? null,
        }
        set_loading(true)
        try {
            const result = await chat_model.memory.update_memory_config(agent_id, memory_config)
            const config = result.memoryConfig || { }
            set_form({
                allowPersonalMemory: config.allowPersonalMemory !== false,
                memoryLlmConfigId: String(config.memoryLlmConfigId || ''),
                memoryEmbeddingConfigId: String(config.memoryEmbeddingConfigId || ''),
                memoryTopK: optional_nonnegative_number(config.memoryTopK),
                residentPreferenceTopK: optional_nonnegative_number(config.residentPreferenceTopK),
                residentPreferenceBudget: optional_nonnegative_number(config.residentPreferenceBudget),
                relevantMemoryBudget: optional_nonnegative_number(config.relevantMemoryBudget),
                publicMemoryTokenLimit: optional_nonnegative_number(config.publicMemoryTokenLimit),
                embeddingTopK: optional_nonnegative_number(config.embeddingTopK),
                embeddingWeight: optional_nonnegative_number(config.embeddingWeight),
                memoryEmbeddingIndexType: String(config.memoryEmbeddingIndexType || 'flat'),
                phase2RelatedVectorTopK: optional_nonnegative_number(config.phase2RelatedVectorTopK),
                phase2RelatedTextTopK: optional_nonnegative_number(config.phase2RelatedTextTopK),
                phase2RelatedRecentTopK: optional_nonnegative_number(config.phase2RelatedRecentTopK),
                phase2RelatedMax: optional_nonnegative_number(config.phase2RelatedMax),
                minSessionIdleMinutes: optional_nonnegative_number(config.minSessionIdleMinutes),
                maxSessionAgeDays: optional_nonnegative_number(config.maxSessionAgeDays),
                phase2CooldownMinutes: optional_nonnegative_number(config.phase2CooldownMinutes),
                maxRawMemoriesForConsolidation: optional_nonnegative_number(config.maxRawMemoriesForConsolidation),
                maxUnusedDays: optional_nonnegative_number(config.maxUnusedDays),
            })
            message.success(t('保存成功'))
        } catch (error) {
            show_error(error, t('保存记忆配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load_config() }, [agent_id])
    
    function number_field (key: keyof typeof form, label: string, placeholder: string) {
        return <div>
            <div style={{ marginBottom: 4, fontSize: 13 }}>{label}</div>
            <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={form[key] as number | undefined}
                onChange={value => { set_form({ ...form, [key]: optional_nonnegative_number(value) }) }}
                placeholder={placeholder}
            />
        </div>
    }
    
    return <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: '12px 16px' }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('允许个人记忆')}</div>
                    <Switch checked={form.allowPersonalMemory} onChange={value => { set_form({ ...form, allowPersonalMemory: value }) }} />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('记忆模型配置')}</div>
                    <Select
                        allowClear
                        showSearch
                        style={{ width: '100%' }}
                        value={form.memoryLlmConfigId || undefined}
                        onChange={value => { set_form({ ...form, memoryLlmConfigId: value || '' }) }}
                        placeholder={t('使用 Agent 默认模型')}
                        options={chat_llm_configs.map(config => ({
                            value: config.llmConfigId,
                            label: config.name || config.llmConfigId,
                        }))}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('记忆向量配置')}</div>
                    <Select
                        allowClear
                        showSearch
                        style={{ width: '100%' }}
                        value={form.memoryEmbeddingConfigId || undefined}
                        onChange={value => { set_form({ ...form, memoryEmbeddingConfigId: value || '' }) }}
                        placeholder={t('不使用向量召回')}
                        options={embedding_llm_configs.map(config => ({
                            value: config.llmConfigId,
                            label: config.name || config.llmConfigId,
                        }))}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('向量索引类型')}</div>
                    <Select
                        style={{ width: '100%' }}
                        value={form.memoryEmbeddingIndexType}
                        onChange={value => { set_form({ ...form, memoryEmbeddingIndexType: value }) }}
                        options={[
                            { value: 'flat', label: 'flat' },
                            { value: 'hnsw', label: 'hnsw' },
                        ]}
                    />
                </div>
                {number_field('memoryTopK', t('记忆注入上限'), '5')}
                {number_field('residentPreferenceTopK', t('常驻偏好上限'), '5')}
                {number_field('residentPreferenceBudget', t('常驻偏好预算'), '300')}
                {number_field('relevantMemoryBudget', t('相关记忆预算'), '2000')}
                {number_field('publicMemoryTokenLimit', t('公共记忆上限'), '2000')}
                {number_field('embeddingTopK', t('向量候选数'), '20')}
                {number_field('embeddingWeight', t('向量权重'), '0.35')}
                {number_field('phase2RelatedVectorTopK', t('整理向量候选数'), '20')}
                {number_field('phase2RelatedTextTopK', t('整理文本候选数'), '20')}
                {number_field('phase2RelatedRecentTopK', t('整理近期候选数'), '10')}
                {number_field('phase2RelatedMax', t('整理候选上限'), '30')}
                {number_field('minSessionIdleMinutes', t('会话空闲分钟'), '360')}
                {number_field('maxSessionAgeDays', t('最大会话天数'), '10')}
                {number_field('phase2CooldownMinutes', t('自动整理冷却分钟'), '10')}
                {number_field('maxRawMemoriesForConsolidation', t('单次整理候选上限'), '256')}
                {number_field('maxUnusedDays', t('低频维护未使用天数'), '30')}
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type='primary' loading={loading} onClick={save_config}>{t('保存')}</Button>
        </div>
    </div>
}


function MemoryConfigManagementSection () {
    const { agent_id, options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [agent_page, set_agent_page] = useState(1)
    const agent_page_size = 10
    const paged_agent_options = options.slice((agent_page - 1) * agent_page_size, agent_page * agent_page_size)
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    useEffect(() => {
        const max_page = Math.max(1, Math.ceil(options.length / agent_page_size))
        if (agent_page > max_page)
            set_agent_page(max_page)
    }, [options.length, agent_page])
    
    return <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>
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
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {selected_agent_id
                ? <MemoryConfigSection agent_id={selected_agent_id} />
                : <Empty description={t('请选择 Agent')} />}
        </div>
    </div>
}


function MemoryJobsSection () {
    const { agent_id, options } = use_agent_options()
    const user_options = use_user_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [kind, set_kind] = useState('')
    const [status, set_status] = useState('')
    const [target_user_id, set_target_user_id] = useState('')
    const [jobs, set_jobs] = useState<IMemoryJob[]>([ ])
    const [job_page, set_job_page] = useState(1)
    const [job_total, set_job_total] = useState(0)
    const [job_detail, set_job_detail] = useState<IMemoryJob | null>(null)
    const [job_detail_loading_key, set_job_detail_loading_key] = useState('')
    const [loading, set_loading] = useState(false)
    const job_page_size = 20
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    useEffect(() => {
        if (selected_agent_id)
            load_jobs(1)
    }, [selected_agent_id])
    
    async function load_jobs (page = job_page) {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const result = await chat_model.memory.list_memory_jobs({
                agentId: selected_agent_id,
                kind: kind || undefined,
                status: status || undefined,
                targetUserId: target_user_id || undefined,
                offset: (page - 1) * job_page_size,
                limit: job_page_size,
            })
            set_jobs(result.items)
            set_job_page(page)
            set_job_total(result.size ?? result.items.length)
        } catch (error) {
            show_error(error, t('加载记忆任务失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function retry_job (job: IMemoryJob) {
        if (!selected_agent_id)
            return
        set_loading(true)
        try {
            await chat_model.memory.retry_memory_job(selected_agent_id, job.kind, job.jobKey)
            message.success(t('记忆任务重试次数已重置'))
            await load_jobs(job_page)
        } catch (error) {
            show_error(error, t('重置记忆任务重试次数失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function open_job_detail (job: IMemoryJob) {
        if (!selected_agent_id)
            return
        const key = `${job.kind}:${job.jobKey}`
        set_job_detail_loading_key(key)
        try {
            set_job_detail(await chat_model.memory.get_memory_job(selected_agent_id, job.kind, job.jobKey))
        } catch (error) {
            show_error(error, t('加载记忆任务详情失败'))
        } finally {
            set_job_detail_loading_key('')
        }
    }
    
    return <AgentListLayout
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
        actions={<Button loading={loading} onClick={() => { load_jobs(1) }}>{t('刷新')}</Button>}
    >
        <Space wrap style={{ marginBottom: 12 }}>
            <Input style={{ width: 140 }} value={kind} onChange={event => { set_kind(event.target.value) }} placeholder={t('任务类型')} />
            <Input style={{ width: 140 }} value={status} onChange={event => { set_status(event.target.value) }} placeholder={t('任务状态')} />
            <Select allowClear showSearch style={{ width: 180 }} placeholder={t('用户')} value={target_user_id || undefined} onChange={value => { set_target_user_id(value || '') }} options={user_options} />
        </Space>
        <Table
            size='small'
            rowKey={job => `${job.kind}:${job.jobKey}`}
            loading={loading}
            dataSource={jobs}
            tableLayout='fixed'
            scroll={{ x: 1040 }}
            pagination={{
                current: job_page,
                pageSize: job_page_size,
                total: job_total,
                showSizeChanger: false,
                onChange: load_jobs,
            }}
            columns={[
                { title: t('任务类型'), dataIndex: 'kind', width: 130 },
                { title: t('任务状态'), dataIndex: 'status', width: 120 },
                { title: t('任务 Key'), dataIndex: 'jobKey', ellipsis: true, render: ellipsis_text },
                { title: t('开始时间'), dataIndex: 'startedTime', width: 170, render: format_browser_time },
                { title: t('完成时间'), dataIndex: 'finishedTime', width: 170, render: format_browser_time },
                { title: t('剩余重试'), dataIndex: 'retryRemaining', width: 90 },
                { title: t('最近错误'), dataIndex: 'lastError', ellipsis: true, render: ellipsis_text },
                {
                    title: t('操作'),
                    width: 140,
                    render: (_: unknown, job: IMemoryJob) => <Space size={4}>
                        <Button size='small' loading={job_detail_loading_key === `${job.kind}:${job.jobKey}`} onClick={() => { open_job_detail(job) }}>{t('详情')}</Button>
                        <Button size='small' onClick={() => { retry_job(job) }}>{t('重置次数')}</Button>
                    </Space>,
                },
            ]}
        />
        <Modal
            title={t('记忆任务详情')}
            open={Boolean(job_detail)}
            onCancel={() => { set_job_detail(null) }}
            footer={null}
            width={760}
        >
            {job_detail && <Space direction='vertical' style={{ width: '100%' }}>
                <Table
                    size='small'
                    pagination={false}
                    showHeader={false}
                    rowKey='key'
                    tableLayout='fixed'
                    dataSource={[
                        { key: 'kind', label: t('任务类型'), value: job_detail.kind },
                        { key: 'status', label: t('任务状态'), value: job_detail.status || '-' },
                        { key: 'jobKey', label: t('任务 Key'), value: job_detail.jobKey },
                        { key: 'workerId', label: t('Worker'), value: job_detail.workerId || '-' },
                        { key: 'startedTime', label: t('开始时间'), value: format_browser_time(job_detail.startedTime) },
                        { key: 'finishedTime', label: t('完成时间'), value: format_browser_time(job_detail.finishedTime) },
                        { key: 'retryAt', label: t('重试时间'), value: format_browser_time(job_detail.retryAt) },
                        { key: 'retryRemaining', label: t('剩余重试'), value: job_detail.retryRemaining ?? '-' },
                        { key: 'inputWatermark', label: t('输入水位'), value: job_detail.inputWatermark || '-' },
                        { key: 'lastSuccessWatermark', label: t('成功水位'), value: job_detail.lastSuccessWatermark || '-' },
                    ]}
                    columns={[
                        { dataIndex: 'label', width: 140 },
                        { dataIndex: 'value', render: ellipsis_text },
                    ]}
                />
                {job_detail.lastError && <Input.TextArea value={job_detail.lastError} rows={4} readOnly />}
                {job_detail.extra && <Input.TextArea value={job_detail.extra} rows={4} readOnly />}
            </Space>}
        </Modal>
    </AgentListLayout>
}


function ContextPreviewSection () {
    const { agent_id, options } = use_agent_options()
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [selected_session_id, set_selected_session_id] = useState('')
    const [message_text, set_message_text] = useState('')
    const [preview, set_preview] = useState<any>(null)
    const [loading, set_loading] = useState(false)
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    async function load_sessions () {
        if (!selected_agent_id) {
            set_sessions([ ])
            set_selected_session_id('')
            return
        }
        const result = await chat_model.session.list_sessions({
            agentId: selected_agent_id,
            limit: 100,
        })
        set_sessions(result.items)
        if (!selected_session_id || !result.items.some(item => item.sessionId === selected_session_id))
            set_selected_session_id(result.items[0]?.sessionId || '')
    }
    
    useEffect(() => {
        load_sessions().catch(error => { show_error(error, t('加载会话失败')) })
    }, [selected_agent_id])
    
    async function load_preview () {
        if (!selected_agent_id || !selected_session_id || !message_text.trim()) {
            message.warning(t('请选择 Agent、会话并输入消息'))
            return
        }
        set_loading(true)
        try {
            set_preview(await chat_model.session.preview_context({
                sessionId: selected_session_id,
                message: message_text.trim(),
            }))
        } catch (error) {
            show_error(error, t('加载上下文预览失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const detail = preview?.detail || { }
    const token_breakdown = preview?.tokenBreakdown || { }
    const messages = Array.isArray(preview?.messages) ? preview.messages : [ ]
    
    return <AgentListLayout
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
        actions={<Button loading={loading} onClick={load_preview}>{t('预览')}</Button>}
    >
        <Space wrap>
            <Select
                style={{ width: 260 }}
                placeholder={t('选择会话')}
                value={selected_session_id || undefined}
                onChange={set_selected_session_id}
                options={sessions.map(session => ({ value: session.sessionId, label: session.title || session.sessionId }))}
            />
        </Space>
        <Input.TextArea
            style={{ marginTop: 12 }}
            value={message_text}
            onChange={event => { set_message_text(event.target.value) }}
            placeholder={t('输入待预览的用户消息')}
            rows={3}
        />
        {preview && <Space direction='vertical' style={{ width: '100%', marginTop: 12 }}>
            <Table
                size='small'
                pagination={false}
                rowKey='key'
                dataSource={[
                    { key: 'tokens', label: t('预估 Token'), value: preview.estimatedTokens ?? '-' },
                    { key: 'mode', label: t('组装模式'), value: detail.assemblyMode || preview.assemblyMode || '-' },
                    { key: 'memories', label: t('记忆数量'), value: detail.memoriesIncluded ?? '-' },
                    { key: 'messages', label: t('历史消息数'), value: detail.messagesIncluded ?? '-' },
                    { key: 'skills', label: t('技能数量'), value: detail.skillsInCatalog ?? '-' },
                    { key: 'summary', label: t('包含摘要'), value: detail.summaryIncluded === undefined ? '-' : String(detail.summaryIncluded) },
                ]}
                columns={[
                    { title: t('项目'), dataIndex: 'label', width: 140 },
                    { title: t('值'), dataIndex: 'value' },
                ]}
            />
            {Object.keys(token_breakdown).length > 0 && <Table
                size='small'
                pagination={false}
                rowKey='key'
                dataSource={Object.entries(token_breakdown).map(([key, value]) => ({ key, value }))}
                columns={[
                    { title: t('Token 项'), dataIndex: 'key' },
                    { title: t('数量'), dataIndex: 'value', width: 120 },
                ]}
            />}
            <Table
                size='small'
                pagination={{ defaultPageSize: 8 }}
                rowKey={(_, index) => String(index)}
                dataSource={messages}
                expandable={{
                    expandedRowRender: row => <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(row.content || '')}</pre>,
                    rowExpandable: row => Boolean(String(row.content || '').trim()),
                }}
                columns={[
                    { title: t('角色'), dataIndex: 'role', width: 100 },
                    {
                        title: t('内容'),
                        render: (_: unknown, row: any) => <Text ellipsis style={{ maxWidth: 620 }}>{String(row.content || '')}</Text>,
                    },
                ]}
            />
        </Space>}
    </AgentListLayout>
}


export function UsageSection ({ admin = false }: { admin?: boolean }) {
    const { agent_id, options } = use_agent_options()
    const { username } = model.use(['username'])
    const user_options = use_user_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [usage, set_usage] = useState<ILlmUsageStats | null>(null)
    const [usage_by_user, set_usage_by_user] = useState<Record<string, ILlmUsageStats>>({ })
    const [loading_usage, set_loading_usage] = useState(false)
    const user_ids_key = user_options.map(user => user.value).join('\n')
    const selected_agent_name = options.find(option => option.value === selected_agent_id)?.label || selected_agent_id || '-'
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
    }, [agent_id])
    
    useEffect(() => {
        if (!selected_agent_id)
            return
        if (admin)
            load_admin_usage()
        else
            load_usage()
    }, [selected_agent_id, admin, user_ids_key])
    
    async function load_usage () {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading_usage(true)
        try {
            set_usage(await chat_model.llm.load_llm_usage({
                agentId: selected_agent_id,
            }))
        } catch (error) {
            show_error(error, t('加载用量失败'))
        } finally {
            set_loading_usage(false)
        }
    }
    
    
    async function load_admin_usage () {
        if (!selected_agent_id || user_options.length === 0) {
            set_usage_by_user({ })
            return
        }
        
        set_loading_usage(true)
        try {
            const entries = await Promise.all(user_options.map(async user => [
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
        return <AgentListLayout
            options={options}
            selected_agent_id={selected_agent_id}
            set_selected_agent_id={set_selected_agent_id}
            actions={<Button loading={loading_usage} onClick={load_usage}>{t('刷新')}</Button>}
        >
            <Table<{ agentId: string, agentName: string, userId: string, usage: ILlmUsageStats | null }>
                size='small'
                rowKey='agentId'
                loading={loading_usage}
                dataSource={selected_agent_id ? [{ agentId: selected_agent_id, agentName: selected_agent_name, userId: usage?.userId || username, usage }] : [ ]}
                pagination={false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用量')} /> }}
                columns={[
                    {
                        title: t('用户'),
                        dataIndex: 'userId',
                    },
                    {
                        title: t('Agent 名称'),
                        dataIndex: 'agentName',
                    },
                    {
                        title: t('请求次数'),
                        render: (_: unknown, row) => row.usage?.requestCount ?? 0,
                    },
                    {
                        title: t('输入 Token'),
                        render: (_: unknown, row) => row.usage?.totalPromptTokens ?? 0,
                    },
                    {
                        title: t('输出 Token'),
                        render: (_: unknown, row) => row.usage?.totalCompletionTokens ?? 0,
                    },
                    {
                        title: t('总 Token'),
                        render: (_: unknown, row) => row.usage?.totalTokens ?? 0,
                    },
                ]}
            />
        </AgentListLayout>
    
    return <AgentListLayout
        options={options}
        selected_agent_id={selected_agent_id}
        set_selected_agent_id={set_selected_agent_id}
        actions={<Button loading={loading_usage} onClick={load_admin_usage}>{t('刷新')}</Button>}
    >
        <Table
            size='small'
            rowKey='value'
            loading={loading_usage}
            dataSource={user_options.map(user => ({ ...user, agentName: selected_agent_name, usage: usage_by_user[user.value] }))}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} /> }}
            columns={[
                {
                    title: t('用户'),
                    dataIndex: 'label',
                },
                {
                    title: t('Agent 名称'),
                    dataIndex: 'agentName',
                },
                {
                    title: t('请求次数'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.requestCount ?? 0,
                },
                {
                    title: t('输入 Token'),
                    render: (_: unknown, row: { usage?: ILlmUsageStats }) => row.usage?.totalPromptTokens ?? 0,
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


export function DolphinXUserTab ({ admin = false }: { admin?: boolean }) {
    return <Tabs
        className='ai-settings-tabs'
        destroyInactiveTabPane
        items={[
            {
                key: 'sessions',
                label: t('会话'),
                children: <SessionSection />,
            },
            {
                key: 'usage',
                label: t('用量'),
                children: <UsageSection />,
            },
            ...admin ? [{
                key: 'context_preview',
                label: t('上下文预览'),
                children: <ContextPreviewSection />,
            }] : [ ],
        ]}
    />
}
