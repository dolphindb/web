import { useEffect, useMemo, useState } from 'react'
import { use_modal } from 'react-object-model/hooks.js'

import { Button, Empty, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import { access } from '@/access/model.ts'

import { chat_model } from '@/agent/model.ts'
import type { AgentAuthSubjectType, IAccessInfo, ILlmConfig, ISkillInfo, IUserLlmAccessInfo } from '@/agent/model/types.ts'
import { ENABLE_AGENT_GROUP_AUTH } from '@/agent/model/constants.ts'
import { Section, SettingsListLayout, show_error, use_agent_options, use_valid_agent_selection } from './common.tsx'


const { Paragraph, Text } = Typography


function GlobalAgentAdminSection ({ subject_type, subject_id }: { subject_type: AgentAuthSubjectType, subject_id: string }) {
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
        load()
    }, [subject_type, subject_id])
    
    const authorized = items.some(item => item.subjectType === subject_type && item.subjectId === subject_id)
    
    async function grant () {
        set_loading(true)
        try {
            set_items(await chat_model.agent.grant_global_agent_admin(subject_type, subject_id))
            message.success(t('已授予 Agent 管理权限'))
        } catch (error) {
            show_error(error, t('授予 Agent 管理权限失败'))
        } finally {
            set_loading(false)
        }
    }
    
    
    async function revoke () {
        set_loading(true)
        try {
            set_items(await chat_model.agent.revoke_global_agent_admin(subject_type, subject_id))
            message.success(t('已撤销 Agent 管理权限'))
        } catch (error) {
            show_error(error, t('撤销 Agent 管理权限失败'))
        } finally {
            set_loading(false)
        }
    }
    
    return <Section title={t('Agent 管理权限')}>
        <Space wrap>
            <Tag color={authorized ? 'green' : undefined}>{authorized ? t('已授权管理 Agent') : t('未授权管理 Agent')}</Tag>
            {authorized
                ? <Button danger size='small' loading={loading} disabled={!subject_id} onClick={revoke}>{t('撤销管理权限')}</Button>
                : <Button size='small' loading={loading} disabled={!subject_id} onClick={grant}>{t('授权管理 Agent')}</Button>}
        </Space>
    </Section>
}


function AgentAccessSection ({ subject_type, subject_id }: { subject_type: AgentAuthSubjectType, subject_id: string }) {
    const { options } = use_agent_options()
    const [agent_auth_map, set_agent_auth_map] = useState<Record<string, IAccessInfo | undefined>>({ })
    const [loading, set_loading] = useState(false)
    const agent_ids_key = options.map(agent => agent.value).join('\n')
    
    async function load_agent_auth () {
        if (!subject_id || options.length === 0) {
            set_agent_auth_map({ })
            return
        }
        set_loading(true)
        try {
            const entries = await Promise.all(options.map(async agent => {
                const auth_list = await chat_model.agent.load_agent_auth(agent.value)
                return [agent.value, auth_list.find(item => item.subjectType === subject_type && item.subjectId === subject_id)] as const
            }))
            set_agent_auth_map(Object.fromEntries(entries))
        } catch (error) {
            show_error(error, t('加载 Agent 授权失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        load_agent_auth()
    }, [agent_ids_key, subject_type, subject_id])
    
    async function grant (agent_id: string) {
        const auth_list = await chat_model.agent.grant_agent_auth(agent_id, subject_type, subject_id)
        set_agent_auth_map(map => ({
            ...map,
            [agent_id]: auth_list.find(item => item.subjectType === subject_type && item.subjectId === subject_id),
        }))
        message.success(t('已授权'))
    }
    
    
    async function revoke (agent_id: string) {
        const auth_list = await chat_model.agent.revoke_agent_auth(agent_id, subject_type, subject_id)
        set_agent_auth_map(map => ({
            ...map,
            [agent_id]: auth_list.find(item => item.subjectType === subject_type && item.subjectId === subject_id),
        }))
        message.success(t('已撤销'))
    }
    
    return <Section title={t('Agent 权限')}>
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
                    title: t('状态'),
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
                            {!auth && <Button size='small' disabled={!subject_id} onClick={() => { grant(agent.value) }}>{t('授权')}</Button>}
                            {auth && <Button danger size='small' disabled={!subject_id} onClick={() => { revoke(agent.value) }}>{t('撤销')}</Button>}
                        </Space>
                    },
                },
            ]}
        />
    </Section>
}


function LlmAccessSection ({ subject_type, subject_id }: { subject_type: AgentAuthSubjectType, subject_id: string }) {
    const [configs, set_configs] = useState<ILlmConfig[]>([ ])
    const [items, set_items] = useState<IUserLlmAccessInfo[]>([ ])
    const load_error = subject_type === 'USER' ? t('加载用户 LLM 授权失败') : t('加载用户组 LLM 授权失败')
    
    useEffect(() => {
        chat_model.llm.load_llm_providers()
            .then(providers => chat_model.llm.load_llm_configs(new Map(providers.map(provider => [provider.providerId, provider]))))
            .then(set_configs)
            .catch(error => { show_error(error, t('加载模型配置失败')) })
    }, [ ])
    
    const visible_configs = useMemo(
        () => configs.filter(config => config.statusName !== 'DELETED'),
        [configs]
    )
    
    useEffect(() => {
        if (!subject_id) {
            set_items([ ])
            return
        }
        load().catch(error => { show_error(error, load_error) })
    }, [subject_type, subject_id])
    
    async function load () {
        set_items(await chat_model.llm.load_subject_llm_access(subject_type, subject_id))
    }
    
    async function grant (llm_config_id: string) {
        set_items(await chat_model.llm.grant_subject_llm_access(subject_type, subject_id, llm_config_id))
        message.success(t('已授权'))
    }
    
    
    async function revoke (llm_config_id: string) {
        set_items(await chat_model.llm.revoke_subject_llm_access(subject_type, subject_id, llm_config_id))
        message.success(t('已撤销'))
    }
    
    return <Section title={subject_type === 'USER' ? t('用户模型权限') : t('用户组模型权限')}>
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
                        ? <Button danger size='small' disabled={!subject_id} onClick={() => { revoke(config.llmConfigId) }}>{t('撤销')}</Button>
                        : <Button size='small' disabled={!subject_id} onClick={() => { grant(config.llmConfigId) }}>{t('授权')}</Button>,
                },
            ]}
        />
    </Section>
}


function SkillAccessSection ({ subject_type, subject_id }: { subject_type: AgentAuthSubjectType, subject_id: string }) {
    const [skills, set_skills] = useState<ISkillInfo[]>([ ])
    const [denied_skill_ids, set_denied_skill_ids] = useState<string[]>([ ])
    
    useEffect(() => {
        chat_model.skill.load_skills()
            .then(set_skills)
            .catch(error => { show_error(error, t('加载技能失败')) })
    }, [ ])
    
    useEffect(() => {
        load_denied().catch(error => { show_error(error, t('加载禁用技能失败')) })
    }, [subject_type, subject_id])
    
    async function load_denied () {
        if (!subject_id) {
            set_denied_skill_ids([ ])
            return
        }
        const result = await chat_model.skill.load_denied_subject_skills(subject_type, subject_id)
        set_denied_skill_ids(result.skillIds)
    }
    
    
    async function allow (skill_id: string) {
        const result = await chat_model.skill.allow_subject_skill(skill_id, subject_type, subject_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已允许'))
    }
    
    
    async function deny (skill_id: string) {
        const result = await chat_model.skill.deny_subject_skill(skill_id, subject_type, subject_id)
        set_denied_skill_ids(result.skillIds || [ ])
        message.success(t('已禁用'))
    }
    
    return <Section title={subject_type === 'USER' ? t('用户技能权限') : t('用户组技能权限')}>
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
                        ? <Button size='small' disabled={!subject_id} onClick={() => { allow(skill.skillId) }}>{t('允许')}</Button>
                        : <Button danger size='small' disabled={!subject_id} onClick={() => { deny(skill.skillId) }}>{t('禁用')}</Button>,
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
    use_valid_agent_selection(options, selected_agent_id, set_selected_agent_id, agent_id)
    
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
                    <Switch className='ai-settings-switch-medium' checked={include_memories} onChange={set_include_memories} />
                    <span>{t('移除个人记忆')}</span>
                </Space>
                <Space>
                    <Switch className='ai-settings-switch-medium' checked={include_stage1} onChange={set_include_stage1} />
                    <span>{t('清除中间记忆结果')}</span>
                </Space>
            </Space>
        </Modal>
    </Section>
}


export function UserPermissionTab () {
    const [user_options, set_user_options] = useState<{ value: string, label: string }[]>([ ])
    const [user_admin_map, set_user_admin_map] = useState<Record<string, boolean>>({ })
    const [selected_user_id, set_selected_user_id] = useState('')
    
    useEffect(() => {
        access.get_user_list()
            .then(async users => {
                const user_ids = users.includes('admin') ? users : ['admin', ...users]
                const accesses = await access.get_user_access(users)
                set_user_admin_map({
                    ...Object.fromEntries(accesses.map(user => [user.userId, Boolean(user.isAdmin)])),
                    admin: true,
                })
                set_user_options(user_ids.map(user => ({ value: user, label: user })))
            })
            .catch(error => { show_error(error, t('加载用户失败')) })
    }, [ ])
    
    return <SettingsListLayout
        title={t('用户权限')}
        list_subtitle={t('选择需要管理的用户')}
        options={user_options}
        selected_id={selected_user_id}
        set_selected_id={set_selected_user_id}
        empty_description={t('暂无用户')}
        select_description={t('请选择用户')}
    >
        <div style={{ fontWeight: 500, marginBottom: 12 }}>
            {t('正在编辑用户：{{user}}', { user: selected_user_id })}
        </div>
        <ResetUserMemorySection user_id={selected_user_id} />
        {!user_admin_map[selected_user_id] && <>
            <GlobalAgentAdminSection subject_type='USER' subject_id={selected_user_id} />
            <AgentAccessSection subject_type='USER' subject_id={selected_user_id} />
            <LlmAccessSection subject_type='USER' subject_id={selected_user_id} />
            <SkillAccessSection subject_type='USER' subject_id={selected_user_id} />
        </>}
    </SettingsListLayout>
}


export function GroupPermissionTab () {
    const [group_options, set_group_options] = useState<{ value: string, label: string }[]>([ ])
    const [selected_group_id, set_selected_group_id] = useState('')

    useEffect(() => {
        if (!ENABLE_AGENT_GROUP_AUTH)
            return
        access.get_group_list()
            .then(groups => { set_group_options(groups.map((group: string) => ({ value: group, label: group }))) })
            .catch(error => { show_error(error, t('加载用户组失败')) })
    }, [ ])

    return <SettingsListLayout
        title={t('用户组权限')}
        list_subtitle={t('选择需要管理的用户组')}
        options={group_options}
        selected_id={selected_group_id}
        set_selected_id={set_selected_group_id}
        empty_description={t('暂无用户组')}
        select_description={t('请选择用户组')}
    >
        <div style={{ fontWeight: 500, marginBottom: 12 }}>
            {t('正在编辑用户组：{{group}}', { group: selected_group_id })}
        </div>
        <GlobalAgentAdminSection subject_type='GROUP' subject_id={selected_group_id} />
        <AgentAccessSection subject_type='GROUP' subject_id={selected_group_id} />
        <LlmAccessSection subject_type='GROUP' subject_id={selected_group_id} />
        <SkillAccessSection subject_type='GROUP' subject_id={selected_group_id} />
    </SettingsListLayout>
}
