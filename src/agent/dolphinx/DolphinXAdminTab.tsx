import { useEffect, useMemo, useState } from 'react'

import { Button, Empty, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from '@/agent/model.ts'
import type { IAccessInfo, ILlmConfig, ISkillInfo, IUserLlmAccessInfo } from '@/agent/model.ts'
import { Section, show_error, use_agent_options, use_user_options } from './common.tsx'
import { UsageSection } from './DolphinXUserTab.tsx'


const { Text } = Typography


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
    
    return <div style={{ display: 'flex', gap: 12, height: 520, minHeight: 0 }}>
        <div style={{ width: 220, borderRight: '1px solid #f0f0f0', paddingRight: 12, overflow: 'auto', minHeight: 0 }}>
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
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
            {selected_user_id
                ? <>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                        {t('正在编辑用户：{{user}}', { user: selected_user_id })}
                    </div>
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
