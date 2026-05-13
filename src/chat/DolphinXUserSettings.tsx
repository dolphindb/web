import { useEffect, useMemo, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Card, Empty, Input, InputNumber, Modal, Popconfirm, Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { access } from '@/access/model.ts'

import { chat_model } from './model.ts'
import type { IAccessInfo, ILlmConfig, ILlmUsageStats, IMemoryEntry, ISession, ISkillInfo, IUserLlmAccessInfo } from './model.ts'


const { Text } = Typography


function show_error (error: unknown, fallback: string) {
    message.error(error instanceof Error ? error.message : fallback)
}


function Section ({ title, children }: { title: string, children: React.ReactNode }) {
    return <Card size='small' title={title} style={{ marginBottom: 12 }}>
        {children}
    </Card>
}


function use_agent_options () {
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


function use_user_options () {
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


function SessionSection () {
    const { agent_id, options } = use_agent_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [status, set_status] = useState(0)
    const [sessions, set_sessions] = useState<ISession[]>([ ])
    const [summary_session, set_summary_session] = useState<ISession | null>(null)
    const [summary_instructions, set_summary_instructions] = useState('')
    const [force_summary, set_force_summary] = useState(false)
    const [summary, set_summary] = useState('')
    const [loading, set_loading] = useState(false)
    const summary_modal = use_modal()
    
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
                status,
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
    }, [selected_agent_id, status])
    
    async function archive_session (session_id: string) {
        if (!session_id)
            return
        try {
            await chat_model.archive_session(session_id)
            message.success(t('已归档'))
            await load_sessions()
        } catch (error) {
            show_error(error, t('归档失败'))
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
    
    return <Section title={t('会话')}>
        <Space wrap>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            <Select
                style={{ width: 120 }}
                value={status}
                onChange={set_status}
                options={[
                    { value: 0, label: t('活跃') },
                    { value: 1, label: t('已归档') },
                    { value: -1, label: t('全部') },
                ]}
            />
            <Button loading={loading} onClick={load_sessions}>{t('刷新')}</Button>
        </Space>
        
        <Table
            style={{ marginTop: 12 }}
            size='small'
            rowKey='sessionId'
            loading={loading}
            dataSource={sessions}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无会话')} /> }}
            columns={[
                {
                    title: t('标题'),
                    dataIndex: 'title',
                    render: (value: string) => <Text ellipsis style={{ maxWidth: 320 }}>{value}</Text>,
                },
                {
                    title: t('状态'),
                    width: 100,
                    render: (_: unknown, session: ISession) => <Tag>{session.statusName || session.status}</Tag>,
                },
                {
                    title: t('更新时间'),
                    dataIndex: 'updateTime',
                    width: 180,
                    render: (value: string) => value || '-',
                },
                {
                    title: t('操作'),
                    width: 180,
                    render: (_: unknown, session: ISession) => <Space>
                        <Button size='small' onClick={() => { open_summary_modal(session) }}>{t('生成摘要')}</Button>
                        <Popconfirm title={t('归档后不可继续在该会话中发送消息，确定归档？')} onConfirm={() => archive_session(session.sessionId)}>
                            <Button size='small' disabled={session.status === 1}>{t('归档')}</Button>
                        </Popconfirm>
                    </Space>,
                },
            ]}
        />
        
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
    const [category, set_category] = useState('fact')
    const [query, set_query] = useState('')
    const [items, set_items] = useState<IMemoryEntry[]>([ ])
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
                category: category || undefined,
                textQuery: query || undefined,
                topK: 50,
                sortBy: 'HYBRID',
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
            <Input style={{ width: 120 }} value={category} onChange={event => { set_category(event.target.value) }} placeholder={t('分类')} />
            <Input.Search style={{ width: 240 }} value={query} onChange={event => { set_query(event.target.value) }} onSearch={search_memory} placeholder={t('搜索记忆')} enterButton={t('搜索')} loading={loading} />
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
                    title: t('内容'),
                    dataIndex: 'content',
                    render: (value: string) => <Text ellipsis style={{ maxWidth: 420 }}>{value}</Text>,
                },
                {
                    title: t('操作'),
                    width: 150,
                    render: (_: unknown, item: IMemoryEntry) => <Space>
                        <Button size='small' onClick={() => { open_edit_memory(item) }}>{t('编辑')}</Button>
                        <Popconfirm title={t('确定删除这条记忆？')} onConfirm={() => delete_memory(item.memoryId)}>
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
    </Section>
}


function UsageSection ({ admin = false }: { admin?: boolean }) {
    const { agent_id, options } = use_agent_options()
    const { username } = model.use(['username'])
    const user_options = use_user_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [usage, set_usage] = useState<ILlmUsageStats | null>(null)
    const [usage_by_user, set_usage_by_user] = useState<Record<string, ILlmUsageStats>>({ })
    const [loading_usage, set_loading_usage] = useState(false)
    const user_ids_key = user_options.map(user => user.value).join('\n')
    
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
            <Table<{ agentId: string, userId: string, usage: ILlmUsageStats | null }>
                style={{ marginTop: 12 }}
                size='small'
                rowKey='agentId'
                loading={loading_usage}
                dataSource={selected_agent_id ? [{ agentId: selected_agent_id, userId: usage?.userId || username, usage }] : [ ]}
                pagination={false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用量')} /> }}
                columns={[
                    {
                        title: t('用户'),
                        dataIndex: 'userId',
                    },
                    {
                        title: 'Agent',
                        dataIndex: 'agentId',
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
            dataSource={user_options.map(user => ({ ...user, usage: usage_by_user[user.value] }))}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} /> }}
            columns={[
                {
                    title: t('用户'),
                    dataIndex: 'label',
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


function AdminAccessSection ({ user_id }: { user_id?: string }) {
    const { options } = use_agent_options()
    const user_options = use_user_options()
    
    const [selected_user_id, set_selected_user_id] = useState(user_id || '')
    const [agent_auth_map, set_agent_auth_map] = useState<Record<string, IAccessInfo | undefined>>({ })
    const [loading, set_loading] = useState(false)
    const agent_ids_key = options.map(agent => agent.value).join('\n')
    
    async function load_agent_auth () {
        if (!selected_user_id || options.length === 0) {
            set_agent_auth_map({ })
            return
        }
        set_loading(true)
        try {
            const entries = await Promise.all(options.map(async agent => {
                const auth_list = await chat_model.load_agent_auth(agent.value)
                return [agent.value, auth_list.find(item => item.userId === selected_user_id)] as const
            }))
            set_agent_auth_map(Object.fromEntries(entries))
        } catch (error) {
            show_error(error, t('加载 Agent 授权失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (user_id)
            set_selected_user_id(user_id)
    }, [user_id])
    
    useEffect(() => {
        load_agent_auth()
    }, [agent_ids_key, selected_user_id])
    
    async function grant (agent_id: string) {
        const auth_list = await chat_model.grant_agent_auth(agent_id, selected_user_id)
        set_agent_auth_map(map => ({
            ...map,
            [agent_id]: auth_list.find(item => item.userId === selected_user_id),
        }))
        message.success(t('已授权'))
    }
    
    
    async function revoke (agent_id: string) {
        const auth_list = await chat_model.revoke_agent_auth(agent_id, selected_user_id)
        set_agent_auth_map(map => ({
            ...map,
            [agent_id]: auth_list.find(item => item.userId === selected_user_id),
        }))
        message.success(t('已撤销'))
    }
    
    return <Section title={t('Agent 权限')}>
        {!user_id && <Select showSearch style={{ width: 180, marginBottom: 12 }} placeholder={t('选择用户')} value={selected_user_id || undefined} onChange={set_selected_user_id} options={user_options} />}
        <Table
            size='small'
            rowKey='value'
            loading={loading}
            dataSource={options}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无 Agent')} /> }}
            columns={[
                {
                    title: 'Agent',
                    dataIndex: 'label',
                },
                {
                    title: t('权限'),
                    width: 120,
                    render: (_: unknown, agent: { value: string }) => {
                        const auth = agent_auth_map[agent.value]
                        if (!auth)
                            return <Tag>{t('未授权')}</Tag>
                        return <Tag color='blue'>{t('已授权')}</Tag>
                    },
                },
                {
                    title: t('操作'),
                    width: 160,
                    render: (_: unknown, agent: { value: string }) => {
                        const auth = agent_auth_map[agent.value]
                        return <Space wrap>
                            {!auth && <Button size='small' disabled={!selected_user_id} onClick={() => { grant(agent.value) }}>{t('授权访问')}</Button>}
                            {auth && <Button danger size='small' disabled={!selected_user_id} onClick={() => { revoke(agent.value) }}>{t('撤销')}</Button>}
                        </Space>
                    },
                },
            ]}
        />
    </Section>
}


function UserLlmSection ({ user_id }: { user_id?: string }) {
    const user_options = use_user_options()
    const [configs, set_configs] = useState<ILlmConfig[]>([ ])
    const [selected_user_id, set_selected_user_id] = useState(user_id || '')
    const [items, set_items] = useState<IUserLlmAccessInfo[]>([ ])
    
    useEffect(() => {
        chat_model.load_llm_configs()
            .then(set_configs)
            .catch(error => { show_error(error, t('加载模型配置失败')) })
    }, [ ])
    
    useEffect(() => {
        if (user_id) {
            set_selected_user_id(user_id)
            chat_model.load_user_llm_access(user_id)
                .then(set_items)
                .catch(error => { show_error(error, t('加载用户 LLM 授权失败')) })
        }
    }, [user_id])
    
    const visible_configs = useMemo(
        () => configs.filter(config => config.statusName !== 'DELETED'),
        [configs]
    )
    
    useEffect(() => {
        if (selected_user_id)
            load().catch(error => { show_error(error, t('加载用户 LLM 授权失败')) })
    }, [selected_user_id])
    
    async function load () {
        if (!selected_user_id)
            return
        set_items(await chat_model.load_user_llm_access(selected_user_id))
    }
    
    async function grant (llm_config_id: string) {
        set_items(await chat_model.grant_user_llm_access(selected_user_id, llm_config_id))
        message.success(t('已授权'))
    }
    
    
    async function revoke (llm_config_id: string) {
        set_items(await chat_model.revoke_user_llm_access(selected_user_id, llm_config_id))
        message.success(t('已撤销'))
    }
    
    return <Section title={t('用户模型权限')}>
        {!user_id && <Space wrap style={{ marginBottom: 12 }}>
            {!user_id && <Select showSearch style={{ width: 180 }} placeholder={t('选择用户')} value={selected_user_id || undefined} onChange={set_selected_user_id} options={user_options} />}
        </Space>}
        <Table
            size='small'
            rowKey='llmConfigId'
            dataSource={visible_configs}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无模型')} /> }}
            columns={[
                {
                    title: t('模型'),
                    dataIndex: 'name',
                    render: (_: unknown, config: ILlmConfig) => <div>
                        <div>{config.name}</div>
                        <Text type='secondary'>{config.model}</Text>
                    </div>,
                },
                {
                    title: t('Provider'),
                    dataIndex: 'providerName',
                    render: (value: string) => value || '-',
                },
                {
                    title: t('状态'),
                    render: (_: unknown, config: ILlmConfig) => items.some(item => item.llmConfigId === config.llmConfigId)
                        ? <Tag color='green'>{t('已授权')}</Tag>
                        : <Tag>{t('未授权')}</Tag>,
                },
                {
                    title: t('操作'),
                    width: 120,
                    render: (_: unknown, config: ILlmConfig) => items.some(item => item.llmConfigId === config.llmConfigId)
                        ? <Button danger size='small' disabled={!selected_user_id} onClick={() => { revoke(config.llmConfigId) }}>{t('撤销')}</Button>
                        : <Button size='small' disabled={!selected_user_id} onClick={() => { grant(config.llmConfigId) }}>{t('授权')}</Button>,
                },
            ]}
        />
    </Section>
}


function SkillAccessSection ({ user_id }: { user_id?: string }) {
    const { agent_id, options } = use_agent_options()
    const user_options = use_user_options()
    const [skills, set_skills] = useState<ISkillInfo[]>([ ])
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [selected_user_id, set_selected_user_id] = useState(user_id || '')
    const [denied_skill_ids, set_denied_skill_ids] = useState<string[]>([ ])
    
    useEffect(() => {
        chat_model.load_skills()
            .then(set_skills)
            .catch(error => { show_error(error, t('加载技能失败')) })
    }, [ ])
    
    useEffect(() => {
        if (user_id)
            set_selected_user_id(user_id)
    }, [user_id])
    
    useEffect(() => {
        if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [options, selected_agent_id])
    
    useEffect(() => {
        load_denied().catch(error => { show_error(error, t('加载禁用技能失败')) })
    }, [selected_agent_id, selected_user_id])
    
    async function load_denied () {
        if (!selected_agent_id || !selected_user_id)
            return
        const result = await chat_model.load_denied_user_skills(selected_agent_id, selected_user_id)
        set_denied_skill_ids(result.skillIds)
    }
    
    
    async function allow (skill_id: string) {
        const result = await chat_model.allow_user_skill(selected_agent_id, skill_id, selected_user_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已允许'))
    }
    
    
    async function deny (skill_id: string) {
        const result = await chat_model.deny_user_skill(selected_agent_id, skill_id, selected_user_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已禁用'))
    }
    
    return <Section title={t('用户技能权限')}>
        <Space wrap style={{ marginBottom: 12 }}>
            <Select style={{ width: 240 }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
            {!user_id && <Select showSearch style={{ width: 180 }} placeholder={t('选择用户')} value={selected_user_id || undefined} onChange={set_selected_user_id} options={user_options} />}
        </Space>
        <Table
            size='small'
            rowKey='skillId'
            dataSource={skills}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无技能')} /> }}
            columns={[
                {
                    title: t('技能'),
                    render: (_: unknown, skill: ISkillInfo) => <div>
                        <div>{skill.displayName || skill.name || skill.skillId}</div>
                        {skill.description && <Text type='secondary'>{skill.description}</Text>}
                    </div>,
                },
                {
                    title: t('状态'),
                    width: 120,
                    render: (_: unknown, skill: ISkillInfo) => denied_skill_ids.includes(skill.skillId)
                        ? <Tag color='red'>{t('已禁用')}</Tag>
                        : <Tag color='green'>{t('允许使用')}</Tag>,
                },
                {
                    title: t('操作'),
                    width: 120,
                    render: (_: unknown, skill: ISkillInfo) => denied_skill_ids.includes(skill.skillId)
                        ? <Button size='small' disabled={!selected_agent_id || !selected_user_id} onClick={() => { allow(skill.skillId) }}>{t('允许')}</Button>
                        : <Button danger size='small' disabled={!selected_agent_id || !selected_user_id} onClick={() => { deny(skill.skillId) }}>{t('禁用')}</Button>,
                },
            ]}
        />
    </Section>
}


function UserPermissionTab () {
    const user_options = use_user_options()
    const [selected_user_id, set_selected_user_id] = useState('')
    
    useEffect(() => {
        if (!selected_user_id && user_options.length > 0)
            set_selected_user_id(user_options[0].value)
    }, [user_options, selected_user_id])
    
    return <div style={{ display: 'flex', gap: 12, minHeight: 520 }}>
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', paddingRight: 12, overflow: 'auto' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{t('用户')}</div>
            {user_options.length === 0
                ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} />
                : user_options.map(user =>
                    <div
                        key={user.value}
                        onClick={() => { set_selected_user_id(user.value) }}
                        style={{
                            padding: '8px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginBottom: 4,
                            background: selected_user_id === user.value ? '#e6f4ff' : undefined,
                        }}
                    >
                        {user.label}
                    </div>
                )}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            {selected_user_id
                ? <>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                        {t('正在编辑用户：{{user}}', { user: selected_user_id })}
                    </div>
                    <AdminAccessSection user_id={selected_user_id} />
                    <UserLlmSection user_id={selected_user_id} />
                    <SkillAccessSection user_id={selected_user_id} />
                </>
                : <Empty description={t('请选择用户')} />}
        </div>
    </div>
}


export function DolphinXAdminTab () {
    if (!model.admin)
        return <Empty description={t('仅管理员可访问')} />
    
    return <Tabs
        destroyInactiveTabPane
        items={[
            {
                key: 'users',
                label: t('用户权限'),
                children: <UserPermissionTab />,
            },
            {
                key: 'usage',
                label: t('用量'),
                children: <UsageSection admin />,
            },
        ]}
    />
}
