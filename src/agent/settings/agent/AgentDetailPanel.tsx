import { useEffect, useState } from 'react'
import {
    Alert, Button, Empty, Input, InputNumber, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography,
} from 'antd'
import {
    CheckCircleOutlined, ReloadOutlined, SaveOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'
import { chat_model } from '@/agent/model.ts'
import type { IAgentInfo, IAgentLlmBinding, IKnowledgeBaseInfo, ILlmConfig, IMcpBindingInfo, IMcpServerInfo, ISkillBinding, ISkillInfo } from '@/agent/model.ts'
import { get_kb_status_label } from '@/agent/settings/knowledge/types.ts'

import { AgentActions } from './AgentActions.tsx'
import { get_llm_config_display_name, get_mcp_server_display_name } from './types.ts'


const { Paragraph, Text } = Typography


export function AgentDetailPanel ({ agent, is_current, on_refresh }: { agent: IAgentInfo, is_current: boolean, on_refresh: () => void }) {
    const [bound_llms, set_bound_llms] = useState<IAgentLlmBinding[]>([ ])
    const [all_llms, set_all_llms] = useState<ILlmConfig[]>([ ])
    const [bound_skills, set_bound_skills] = useState<ISkillBinding[]>([ ])
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [bound_mcp_servers, set_bound_mcp_servers] = useState<IMcpBindingInfo[]>([ ])
    const [all_mcp_servers, set_all_mcp_servers] = useState<IMcpServerInfo[]>([ ])
    const [bound_kbs, set_bound_kbs] = useState<IKnowledgeBaseInfo[]>([ ])
    const [all_kbs, set_all_kbs] = useState<IKnowledgeBaseInfo[]>([ ])
    const [knowledge_load_error, set_knowledge_load_error] = useState('')
    const [loading, set_loading] = useState(true)
    const [saving_agent, set_saving_agent] = useState(false)
    const [operating_id, set_operating_id] = useState('')
    const [binding_tab_key, set_binding_tab_key] = useState('llm')
    const [agent_form, set_agent_form] = useState({
        description: agent.description || '',
        systemPrompt: agent.systemPrompt || '',
        allowLlmFallback: agent.config?.allowLlmFallback === true,
        docSearchEnabled: agent.config?.docSearchEnabled !== false,
    })
    
    async function load (show_loading = true) {
        if (show_loading)
            set_loading(true)
        try {
            const providers = await chat_model.llm.load_llm_providers()
            const provider_lookup = new Map(providers.map(provider => [provider.providerId, provider]))
            const [llms, global_llms, skills, global_skills, mcp_bindings, mcp_servers, knowledge_state] = await Promise.all([
                chat_model.llm.load_agent_llm_bindings(agent.agentId, provider_lookup),
                chat_model.llm.load_llm_configs(provider_lookup),
                chat_model.skill.load_skill_bindings(agent.agentId),
                chat_model.skill.load_skills(),
                chat_model.mcp.load_agent_mcp_bindings(agent.agentId),
                chat_model.mcp.load_mcp_servers(),
                chat_model.knowledge.list_knowledge_bases().then(async knowledge_bases => ({
                    knowledge_bases,
                    bound_knowledge_bases: await chat_model.knowledge.load_agent_knowledge_bases(agent.agentId, knowledge_bases),
                    error: '',
                })).catch(error => ({
                    knowledge_bases: [ ] as IKnowledgeBaseInfo[],
                    bound_knowledge_bases: [ ] as IKnowledgeBaseInfo[],
                    error: error instanceof Error ? error.message : String(error),
                })),
            ])
            set_bound_llms(llms)
            set_all_llms(global_llms)
            set_bound_skills(skills)
            set_all_skills(global_skills)
            set_bound_mcp_servers(mcp_bindings)
            set_all_mcp_servers(mcp_servers)
            set_bound_kbs(knowledge_state.bound_knowledge_bases)
            set_all_kbs(knowledge_state.knowledge_bases)
            set_knowledge_load_error(knowledge_state.error)
            // 同步刷新工具栏的可选 LLM 下拉列表
            if (is_current)
                chat_model.llm.load_selectable_llms(agent.agentId).catch(() => { })
        } catch {
            model.message.error(t('加载绑定信息失败'))
        } finally {
            if (show_loading)
                set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [agent.agentId])
    useEffect(() => {
        set_agent_form({
            description: agent.description || '',
            systemPrompt: agent.systemPrompt || '',
            allowLlmFallback: agent.config?.allowLlmFallback === true,
            docSearchEnabled: agent.config?.docSearchEnabled !== false,
        })
    }, [agent.agentId, agent.description, agent.systemPrompt, agent.config?.allowLlmFallback, agent.config?.docSearchEnabled])
    
    async function save_agent () {
        set_saving_agent(true)
        try {
            await chat_model.agent.update_agent(agent.agentId, {
                description: agent_form.description,
                systemPrompt: agent_form.systemPrompt,
                config: {
                    ...(agent.config || { }),
                    allowLlmFallback: agent_form.allowLlmFallback,
                    docSearchEnabled: agent_form.docSearchEnabled,
                },
            })
            model.message.success(t('保存成功'))
            on_refresh()
        } catch (err: any) {
            model.message.error(err.message || t('保存失败'))
        } finally {
            set_saving_agent(false)
        }
    }
    
    // --- LLM
    const bound_llm_ids = new Set(bound_llms.map(l => l.llmConfigId))
    const sorted_bound_llms = [...bound_llms].sort((a, b) => a.priority - b.priority)
    const unbound_llms = all_llms.filter(l => !bound_llm_ids.has(l.llmConfigId) && l.enabled !== false)
    const llm_items = [
        ...sorted_bound_llms.map(binding => ({
            binding,
            config: binding as ILlmConfig,
        })),
        ...unbound_llms.map(config => ({
            binding: undefined,
            config,
        })),
    ]
    
    // --- Skill
    const bound_skill_ids = new Set(bound_skills.map(b => b.skillId))
    const all_skill_lookup = new Map(all_skills.map(s => [s.skillId, s]))
    const unbound_skills = all_skills.filter(s => s.enabled !== false && !bound_skill_ids.has(s.skillId))
    const skill_items = [
        ...bound_skills.map(binding => ({
            binding,
            skill: binding.skill || all_skill_lookup.get(binding.skillId),
        })),
        ...unbound_skills.map(skill => ({
            binding: undefined,
            skill,
        })),
    ]
    
    // --- MCP
    const mcp_server_lookup = new Map(all_mcp_servers.map(s => [s.mcpServerId, s]))
    const bound_mcp_server_ids = new Set(bound_mcp_servers.map(b => b.mcpServerId))
    const unbound_mcp_servers = all_mcp_servers.filter(s => 
        s.enabled !== false &&
        !bound_mcp_server_ids.has(s.mcpServerId))
    const mcp_items = [
        ...bound_mcp_servers.map(binding => ({
            binding,
            server: binding.server || mcp_server_lookup.get(binding.mcpServerId),
        })),
        ...unbound_mcp_servers.map(server => ({
            binding: undefined,
            server,
        })),
    ]
    
    // --- Knowledge
    const bound_kb_ids = new Set(bound_kbs.map(b => b.knowledgeBaseId))
    const all_kb_lookup = new Map(all_kbs.map(k => [k.knowledgeBaseId, k]))
    const visible_kbs = all_kbs.filter(k => k.status !== 'DELETED')
    const bound_kb_items = bound_kbs.map(b => all_kb_lookup.get(b.knowledgeBaseId) || b)
    const unbound_kbs = visible_kbs.filter(k => !bound_kb_ids.has(k.knowledgeBaseId))
    const kb_items = [
        ...bound_kb_items.map(kb => ({
            is_bound: true,
            kb,
        })),
        ...unbound_kbs.map(kb => ({
            is_bound: false,
            kb,
        })),
    ]
    
    return <div>
        {/* Agent 基本信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <Text type='secondary' style={{ display: 'block', fontSize: 12, wordBreak: 'break-all' }}>
                    Agent ID: {agent.agentId}
                </Text>
                {agent.description && <Paragraph type='secondary' style={{ fontSize: 12, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: agent.description }}>
                    {agent.description}
                </Paragraph>}
            </div>
            <AgentActions agent={agent} is_current={is_current} on_refresh={on_refresh} />
        </div>
        <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('Agent 配置')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                    <Input
                        value={agent_form.description}
                        onChange={e => { set_agent_form({ ...agent_form, description: e.target.value }) }}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('系统提示词')}</div>
                    <Input.TextArea
                        value={agent_form.systemPrompt}
                        onChange={e => { set_agent_form({ ...agent_form, systemPrompt: e.target.value }) }}
                        rows={3}
                    />
                </div>
                <div>
                    <div className='ai-settings-switch-setting'>
                        <div className='ai-settings-switch-copy'>
                            <div>{t('允许模型失败时自动切换')}</div>
                            <div className='ai-settings-switch-description'>
                                {t('开启后，当前模型调用失败且尚未输出内容时，会按模型绑定优先级尝试下一个模型。')}
                            </div>
                        </div>
                        <Switch className='ai-settings-switch-medium' checked={agent_form.allowLlmFallback} onChange={checked => { set_agent_form({ ...agent_form, allowLlmFallback: checked }) }} />
                    </div>
                </div>
                <div>
                    <div className='ai-settings-switch-setting'>
                        <div className='ai-settings-switch-copy'>
                            <div>{t('启用文档搜索')}</div>
                            <div className='ai-settings-switch-description'>
                                {t('关闭后，AI 助手将不会联网搜索 DolphinDB 官方文档。')}
                            </div>
                        </div>
                        <Switch className='ai-settings-switch-medium' checked={agent_form.docSearchEnabled} onChange={checked => { set_agent_form({ ...agent_form, docSearchEnabled: checked }) }} />
                    </div>
                </div>
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Button size='small' type='primary' icon={<SaveOutlined />} loading={saving_agent} onClick={save_agent}>
                    {t('保存 Agent')}
                </Button>
            </div>
        </div>
        
        {loading
            ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            : <Tabs size='small' activeKey={binding_tab_key} onChange={set_binding_tab_key} items={[
                {
                    key: 'llm',
                    label: t('模型绑定') + ` (${bound_llms.length})`,
                    children: <div>
                        {llm_items.length > 0
                            ? <div style={{ marginBottom: 12 }}>
                                {llm_items.map(({ binding, config }) => {
                                    const is_bound = Boolean(binding)
                                    return <div
                                        key={config.llmConfigId}
                                        className='ai-settings-data-row'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <span style={{ fontWeight: 500, fontSize: 13 }}>
                                                    {get_llm_config_display_name(config)}
                                                </span>
                                                {binding?.isDefault && <Tag color='blue' style={{ fontSize: 11 }}>{t('默认')}</Tag>}
                                                <Tag
                                                    style={{ fontSize: 11 }}
                                                    color={config.capability === 'embedding' ? 'purple' : 'blue'}
                                                >
                                                    {config.capability || 'chat'}
                                                </Tag>
                                                {config.enabled === false && <Tag color='default' style={{ fontSize: 11 }}>{t('模型禁用')}</Tag>}
                                            </div>
                                            <Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                                                {config.model}{config.requestPath ? ` · ${config.requestPath}` : ''}
                                            </Text>
                                        </div>
                                        <Space size={6} style={{ flexShrink: 0 }}>
                                            {binding && <>
                                                <Tooltip title={t('优先级（数值越小优先级越高）')}>
                                                    <InputNumber
                                                        size='small'
                                                        min={0}
                                                        value={binding.priority}
                                                        style={{ width: 60 }}
                                                        disabled={binding.isDefault || operating_id === config.llmConfigId}
                                                        onChange={async value => {
                                                            if (value === null || value === binding.priority)
                                                                return
                                                            try {
                                                                await chat_model.llm.bind_llm_to_agent(agent.agentId, config.llmConfigId, binding.isDefault, value)
                                                                await load(false)
                                                            } catch (err: any) {
                                                                model.message.error(err.message || t('设置失败'))
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>
                                                {!binding.isDefault && <Tooltip title={t('设为默认')}>
                                                    <Button
                                                        type='text'
                                                        size='small'
                                                        icon={<CheckCircleOutlined />}
                                                        disabled={operating_id === config.llmConfigId}
                                                        onClick={async () => {
                                                            try {
                                                                await chat_model.llm.bind_llm_to_agent(agent.agentId, config.llmConfigId, true)
                                                                model.message.success(t('已设为默认'))
                                                                await load(false)
                                                            } catch (err: any) {
                                                                model.message.error(err.message || t('设置失败'))
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>}
                                            </>}
                                            <Switch
                                                className='ai-settings-switch-medium'
                                                checked={is_bound}
                                                loading={operating_id === config.llmConfigId}
                                                onChange={async checked => {
                                                    set_operating_id(config.llmConfigId)
                                                    try {
                                                        if (checked) {
                                                            await chat_model.llm.bind_llm_to_agent(agent.agentId, config.llmConfigId, bound_llms.length === 0)
                                                            model.message.success(t('已绑定'))
                                                        } else {
                                                            await chat_model.llm.unbind_llm_from_agent(agent.agentId, config.llmConfigId)
                                                            model.message.success(t('已解绑'))
                                                        }
                                                        await load(false)
                                                    } catch (err: any) {
                                                        model.message.error(err.message || (checked ? t('绑定失败') : t('解绑失败')))
                                                    } finally {
                                                        set_operating_id('')
                                                    }
                                                }}
                                            />
                                        </Space>
                                    </div>
                                })}
                            </div>
                            : <Empty description={t('暂无可用模型配置，请先在「模型管理」中创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
                {
                    key: 'skills',
                    label: t('技能绑定') + ` (${bound_skills.length})`,
                    children: <div>
                        {skill_items.length > 0
                            ? <div style={{ marginBottom: 12 }}>
                                {skill_items.map(({ binding, skill }) => {
                                    const skill_id = binding?.skillId ?? skill!.skillId
                                    const is_bound = Boolean(binding && binding.enabled !== false)
                                    return <div
                                        key={skill_id}
                                        className='ai-settings-data-row'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <span style={{ fontWeight: 500, fontSize: 13 }}>
                                                    {skill?.displayName || skill?.name || skill_id}
                                                </span>
                                                {skill?.category && <Tag style={{ fontSize: 11 }}>{skill.category}</Tag>}
                                                {skill && skill.enabled === false && <Tag color='default' style={{ fontSize: 11 }}>{t('技能禁用')}</Tag>}
                                            </div>
                                            {skill?.description && <Paragraph
                                                type='secondary'
                                                style={{ fontSize: 12, margin: '2px 0 0' }}
                                                ellipsis={{ rows: 2, tooltip: skill.description }}
                                            >
                                                {skill.description}
                                            </Paragraph>}
                                        </div>
                                        <Switch
                                            className='ai-settings-switch-medium'
                                            checked={is_bound}
                                            loading={operating_id === skill_id}
                                            onChange={async checked => {
                                                set_operating_id(skill_id)
                                                try {
                                                    await chat_model.skill.toggle_skill_binding(skill_id, checked, agent.agentId)
                                                    model.message.success(checked ? t('已绑定') : t('已解绑'))
                                                    await load(false)
                                                } catch (err: any) {
                                                    model.message.error(err.message || (checked ? t('绑定失败') : t('解绑失败')))
                                                } finally {
                                                    set_operating_id('')
                                                }
                                            }}
                                        />
                                    </div>
                                })}
                            </div>
                            : <Empty description={t('暂无可用技能，请先在「技能管理」中上传')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
                {
                    key: 'mcp',
                    label: t('MCP 绑定') + ` (${bound_mcp_servers.length})`,
                    children: <div>
                        {mcp_items.length > 0
                            ? <div style={{ marginBottom: 12 }}>
                                {mcp_items.map(({ binding, server }) => {
                                    const server_id = binding?.mcpServerId ?? server!.mcpServerId
                                    const is_bound = Boolean(binding && binding.enabled !== false)
                                    const server_available = server ? server.enabled !== false : undefined
                                    return <div
                                        key={server_id}
                                        className='ai-settings-data-row'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <Text
                                                    style={{ fontWeight: 500, fontSize: 13, minWidth: 0 }}
                                                    ellipsis={{ tooltip: get_mcp_server_display_name(server, server_id) }}
                                                >
                                                    {get_mcp_server_display_name(server, server_id)}
                                                </Text>
                                                {server?.serverType && <Tag style={{ fontSize: 11 }}>{server.serverType}</Tag>}
                                                {server_available === false && <Tag color='default' style={{ fontSize: 11 }}>{t('Server 禁用')}</Tag>}
                                            </div>
                                            <Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                                                {server?.endpoint?.url || server_id}
                                            </Text>
                                        </div>
                                        <Switch
                                            className='ai-settings-switch-medium'
                                            checked={is_bound}
                                            loading={operating_id === server_id}
                                            onChange={async checked => {
                                                set_operating_id(server_id)
                                                try {
                                                    if (checked) {
                                                        await chat_model.mcp.bind_mcp_server(agent.agentId, {
                                                            mcpServerId: server_id,
                                                            enabled: true,
                                                        })
                                                        model.message.success(t('已绑定'))
                                                    } else {
                                                        await chat_model.mcp.unbind_mcp_server(agent.agentId, server_id)
                                                        model.message.success(t('已解绑'))
                                                    }
                                                    await load(false)
                                                } catch (err: any) {
                                                    model.message.error(err.message || (checked ? t('绑定失败') : t('解绑失败')))
                                                } finally {
                                                    set_operating_id('')
                                                }
                                            }}
                                        />
                                    </div>
                                })}
                            </div>
                            : <Empty description={t('暂无可用 MCP Server，请先在「MCP 管理」中添加配置')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
                {
                    key: 'knowledge',
                    label: t('知识库绑定') + ` (${bound_kbs.length})`,
                    children: <div>
                        {knowledge_load_error
                            ? <Alert
                                type='error'
                                showIcon
                                message={t('加载知识库绑定失败')}
                                description={knowledge_load_error}
                                action={<Button size='small' onClick={() => { load(false) }}>{t('重试')}</Button>}
                            />
                            : kb_items.length > 0
                            ? <div style={{ marginBottom: 12 }}>
                                {kb_items.map(({ is_bound, kb }) => {
                                    const kb_id = kb.knowledgeBaseId
                                    const status = kb.status
                                    return <div
                                        key={kb_id}
                                        className='ai-settings-data-row'
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <span style={{ fontWeight: 500, fontSize: 13 }}>
                                                    {kb.name}
                                                </span>
                                                <Tag
                                                    color={status === 'ACTIVE' ? 'green' : 'default'}
                                                    style={{ fontSize: 11 }}
                                                >
                                                    {get_kb_status_label(status)}
                                                </Tag>
                                            </div>
                                            {kb.description && <Paragraph
                                                type='secondary'
                                                style={{ fontSize: 12, margin: '2px 0 0' }}
                                                ellipsis={{ rows: 2, tooltip: kb.description }}
                                            >
                                                {kb.description}
                                            </Paragraph>}
                                        </div>
                                        <Switch
                                            className='ai-settings-switch-medium'
                                            checked={is_bound}
                                            disabled={status !== 'ACTIVE'}
                                            loading={operating_id === kb_id}
                                            onChange={async checked => {
                                                set_operating_id(kb_id)
                                                try {
                                                    if (checked) {
                                                        await chat_model.knowledge.bind_agent(kb_id, agent.agentId)
                                                        model.message.success(t('已绑定'))
                                                    } else {
                                                        await chat_model.knowledge.unbind_agent(kb_id, agent.agentId)
                                                        model.message.success(t('已解绑'))
                                                    }
                                                    await load(false)
                                                } catch (err: any) {
                                                    model.message.error(err.message || (checked ? t('绑定失败') : t('解绑失败')))
                                                } finally {
                                                    set_operating_id('')
                                                }
                                            }}
                                        />
                                    </div>
                                })}
                            </div>
                            : <Empty description={t('暂无可用知识库，请先在「知识库管理」中创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
            ]} />
        }
    </div>
}
