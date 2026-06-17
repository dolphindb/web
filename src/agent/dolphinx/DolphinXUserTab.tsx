import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Input, InputNumber, Modal, Pagination, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { shell } from '@/shell/model.ts'

import { chat_model, get_chat_model } from '@/agent/model.ts'
import type { ILlmUsageStats, IMemoryEntry, ISession } from '@/agent/model.ts'
import { format_browser_time, Section, show_error, use_agent_options, use_user_options } from './common.tsx'


const { Text } = Typography


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
    const [loading, set_loading] = useState(false)
    const summary_modal = use_modal()
    const title_modal = use_modal()
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
    }, [agent_id])
    
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
    
    return <div style={{ height: 520, minHeight: 0, overflow: 'auto' }}>
        <Space wrap>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Button loading={loading} onClick={() => { load_sessions() }}>{t('刷新')}</Button>
        </Space>
        
        <Table
            style={{ marginTop: 12 }}
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
            scroll={{ x: show_workspace_size ? 840 : 720 }}
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
                    width: 270,
                    render: (_: unknown, session: ISession) => <Space size={4}>
                        <Button size='small' onClick={() => { open_title_modal(session) }}>{t('改标题')}</Button>
                        <Button size='small' onClick={() => { open_summary_modal(session) }}>{t('生成摘要')}</Button>
                        <Popconfirm title={t('确定删除此会话？')} okButtonProps={{ danger: true }} onConfirm={() => delete_session(session.sessionId)}>
                            <Button danger size='small'>{t('删除')}</Button>
                        </Popconfirm>
                    </Space>,
                },
            ]}
        />
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
    </div>
}


function MemorySection () {
    const { agent_id, options } = use_agent_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [agent_page, set_agent_page] = useState(1)
    const [category, set_category] = useState('')
    const [query, set_query] = useState('')
    const [sort_by, set_sort_by] = useState<'RECENCY' | 'IMPORTANCE' | 'TEXT_SEARCH' | 'RANKED'>('RANKED')
    const [items, set_items] = useState<IMemoryEntry[]>([ ])
    const [memory_total, set_memory_total] = useState(0)
    const [memory_enabled, set_memory_enabled] = useState(false)
    const [detail_memory, set_detail_memory] = useState<IMemoryEntry | null>(null)
    const [editing_memory_id, set_editing_memory_id] = useState('')
    const [form_category, set_form_category] = useState('general')
    const [form_content, set_form_content] = useState('')
    const [form_importance, set_form_importance] = useState(0.5)
    const [loading, set_loading] = useState(false)
    const [settings_loading, set_settings_loading] = useState(false)
    const memory_modal = use_modal()
    const agent_page_size = 10
    const paged_agent_options = options.slice((agent_page - 1) * agent_page_size, agent_page * agent_page_size)
    const has_memory_query = Boolean(query.trim())
    
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
            load_memory_settings()
            search_memory()
        } else {
            set_items([ ])
            set_memory_total(0)
        }
    }, [selected_agent_id])
    
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
                category: category || undefined,
                textQuery: query || undefined,
                topK: 50,
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
    
    async function save_memory () {
        if (!selected_agent_id || !form_category.trim() || !form_content.trim()) {
            message.warning(t('请填写分类和内容'))
            return
        }
        try {
            if (editing_memory_id)
                await chat_model.memory.update_memory(editing_memory_id, {
                    category: form_category.trim(),
                    content: form_content.trim(),
                    importance: form_importance,
                })
            else
                await chat_model.memory.store_memory({
                    agentId: selected_agent_id,
                    category: form_category.trim(),
                    content: form_content.trim(),
                    importance: form_importance,
                })
            message.success(t('保存成功'))
            memory_modal.close()
            set_editing_memory_id('')
            set_form_content('')
            await search_memory()
        } catch (error) {
            show_error(error, t('保存记忆失败'))
        }
    }
    
    function open_create_memory () {
        set_editing_memory_id('')
        set_form_category(category || 'general')
        set_form_content('')
        set_form_importance(0.5)
        memory_modal.open()
    }
    
    
    function open_edit_memory (item: IMemoryEntry) {
        set_editing_memory_id(item.memoryId)
        set_form_category(item.category || '')
        set_form_content(item.content || '')
        set_form_importance(item.importance ?? 0.5)
        memory_modal.open()
    }
    
    
    async function delete_memory (item: IMemoryEntry) {
        if (!item.memoryId)
            return
        try {
            await chat_model.memory.delete_memory(item.memoryId)
            message.success(t('删除成功'))
            await search_memory()
        } catch (error) {
            show_error(error, t('删除记忆失败'))
        }
    }
    
    return <>
        <div style={{ display: 'flex', gap: 12, height: 520, minHeight: 0 }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Space wrap>
                            <Switch checked={memory_enabled} loading={settings_loading} disabled={!selected_agent_id} onChange={set_personal_memory_enabled} />
                            <span>{t('启用记忆')}</span>
                        </Space>
                        <Space wrap>
                            <Text type='secondary'>{t('共 {{count}} 条', { count: memory_total })}</Text>
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
                            <Input style={{ width: 120 }} value={category} onChange={event => { set_category(event.target.value) }} placeholder={t('分类')} />
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
                        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无记忆')} /> }}
                        columns={[
                            {
                                title: t('分类'),
                                dataIndex: 'category',
                                width: 120,
                                render: (value: string) => <Tag>{value}</Tag>,
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
                                render: (value: string) => value || '-',
                            },
                            {
                                title: t('更新时间'),
                                dataIndex: 'updateTime',
                                width: 160,
                                render: (value: string) => value || '-',
                            },
                            {
                                title: t('内容'),
                                dataIndex: 'content',
                                render: (value: string) => <Text ellipsis style={{ maxWidth: 420 }}>{value}</Text>,
                            },
                            {
                                title: t('操作'),
                                width: 190,
                                render: (_: unknown, item: IMemoryEntry) => <Space>
                                    <Button size='small' onClick={() => { set_detail_memory(item) }}>{t('详情')}</Button>
                                    <Button size='small' onClick={() => { open_edit_memory(item) }}>{t('编辑')}</Button>
                                    <Popconfirm title={t('确定删除这条记忆？')} okButtonProps={{ danger: true }} onConfirm={() => delete_memory(item)}>
                                        <Button danger size='small'>{t('删除')}</Button>
                                    </Popconfirm>
                                </Space>,
                            },
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
            <Space direction='vertical' style={{ width: '100%' }}>
                <div>
                    <div style={{ marginBottom: 4 }}>{t('分类')}</div>
                    <Input value={form_category} onChange={event => { set_form_category(event.target.value) }} placeholder={t('分类')} />
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
                    dataSource={[
                        { key: 'id', label: 'ID', value: detail_memory.memoryId },
                        { key: 'category', label: t('分类'), value: detail_memory.category || '-' },
                        { key: 'type', label: t('类型'), value: detail_memory.memoryType || '-' },
                        { key: 'importance', label: t('重要度'), value: detail_memory.importance ?? '-' },
                        { key: 'confidence', label: t('置信度'), value: detail_memory.confidence ?? '-' },
                        { key: 'source', label: t('来源'), value: detail_memory.source || '-' },
                        { key: 'sourceRefs', label: t('来源引用'), value: detail_memory.sourceRefs || '-' },
                        { key: 'updateTime', label: t('更新时间'), value: detail_memory.updateTime || '-' },
                    ]}
                    columns={[
                        { dataIndex: 'label', width: 120 },
                        { dataIndex: 'value', render: (value: unknown) => String(value) },
                    ]}
                />
                <Input.TextArea value={detail_memory.content} rows={6} readOnly />
                {detail_memory.metadata && <Input.TextArea value={JSON.stringify(detail_memory.metadata, null, 2)} rows={4} readOnly />}
            </Space>}
        </Modal>
    </>
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
    }, [agent_id])
    
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
            }, selected_agent_id))
        } catch (error) {
            show_error(error, t('加载上下文预览失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const detail = preview?.detail || { }
    const token_breakdown = preview?.tokenBreakdown || { }
    const messages = Array.isArray(preview?.messages) ? preview.messages : [ ]
    
    return <Section title={t('上下文预览')}>
        <Space wrap>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Select
                style={{ width: 260 }}
                placeholder={t('选择会话')}
                value={selected_session_id || undefined}
                onChange={set_selected_session_id}
                options={sessions.map(session => ({ value: session.sessionId, label: session.title || session.sessionId }))}
            />
            <Button loading={loading} onClick={load_preview}>{t('预览')}</Button>
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
    </Section>
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
        return <div style={{ height: 520, minHeight: 0, overflow: 'auto' }}>
            <Space wrap>
                <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
                <Button loading={loading_usage} onClick={load_usage}>{t('刷新')}</Button>
            </Space>
            <Table<{ agentId: string, agentName: string, userId: string, usage: ILlmUsageStats | null }>
                style={{ marginTop: 12 }}
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
        </div>
    
    return <Section title={t('用户用量')}>
        <Space wrap style={{ marginBottom: 12 }}>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Button loading={loading_usage} onClick={load_admin_usage}>{t('刷新')}</Button>
        </Space>
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
    </Section>
}


export function DolphinXUserTab () {
    return <Tabs
        destroyInactiveTabPane
        items={[
            {
                key: 'sessions',
                label: t('会话'),
                children: <SessionSection />,
            },
            {
                key: 'memory',
                label: t('记忆'),
                children: <MemorySection />,
            },
            {
                key: 'usage',
                label: t('用量'),
                children: <UsageSection />,
            },
        ]}
    />
}
