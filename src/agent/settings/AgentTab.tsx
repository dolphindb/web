import { useEffect, useState } from 'react'

import {
    Button, Empty, Input, InputNumber, Popconfirm, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography,
} from 'antd'
import {
    CheckCircleOutlined, DeleteOutlined, DisconnectOutlined, LinkOutlined, PlusOutlined, SaveOutlined, StopOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'

import { model } from '@model'
import { chat_model } from '@/agent/model.ts'
import type { IAgentInfo, IAgentLlmBinding, ILlmConfig, IMcpBindingInfo, IMcpServerInfo, ISkillBinding, ISkillInfo } from '@/agent/model.ts'
import { form_error_alert, required_label } from './common.tsx'


const { Paragraph, Text } = Typography


function get_llm_config_display_name (llm: ILlmConfig) {
    const provider_name = llm.providerName || llm.providerId || llm.adapterType || '-'
    return `${provider_name} / ${llm.name}`
}


function get_mcp_server_display_name (server: IMcpServerInfo | undefined, fallback_id: string) {
    return server?.name || fallback_id || '-'
}


export function AgentTab () {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    
    const [creating, set_creating] = useState(false)
    const [loading, set_loading] = useState(false)
    const [form_error, set_form_error] = useState('')
    const [selected_agent, set_selected_agent] = useState<IAgentInfo | null>(null)
    const [form, set_form] = useState({
        agentName: '',
        description: '',
        systemPrompt: '',
        allowLlmFallback: false,
        docSearchEnabled: true,
    })
    
    async function refresh () {
        set_loading(true)
        try {
            await chat_model.agent.load_agents()
        } catch {
            model.message.error(t('加载 Agent 列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { refresh() }, [ ])
    
    // 自动选中当前 agent
    useEffect(() => {
        const current = agents.find(a => a.agentId === agent_id && a.statusName !== 'DELETED')
        const fallback = current || agents.find(a => a.statusName === 'ACTIVE') || null
        if (selected_agent) {
            const updated = agents.find(a => a.agentId === selected_agent.agentId && a.statusName !== 'DELETED')
            if (updated && updated !== selected_agent)
                set_selected_agent(updated)
            else if (!updated)
                set_selected_agent(fallback)
        } else if (fallback)
            set_selected_agent(fallback)
    }, [agents, agent_id])
    
    async function handle_create () {
        if (!form.agentName.trim()) {
            set_form_error(t('请输入 Agent 名称'))
            return
        }
        set_form_error('')
        set_loading(true)
        try {
            const agent = await chat_model.agent.register_agent({
                agentName: form.agentName.trim(),
                description: form.description || undefined,
                systemPrompt: form.systemPrompt || undefined,
                config: { allowLlmFallback: form.allowLlmFallback, docSearchEnabled: form.docSearchEnabled },
            })
            model.message.success(t('Agent 创建成功'))
            set_selected_agent(agent)
            set_creating(false)
            set_form({ agentName: '', description: '', systemPrompt: '', allowLlmFallback: false, docSearchEnabled: true })
        } catch (e: any) {
            model.message.error(e.message || t('创建失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const agent_create_time = (agent: IAgentInfo) => Date.parse(agent.createTime || '') || 0
    const visible_agents = agents
        .filter(a => a.statusName !== 'DELETED')
        .sort((a, b) =>
            a.agentId === agent_id ? -1 :
            b.agentId === agent_id ? 1 :
            agent_create_time(b) - agent_create_time(a)
        )
    
    return <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* 左侧 Agent 列表 */}
        <div style={{ width: 260, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: 0 }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={() => {
                    set_creating(!creating)
                    set_form_error('')
                }}>
                    {t('新建 Agent')}
                </Button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading && !creating
                    ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    : visible_agents.length === 0
                        ? <Empty description={t('暂无 Agent')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 20 }} />
                        : visible_agents.map(a =>
                            <div
                                key={a.agentId}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    background: selected_agent?.agentId === a.agentId ? '#e6f4ff' : 'transparent',
                                    borderLeft: selected_agent?.agentId === a.agentId ? '3px solid #1677ff' : '3px solid transparent',
                                }}
                                onClick={() => { set_selected_agent(a) }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{a.agentName}</span>
                                    <Tag color={a.statusName === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                        {a.statusName === 'ACTIVE' ? t('活跃') : a.statusName}
                                    </Tag>
                                    {a.agentId === agent_id && <Tag color='blue' style={{ fontSize: 11 }}>{t('当前')}</Tag>}
                                </div>
                                {a.description && <Paragraph type='secondary' style={{ fontSize: 11, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: a.description }}>
                                    {a.description}
                                </Paragraph>}
                            </div>
                        )
                }
            </div>
        </div>
        
        {/* 右侧详情 */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', padding: '0 16px' }}>
            {creating
                ? <div style={{ padding: '16px 0' }}>
                    {form_error_alert(form_error)}
                    <div style={{ display: 'grid', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('Agent 名称'))}</div>
                            <Input
                                value={form.agentName}
                                onChange={e => { set_form({ ...form, agentName: e.target.value }) }}
                                placeholder={t('例如: DolphinDB 助手')}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                            <Input
                                value={form.description}
                                onChange={e => { set_form({ ...form, description: e.target.value }) }}
                                placeholder={t('Agent 描述')}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('系统提示词')}</div>
                            <Input.TextArea
                                value={form.systemPrompt}
                                onChange={e => { set_form({ ...form, systemPrompt: e.target.value }) }}
                                placeholder={t('系统提示词，会作为对话的首条 system message')}
                                rows={3}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Space>
                                <Switch checked={form.allowLlmFallback} onChange={checked => { set_form({ ...form, allowLlmFallback: checked }) }} />
                                <span>{t('允许模型失败时自动切换')}</span>
                            </Space>
                            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                                {t('开启后，当前模型调用失败且尚未输出内容时，会按模型绑定优先级尝试下一个模型。')}
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Space>
                                <Switch checked={form.docSearchEnabled} onChange={checked => { set_form({ ...form, docSearchEnabled: checked }) }} />
                                <span>{t('启用文档搜索')}</span>
                            </Space>
                            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                                {t('关闭后，AI 助手将不会联网搜索 DolphinDB 官方文档。')}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => {
                            set_creating(false)
                            set_form_error('')
                        }}>{t('取消')}</Button>
                        <Button type='primary' loading={loading} onClick={handle_create}>{t('创建并激活')}</Button>
                    </div>
                </div>
                : selected_agent
                    ? <AgentDetailPanel agent={selected_agent} is_current={selected_agent.agentId === agent_id} on_refresh={refresh} />
                    : <Empty description={t('请选择一个 Agent')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 100 }} />
            }
        </div>
    </div>
}


function AgentDetailPanel ({ agent, is_current, on_refresh }: { agent: IAgentInfo, is_current: boolean, on_refresh: () => void }) {
    const [bound_llms, set_bound_llms] = useState<IAgentLlmBinding[]>([ ])
    const [all_llms, set_all_llms] = useState<ILlmConfig[]>([ ])
    const [bound_skills, set_bound_skills] = useState<ISkillBinding[]>([ ])
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [bound_mcp_servers, set_bound_mcp_servers] = useState<IMcpBindingInfo[]>([ ])
    const [all_mcp_servers, set_all_mcp_servers] = useState<IMcpServerInfo[]>([ ])
    const [loading, set_loading] = useState(true)
    const [saving_agent, set_saving_agent] = useState(false)
    const [binding_mcp_server_id, set_binding_mcp_server_id] = useState('')
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
            const [llms, global_llms, skills, global_skills, mcp_bindings, mcp_servers] = await Promise.all([
                chat_model.llm.load_agent_llm_bindings(agent.agentId, provider_lookup),
                chat_model.llm.load_llm_configs(provider_lookup),
                chat_model.skill.load_skill_bindings(agent.agentId),
                chat_model.skill.load_skills(),
                chat_model.mcp.load_agent_mcp_bindings(agent.agentId),
                chat_model.mcp.load_mcp_servers(),
            ])
            set_bound_llms(llms)
            set_all_llms(global_llms)
            set_bound_skills(skills)
            set_all_skills(global_skills)
            set_bound_mcp_servers(mcp_bindings)
            set_all_mcp_servers(mcp_servers)
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
    
    const bound_llm_ids = new Set(bound_llms.map(l => l.llmConfigId))
    const unbound_llms = all_llms.filter(l => !bound_llm_ids.has(l.llmConfigId) && l.enabled !== false)
    const sorted_bound_llms = [...bound_llms].sort((a, b) => a.priority - b.priority)
    
    const bound_skill_lookup = new Map(bound_skills.map(binding => [binding.skillId, binding]))
    const skill_items = all_skills
        .filter(skill => skill.enabled !== false || bound_skill_lookup.has(skill.skillId))
        .map(skill => ({ binding: bound_skill_lookup.get(skill.skillId), skill }))
    
    // --- mcp
    const mcp_server_lookup = new Map(all_mcp_servers.map(server => [server.mcpServerId, server]))
    
    const bound_mcp_server_ids = new Set(bound_mcp_servers.map(binding => binding.mcpServerId))
    
    const unbound_mcp_servers = all_mcp_servers.filter(server => 
        server.enabled !== false &&
        !bound_mcp_server_ids.has(server.mcpServerId))
    
    const mcp_items = [
        ...bound_mcp_servers.map(binding => ({
            binding,
            server: binding.server || mcp_server_lookup.get(binding.mcpServerId)
        })),
        ...unbound_mcp_servers.map(server => ({ binding: undefined, server })),
    ]
    
    async function bind_mcp_server (server: IMcpServerInfo) {
        set_binding_mcp_server_id(server.mcpServerId)
        try {
            await chat_model.mcp.bind_mcp_server(agent.agentId, {
                mcpServerId: server.mcpServerId,
                enabled: true,
            })
            model.message.success(t('已绑定'))
            await load()
        } catch (error) {
            model.message.error(error.message || t('绑定失败'))
        } finally {
            set_binding_mcp_server_id('')
        }
    }
    
    async function unbind_mcp_server (binding: IMcpBindingInfo) {
        set_binding_mcp_server_id(binding.mcpServerId)
        try {
            await chat_model.mcp.unbind_mcp_server(agent.agentId, binding.mcpServerId)
            model.message.success(t('已解绑'))
            await load()
        } catch (error) {
            model.message.error(error.message || t('解绑失败'))
        } finally {
            set_binding_mcp_server_id('')
        }
    }
    // --- end mcp
    
    return <div style={{ padding: '12px 0' }}>
        {/* Agent 基本信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{agent.agentName}</div>
                <Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                    Agent ID: {agent.agentId}
                </Text>
                {agent.description && <Paragraph type='secondary' style={{ fontSize: 12, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: agent.description }}>
                    {agent.description}
                </Paragraph>}
            </div>
            <Space size={4}>
                {!is_current && agent.statusName === 'ACTIVE' && <Button
                    size='small'
                    type='primary'
                    onClick={() => { chat_model.agent.select_agent(agent.agentId) }}
                >{t('设为当前')}</Button>}
                {agent.statusName !== 'ACTIVE' && <Button
                    size='small'
                    icon={<CheckCircleOutlined />}
                    onClick={async () => {
                        try {
                            await chat_model.agent.activate_agent(agent.agentId)
                            model.message.success(t('已激活'))
                            on_refresh()
                        } catch (err: any) {
                            model.message.error(err.message || t('激活失败'))
                        }
                    }}
                >{t('激活')}</Button>}
                {agent.statusName === 'ACTIVE' && <Popconfirm
                    title={t('确定挂起此 Agent？')}
                    onConfirm={async () => {
                        try {
                            await chat_model.agent.suspend_agent(agent.agentId)
                            model.message.success(t('已挂起'))
                            on_refresh()
                        } catch (err: any) {
                            model.message.error(err.message || t('挂起失败'))
                        }
                    }}
                >
                    <Button size='small' icon={<StopOutlined />}>{t('挂起')}</Button>
                </Popconfirm>}
                <Popconfirm
                    title={t('确定删除此 Agent？')}
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                        try {
                            await chat_model.agent.delete_agent(agent.agentId)
                            model.message.success(t('已删除'))
                            on_refresh()
                        } catch (err: any) {
                            model.message.error(err.message || t('删除失败'))
                        }
                    }}
                >
                    <Button size='small' danger icon={<DeleteOutlined />}>{t('删除')}</Button>
                </Popconfirm>
            </Space>
        </div>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 16 }}>
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
                    <Space>
                        <Switch checked={agent_form.allowLlmFallback} onChange={checked => { set_agent_form({ ...agent_form, allowLlmFallback: checked }) }} />
                        <span>{t('允许模型失败时自动切换')}</span>
                    </Space>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {t('开启后，当前模型调用失败且尚未输出内容时，会按模型绑定优先级尝试下一个模型。')}
                    </div>
                </div>
                <div>
                    <Space>
                        <Switch checked={agent_form.docSearchEnabled} onChange={checked => { set_agent_form({ ...agent_form, docSearchEnabled: checked }) }} />
                        <span>{t('启用文档搜索')}</span>
                    </Space>
                    <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {t('关闭后，AI 助手将不会联网搜索 DolphinDB 官方文档。')}
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
                        {/* 已绑定的 LLM */}
                        {bound_llms.length > 0 && <div style={{ marginBottom: 12 }}>
                            {sorted_bound_llms.map(llm =>
                                <div key={llm.llmConfigId} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 10px', border: '1px solid #f0f0f0', borderRadius: 4, marginBottom: 4,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{get_llm_config_display_name(llm)}</span>
                                        {llm.isDefault && <Tag color='blue'>{t('默认')}</Tag>}
                                    </div>
                                    <Space size={4}>
                                        <Tooltip title={t('优先级（数值越小优先级越高）')}>
                                            <InputNumber
                                                size='small'
                                                min={0}
                                                value={llm.priority}
                                                style={{ width: 60 }}
                                                disabled={llm.isDefault}
                                                onChange={async value => {
                                                    if (value === null || value === llm.priority)
                                                        return
                                                    try {
                                                        await chat_model.llm.bind_llm_to_agent(agent.agentId, llm.llmConfigId, llm.isDefault, value)
                                                        await load()
                                                    } catch (err: any) {
                                                        model.message.error(err.message || t('设置失败'))
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                        {!llm.isDefault && <Tooltip title={t('设为默认')}>
                                            <Button
                                                type='text' size='small'
                                                icon={<CheckCircleOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await chat_model.llm.bind_llm_to_agent(agent.agentId, llm.llmConfigId, true)
                                                        model.message.success(t('已设为默认'))
                                                        await load()
                                                    } catch (err: any) {
                                                        model.message.error(err.message || t('设置失败'))
                                                    }
                                                }}
                                            />
                                        </Tooltip>}
                                        <Tooltip title={t('解绑')}>
                                            <Button
                                                type='text' size='small' danger
                                                icon={<DisconnectOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await chat_model.llm.unbind_llm_from_agent(agent.agentId, llm.llmConfigId)
                                                        model.message.success(t('已解绑'))
                                                        await load()
                                                    } catch (err: any) {
                                                        model.message.error(err.message || t('解绑失败'))
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </Space>
                                </div>
                            )}
                        </div>}
                        
                        {/* 可绑定的 LLM */}
                        {unbound_llms.length > 0
                            ? <div>
                                <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{t('可用模型配置')}</div>
                                {unbound_llms.map(llm =>
                                    <div key={llm.llmConfigId} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '6px 10px', border: '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 4,
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 13 }}>{get_llm_config_display_name(llm)}</span>
                                        </div>
                                        <Tooltip title={t('绑定')}>
                                            <Button
                                                type='text' size='small'
                                                icon={<LinkOutlined />}
                                                onClick={async () => {
                                                    await chat_model.llm.bind_llm_to_agent(agent.agentId, llm.llmConfigId, bound_llms.length === 0)
                                                    model.message.success(t('已绑定'))
                                                    await load()
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                            : bound_llms.length === 0 && <Empty description={t('暂无可用模型配置，请先在「模型配置」中创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }
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
                                return <div key={skill_id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 10px', border: binding ? '1px solid #f0f0f0' : '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 4,
                                }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 500, fontSize: 13 }}>{skill?.displayName || skill?.name || skill_id}</span>
                                            <Tag color={binding?.enabled ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                                {binding?.enabled ? t('启用') : t('禁用')}
                                            </Tag>
                                        </div>
                                        {skill?.description && <Paragraph type='secondary' style={{ fontSize: 12, margin: '2px 0 0' }} ellipsis={{ rows: 3, tooltip: skill.description }}>
                                            {skill.description}
                                        </Paragraph>}
                                    </div>
                                    <Switch
                                        size='small'
                                        checked={!!binding?.enabled}
                                        onChange={async checked => {
                                            await chat_model.skill.toggle_skill_binding(skill_id, checked, agent.agentId)
                                            model.message.success(checked ? t('已启用') : t('已禁用'))
                                            await load(false)
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
                                    const bound = Boolean(binding)
                                    const server_available = server ? server.enabled !== false : undefined
                                    return <div key={server_id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '6px 10px', border: bound ? '1px solid #f0f0f0' : '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 4,
                                    }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                <Text
                                                    style={{ fontWeight: 500, fontSize: 13, minWidth: 0, maxWidth: '100%' }}
                                                    ellipsis={{ tooltip: get_mcp_server_display_name(server, server_id) }}
                                                >
                                                    {get_mcp_server_display_name(server, server_id)}
                                                </Text>
                                                <Tag color={server_available ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                                    {server_available === undefined
                                                        ? t('Server 未知')
                                                        : server_available
                                                            ? t('Server 可用')
                                                            : t('Server 禁用')}
                                                </Tag>
                                                {binding && <Tag color='blue' style={{ fontSize: 11 }}>{t('已绑定')}</Tag>}
                                            </div>
                                            <Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                                                {server_id}
                                            </Text>
                                        </div>
                                        {binding
                                            ? <Popconfirm
                                                title={t('确定解绑此 MCP Server？')}
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => { unbind_mcp_server(binding) }}
                                            >
                                                <Button
                                                    size='small'
                                                    danger
                                                    icon={<DisconnectOutlined />}
                                                    loading={binding_mcp_server_id === server_id}
                                                >
                                                    {t('解绑')}
                                                </Button>
                                            </Popconfirm>
                                            : <Tooltip title={t('绑定')}>
                                                <Button
                                                    type='primary'
                                                    size='small'
                                                    icon={<LinkOutlined />}
                                                    loading={binding_mcp_server_id === server_id}
                                                    onClick={() => { server && bind_mcp_server(server) }}
                                                >
                                                    {t('绑定')}
                                                </Button>
                                            </Tooltip>
                                        }
                                    </div>
                                })}
                            </div>
                            : <Empty description={t('暂无可用 MCP Server，请先在「MCP 管理」中添加配置')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
            ]} />
        }
    </div>
}
