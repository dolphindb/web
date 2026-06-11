import { useEffect, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Input, InputNumber, Modal, Popconfirm, Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { shell } from '@/shell/model.ts'

import { chat_model, get_chat_model } from '@/chat/model.ts'
import type { ILlmUsageStats, IMemoryEntry, ISession } from '@/chat/model.ts'
import { format_browser_time, Section, show_error, use_agent_options, use_user_options } from './common.tsx'


const { Text } = Typography


function SessionSection () {
    const { agent_id, options } = use_agent_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [summary_session, set_summary_session] = useState<ISession | null>(null)
    const [editing_session, set_editing_session] = useState<ISession | null>(null)
    const [editing_title, set_editing_title] = useState('')
    const [summary_instructions, set_summary_instructions] = useState('')
    const [force_summary, set_force_summary] = useState(false)
    const [summary, set_summary] = useState('')
    const [loading, set_loading] = useState(false)
    const summary_modal = use_modal()
    const title_modal = use_modal()
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
    }, [agent_id])
    
    async function load_sessions () {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const result = await chat_model.list_sessions({
                agentId: selected_agent_id,
                limit: 100,
            })
            set_sessions(result.items)
        } catch (error) {
            show_error(error, t('加载会话失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (selected_agent_id)
            load_sessions()
    }, [selected_agent_id])
    
    
    async function delete_session (session_id: string) {
        if (!session_id)
            return
        try {
            await chat_model.delete_session(session_id)
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
            await chat_model.update_session_title(editing_session.sessionId, title)
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
        try {
            const result = await chat_model.generate_session_summary(summary_session.sessionId, {
                instructions: summary_instructions || undefined,
                force: force_summary,
            })
            set_summary(result.content || '')
            message.success(t('摘要已生成'))
        } catch (error) {
            show_error(error, t('摘要生成失败'))
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
            chat_model.select_agent(session.agentId)
        chat_model.set({ sessions: [session, ...chat_model.sessions.filter(item => item.sessionId !== session.sessionId)] })
        get_chat_model(session.sessionId).set({
            agent_id: session.agentId,
            sessions: [session],
            selected_llm_config_id: session.llmConfigId || '',
        })
        await shell.add_ai_tab(session.sessionId, session.title || t('新会话'))
        chat_model.set({ settings_visible: false })
        if (model.view !== 'shell')
            model.goto('/shell/')
    }
    
    return <Section title={t('会话')}>
        <Space wrap>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Button loading={loading} onClick={load_sessions}>{t('刷新')}</Button>
        </Space>
        
        <Table
            style={{ marginTop: 12 }}
            size='small'
            rowKey='sessionId'
            loading={loading}
            dataSource={sessions}
            pagination={false}
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无会话')} /> }}
            columns={[
                {
                    title: t('标题'),
                    dataIndex: 'title',
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
                    width: 210,
                    render: format_browser_time,
                },
                {
                    title: t('操作'),
                    width: 200,
                    render: (_: unknown, session: ISession) => <Space>
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
            title={summary_session ? t('会话摘要：{{title}}', { title: summary_session.title || summary_session.sessionId }) : t('会话摘要')}
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
                <Button type='primary' disabled={!summary_session} onClick={generate_summary}>{t('生成摘要')}</Button>
            </Space>
            {summary && <div style={{ marginTop: 12, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {summary}
            </div>}
        </Modal>
    </Section>
}


function MemorySection () {
    const { agent_id, options } = use_agent_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [scope, set_scope] = useState<'all' | 'user' | 'agent'>('all')
    const [category, set_category] = useState('fact')
    const [query, set_query] = useState('')
    const [sort_by, set_sort_by] = useState<'RECENCY' | 'IMPORTANCE' | 'RELEVANCE' | 'TEXT_SEARCH' | 'HYBRID'>('HYBRID')
    const [items, set_items] = useState<IMemoryEntry[]>([ ])
    const [detail_memory, set_detail_memory] = useState<IMemoryEntry | null>(null)
    const [editing_memory_id, set_editing_memory_id] = useState('')
    const [form_category, set_form_category] = useState('fact')
    const [form_content, set_form_content] = useState('')
    const [form_importance, set_form_importance] = useState(0.5)
    const [stats, set_stats] = useState<{ totalCount?: number, userScopeCount?: number, agentScopeCount?: number } | null>(null)
    const [loading, set_loading] = useState(false)
    const memory_modal = use_modal()
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
    }, [agent_id])
    
    async function search_memory () {
        if (!selected_agent_id) {
            message.warning(t('请先选择 Agent'))
            return
        }
        set_loading(true)
        try {
            const result = await chat_model.search_memory({
                agentId: selected_agent_id,
                scope: scope === 'all' ? undefined : scope,
                category: category || undefined,
                textQuery: query || undefined,
                topK: 50,
                sortBy: sort_by,
            })
            set_items(result.items)
            set_stats(await chat_model.load_memory_stats(selected_agent_id))
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
                await chat_model.update_memory(editing_memory_id, {
                    category: form_category.trim(),
                    content: form_content.trim(),
                    importance: form_importance,
                })
            else
                await chat_model.store_memory({
                    agentId: selected_agent_id,
                    scope: 'user',
                    category: form_category.trim(),
                    content: form_content.trim(),
                    importance: form_importance,
                    source: 'manual',
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
        set_form_category(category || 'fact')
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
    
    
    async function delete_memory (memory_id: string) {
        if (!memory_id)
            return
        try {
            await chat_model.delete_memory(memory_id)
            message.success(t('删除成功'))
            await search_memory()
        } catch (error) {
            show_error(error, t('删除记忆失败'))
        }
    }
    
    return <Section title={t('记忆')}>
        <Space wrap>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Select
                style={{ width: 110 }}
                value={scope}
                onChange={set_scope}
                options={[
                    { value: 'all', label: t('全部') },
                    { value: 'user', label: t('个人') },
                    { value: 'agent', label: 'Agent' },
                ]}
            />
            <Input style={{ width: 120 }} value={category} onChange={event => { set_category(event.target.value) }} placeholder={t('分类')} />
            <Input.Search style={{ width: 240 }} value={query} onChange={event => { set_query(event.target.value) }} onSearch={search_memory} placeholder={t('搜索记忆')} enterButton={t('搜索')} loading={loading} />
            <Select
                style={{ width: 130 }}
                value={sort_by}
                onChange={set_sort_by}
                options={[
                    { value: 'HYBRID', label: t('综合排序') },
                    { value: 'RECENCY', label: t('最近更新') },
                    { value: 'IMPORTANCE', label: t('重要度') },
                    { value: 'RELEVANCE', label: t('相关度') },
                    { value: 'TEXT_SEARCH', label: t('文本匹配') },
                ]}
            />
            <Button loading={loading} onClick={search_memory}>{t('刷新')}</Button>
            <Button type='primary' onClick={open_create_memory}>{t('新增记忆')}</Button>
        </Space>
        {stats && <Space style={{ marginTop: 12 }} size={24}>
            <Statistic title={t('总记忆')} value={stats.totalCount ?? 0} />
            <Statistic title={t('我的记忆')} value={stats.userScopeCount ?? 0} />
            {model.admin && <Statistic title={t('Agent 记忆')} value={stats.agentScopeCount ?? 0} />}
        </Space>}
        <Table
            style={{ marginTop: 12 }}
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
                    title: t('范围'),
                    dataIndex: 'scope',
                    width: 100,
                    render: (value: string) => <Tag>{value === 'agent' ? t('Agent') : t('个人')}</Tag>,
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
                        <Popconfirm title={t('确定删除这条记忆？')} okButtonProps={{ danger: true }} onConfirm={() => delete_memory(item.memoryId)}>
                            <Button danger size='small'>{t('删除')}</Button>
                        </Popconfirm>
                    </Space>,
                },
            ]}
        />
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
                        { key: 'scope', label: t('范围'), value: detail_memory.scope || '-' },
                        { key: 'category', label: t('分类'), value: detail_memory.category || '-' },
                        { key: 'importance', label: t('重要度'), value: detail_memory.importance ?? '-' },
                        { key: 'source', label: t('来源'), value: detail_memory.source || '-' },
                        { key: 'sourceRef', label: t('来源引用'), value: detail_memory.sourceRef || '-' },
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
            set_usage(await chat_model.load_llm_usage({
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
                await chat_model.load_llm_usage({
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
        return <Section title={t('我的用量')}>
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
        </Section>
    
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
