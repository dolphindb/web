import { useEffect, useMemo, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Modal, Pagination, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/agent/model.ts'
import type { IAccessInfo, ILlmConfig, ISkillInfo, IUserLlmAccessInfo } from '@/agent/model.ts'
import { Section, show_error, use_agent_options, use_user_options } from './common.tsx'
import { UsageSection } from './DolphinXUserTab.tsx'


const { Paragraph, Text } = Typography


function GlobalAgentAdminSection ({ user_id }: { user_id?: string }) {
    const user_options = use_user_options()
    
    const [selected_user_id, set_selected_user_id] = useState(user_id || '')
    const [items, set_items] = useState<IAccessInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    
    async function load () {
        set_loading(true)
        try {
            set_items(await chat_model.agent.load_global_agent_admins())
        } catch (error) {
            show_error(error, t('加载 Agent 管理权限失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (user_id)
            set_selected_user_id(user_id)
    }, [user_id])
    
    useEffect(() => {
        load()
    }, [ ])
    
    const authorized = items.some(item => item.userId === selected_user_id)
    
    async function grant () {
        set_items(await chat_model.agent.grant_global_agent_admin(selected_user_id))
        message.success(t('已授予 Agent 管理权限'))
    }
    
    
    async function revoke () {
        set_items(await chat_model.agent.revoke_global_agent_admin(selected_user_id))
        message.success(t('已撤销 Agent 管理权限'))
    }
    
    return <Section title={t('Agent 管理权限')}>
        {!user_id && <Select showSearch style={{ width: 180, marginBottom: 12 }} placeholder={t('选择用户')} value={selected_user_id || undefined} onChange={set_selected_user_id} options={user_options} />}
        <Space wrap>
            <Tag color={authorized ? 'green' : undefined}>{authorized ? t('已授权管理 Agent') : t('未授权管理 Agent')}</Tag>
            {authorized
                ? <Button danger size='small' loading={loading} disabled={!selected_user_id} onClick={revoke}>{t('撤销管理权限')}</Button>
                : <Button size='small' loading={loading} disabled={!selected_user_id} onClick={grant}>{t('授权管理 Agent')}</Button>}
        </Space>
    </Section>
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
                const auth_list = await chat_model.agent.load_agent_auth(agent.value)
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
        const auth_list = await chat_model.agent.grant_agent_auth(agent_id, selected_user_id)
        set_agent_auth_map(map => ({
            ...map,
            [agent_id]: auth_list.find(item => item.userId === selected_user_id),
        }))
        message.success(t('已授权'))
    }
    
    
    async function revoke (agent_id: string) {
        const auth_list = await chat_model.agent.revoke_agent_auth(agent_id, selected_user_id)
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
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无 Agent')} /> }}
            columns={[
                {
                    title: 'Agent',
                    dataIndex: 'label',
                    render: (value: string) => <Text title={value} style={{ display: 'block', maxWidth: '100%' }} ellipsis>{value}</Text>,
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
        chat_model.llm.load_llm_providers()
            .then(providers => chat_model.llm.load_llm_configs(new Map(providers.map(provider => [provider.providerId, provider]))))
            .then(set_configs)
            .catch(error => { show_error(error, t('加载模型配置失败')) })
    }, [ ])
    
    useEffect(() => {
        if (user_id) {
            set_selected_user_id(user_id)
            chat_model.llm.load_user_llm_access(user_id)
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
        set_items(await chat_model.llm.load_user_llm_access(selected_user_id))
    }
    
    async function grant (llm_config_id: string) {
        set_items(await chat_model.llm.grant_user_llm_access(selected_user_id, llm_config_id))
        message.success(t('已授权'))
    }
    
    
    async function revoke (llm_config_id: string) {
        set_items(await chat_model.llm.revoke_user_llm_access(selected_user_id, llm_config_id))
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
            tableLayout='fixed'
            scroll={{ x: 740 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无模型')} /> }}
            columns={[
                {
                    title: t('模型'),
                    dataIndex: 'name',
                    render: (_: unknown, config: ILlmConfig) => <div style={{ minWidth: 0 }}>
                        <Text title={config.name} style={{ display: 'block', maxWidth: '100%' }} ellipsis>{config.name}</Text>
                        <Text type='secondary' title={config.model} style={{ display: 'block', maxWidth: '100%' }} ellipsis>
                            {config.model}
                        </Text>
                    </div>,
                },
                {
                    title: t('Provider'),
                    dataIndex: 'providerName',
                    width: 160,
                    render: (value: string) => value
                        ? <Text title={value} style={{ display: 'block', maxWidth: '100%' }} ellipsis>{value}</Text>
                        : '-',
                },
                {
                    title: t('状态'),
                    width: 130,
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
        chat_model.skill.load_skills()
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
        const result = await chat_model.skill.load_denied_user_skills(selected_user_id)
        set_denied_skill_ids(result.skillIds)
    }
    
    
    async function allow (skill_id: string) {
        const result = await chat_model.skill.allow_user_skill(skill_id, selected_user_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已允许'))
    }
    
    
    async function deny (skill_id: string) {
        const result = await chat_model.skill.deny_user_skill(skill_id, selected_user_id)
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
            tableLayout='fixed'
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无技能')} /> }}
            columns={[
                {
                    title: t('技能'),
                    render: (_: unknown, skill: ISkillInfo) => <div style={{ minWidth: 0 }}>
                        <Text title={skill.displayName || skill.name || skill.skillId} style={{ display: 'block', maxWidth: '100%' }} ellipsis>
                            {skill.displayName || skill.name || skill.skillId}
                        </Text>
                        {skill.description && <Paragraph
                            type='secondary'
                            style={{ margin: 0, wordBreak: 'break-word' }}
                            ellipsis={{ rows: 3, tooltip: skill.description }}
                        >
                            {skill.description}
                        </Paragraph>}
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


function ResetUserMemorySection ({ user_id }: { user_id?: string }) {
    const { agent_id, options } = use_agent_options()
    
    const [selected_agent_id, set_selected_agent_id] = useState(agent_id)
    const [include_memories, set_include_memories] = useState(true)
    const [include_stage1, set_include_stage1] = useState(true)
    const [loading, set_loading] = useState(false)
    const [trigger_loading, set_trigger_loading] = useState(false)
    const reset_modal = use_modal()
    
    useEffect(() => {
        if (!selected_agent_id && agent_id)
            set_selected_agent_id(agent_id)
        else if (!selected_agent_id && options.length > 0)
            set_selected_agent_id(options[0].value)
    }, [agent_id, options.length, selected_agent_id])
    
    async function reset_memory () {
        if (!selected_agent_id || !user_id) {
            message.warning(t('请先选择 Agent 和用户'))
            return
        }
        set_loading(true)
        try {
            const result = await chat_model.memory.reset_user_personal_memory(selected_agent_id, user_id, include_memories, include_stage1)
            message.success(t('已重置用户个人记忆，移除 {{count}} 条记忆', { count: result.removedMemoryCount ?? 0 }))
            reset_modal.close()
        } catch (error) {
            show_error(error, t('重置用户个人记忆失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function trigger_user_memory () {
        if (!selected_agent_id || !user_id) {
            message.warning(t('请先选择 Agent 和用户'))
            return
        }
        set_trigger_loading(true)
        try {
            await chat_model.memory.trigger_memory_pipeline({ agentId: selected_agent_id, targetUserId: user_id })
            message.success(t('记忆任务已触发'))
        } catch (error) {
            show_error(error, t('触发记忆任务失败'))
        } finally {
            set_trigger_loading(false)
        }
    }
    
    return <Section title={t('用户记忆维护')}>
        <Space wrap>
            <Button loading={trigger_loading} onClick={trigger_user_memory}>{t('触发记忆整理')}</Button>
            <Button danger onClick={reset_modal.open}>{t('重置记忆')}</Button>
        </Space>
        <Modal
            title={t('重置用户个人记忆')}
            open={reset_modal.visible}
            onCancel={reset_modal.close}
            onOk={reset_memory}
            confirmLoading={loading}
            okButtonProps={{ danger: true }}
            okText={t('重置')}
        >
            <Space direction='vertical' style={{ width: '100%' }}>
                <Select style={{ width: '100%' }} placeholder={t('选择 Agent')} value={selected_agent_id || undefined} onChange={set_selected_agent_id} options={options} />
                <Space>
                    <Switch checked={include_memories} onChange={set_include_memories} />
                    <span>{t('移除个人记忆')}</span>
                </Space>
                <Space>
                    <Switch checked={include_stage1} onChange={set_include_stage1} />
                    <span>{t('清除中间记忆结果')}</span>
                </Space>
            </Space>
        </Modal>
    </Section>
}


function UserPermissionTab () {
    const user_options = use_user_options()
    const [selected_user_id, set_selected_user_id] = useState('')
    const [user_page, set_user_page] = useState(1)
    const user_page_size = 10
    const paged_user_options = user_options.slice((user_page - 1) * user_page_size, user_page * user_page_size)
    
    useEffect(() => {
        if (!selected_user_id && user_options.length > 0)
            set_selected_user_id(user_options[0].value)
    }, [user_options, selected_user_id])
    
    useEffect(() => {
        const max_page = Math.max(1, Math.ceil(user_options.length / user_page_size))
        if (user_page > max_page)
            set_user_page(max_page)
    }, [user_options.length, user_page])
    
    return <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', paddingRight: 12, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>{t('用户')}</div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {user_options.length === 0
                    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无用户')} />
                    : paged_user_options.map(user =>
                        <div
                            key={user.value}
                            onClick={() => { set_selected_user_id(user.value) }}
                            title={user.label}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                marginBottom: 4,
                                background: selected_user_id === user.value ? '#e6f4ff' : undefined,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {user.label}
                        </div>
                    )}
            </div>
            {user_options.length > user_page_size && <Pagination
                size='small'
                simple
                current={user_page}
                pageSize={user_page_size}
                total={user_options.length}
                onChange={set_user_page}
                style={{ marginTop: 8 }}
            />}
        </div>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
            {selected_user_id
                ? <>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                        {t('正在编辑用户：{{user}}', { user: selected_user_id })}
                    </div>
                    <ResetUserMemorySection user_id={selected_user_id} />
                    <GlobalAgentAdminSection user_id={selected_user_id} />
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
        className='ai-settings-tabs'
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
