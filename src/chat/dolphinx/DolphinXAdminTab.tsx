import { useEffect, useMemo, useState } from 'react'

import { Button, Empty, Input, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/chat/model.ts'
import type { IAccessInfo, ILlmConfig, ISession, ISkillInfo, IUserLlmAccessInfo } from '@/chat/model.ts'
import { Section, show_error, use_agent_options, use_user_options } from './common.tsx'
import { UsageSection } from './DolphinXUserTab.tsx'


const { Text } = Typography


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
    const user_options = use_user_options()
    const [skills, set_skills] = useState<ISkillInfo[]>([ ])
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
        load_denied().catch(error => { show_error(error, t('加载禁用技能失败')) })
    }, [selected_user_id])
    
    async function load_denied () {
        if (!selected_user_id) {
            set_denied_skill_ids([ ])
            return
        }
        const result = await chat_model.load_denied_user_skills(selected_user_id)
        set_denied_skill_ids(result.skillIds)
    }
    
    
    async function allow (skill_id: string) {
        const result = await chat_model.allow_user_skill(skill_id, selected_user_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已允许'))
    }
    
    
    async function deny (skill_id: string) {
        const result = await chat_model.deny_user_skill(skill_id, selected_user_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已禁用'))
    }
    
    return <Section title={t('用户技能权限')}>
        {!user_id && <Space wrap style={{ marginBottom: 12 }}>
            <Select showSearch style={{ width: 180 }} placeholder={t('选择用户')} value={selected_user_id || undefined} onChange={set_selected_user_id} options={user_options} />
        </Space>}
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
                        ? <Button size='small' disabled={!selected_user_id} onClick={() => { allow(skill.skillId) }}>{t('允许')}</Button>
                        : <Button danger size='small' disabled={!selected_user_id} onClick={() => { deny(skill.skillId) }}>{t('禁用')}</Button>,
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
        const result = await chat_model.list_sessions({
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
            set_preview(await chat_model.preview_context({
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
            {
                key: 'context',
                label: t('上下文预览'),
                children: <ContextPreviewSection />,
            },
        ]}
    />
}
