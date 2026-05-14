import { useEffect, useRef, useState } from 'react'

import {
    Modal, Tabs, Input, Button, Switch, Space, Tag, Tooltip,
    Popconfirm, InputNumber, Empty, Spin, Select, message, Upload, Table, Typography,
    Tree, type TreeDataNode,
} from 'antd'
import {
    PlusOutlined, DeleteOutlined, EditOutlined,
    SaveOutlined, LinkOutlined, DisconnectOutlined,
    CheckCircleOutlined,
    StopOutlined, UploadOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'
import { model } from '@model'

import { chat_model } from './model.ts'
import type { IBuiltinInitResult, ILlmConfig, ILlmProvider, IAgentLlmBinding, ISkillInfo, ISkillBinding, IAgentInfo } from './model.ts'
import { DolphinXAdminTab, DolphinXUserTab } from './DolphinXUserSettings.tsx'


const { Text } = Typography


function AgentTab () {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    
    const [creating, set_creating] = useState(false)
    const [loading, set_loading] = useState(false)
    const [selected_agent, set_selected_agent] = useState<IAgentInfo | null>(null)
    const [form, set_form] = useState({
        agentName: '',
        agentType: 'chat',
        description: '',
        systemPrompt: '',
    })
    
    async function refresh () {
        set_loading(true)
        try {
            await chat_model.load_agents()
        } catch {
            message.error(t('加载 Agent 列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { refresh() }, [ ])
    
    // 自动选中当前 agent
    useEffect(() => {
        if (selected_agent) {
            const updated = agents.find(a => a.agentId === selected_agent.agentId)
            if (updated && updated !== selected_agent)
                set_selected_agent(updated)
        } else if (agents.length > 0) {
            const current = agents.find(a => a.agentId === agent_id)
            if (current)
                set_selected_agent(current)
        }
    }, [agents, agent_id])
    
    async function handle_create () {
        if (!form.agentName.trim()) {
            message.warning(t('请输入 Agent 名称'))
            return
        }
        set_loading(true)
        try {
            await chat_model.register_agent({
                agentName: form.agentName.trim(),
                agentType: form.agentType,
                description: form.description || undefined,
                systemPrompt: form.systemPrompt || undefined,
            })
            message.success(t('Agent 创建成功'))
            set_creating(false)
            set_form({ agentName: '', agentType: 'chat', description: '', systemPrompt: '' })
        } catch (e: any) {
            message.error(e.message || t('创建失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const visible_agents = agents.filter(a => a.statusName !== 'DELETED')
    
    return <div style={{ display: 'flex', height: 520 }}>
        {/* 左侧 Agent 列表 */}
        <div style={{ width: 260, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={() => { set_creating(!creating) }}>
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
                                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                                    {a.description || a.agentType}
                                </div>
                            </div>
                        )
                }
            </div>
        </div>
        
        {/* 右侧详情 */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '0 16px' }}>
            {creating
                ? <div style={{ padding: '16px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('Agent 名称')} *</div>
                            <Input
                                value={form.agentName}
                                onChange={e => { set_form({ ...form, agentName: e.target.value }) }}
                                placeholder={t('例如: DolphinDB 助手')}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('类型')}</div>
                            <Select
                                style={{ width: '100%' }}
                                value={form.agentType}
                                onChange={val => { set_form({ ...form, agentType: val }) }}
                                options={[
                                    { value: 'chat', label: 'Chat' },
                                    { value: 'task', label: 'Task' },
                                ]}
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
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => { set_creating(false) }}>{t('取消')}</Button>
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
    const [loading, set_loading] = useState(true)
    const [saving_agent, set_saving_agent] = useState(false)
    const [agent_form, set_agent_form] = useState({
        description: agent.description || '',
        systemPrompt: agent.systemPrompt || '',
    })
    
    async function load () {
        set_loading(true)
        try {
            const [llms, global_llms, skills, global_skills] = await Promise.all([
                chat_model.load_agent_llm_bindings(agent.agentId),
                chat_model.load_llm_configs(),
                chat_model.load_skill_bindings(agent.agentId),
                chat_model.load_skills(),
            ])
            set_bound_llms(llms)
            set_all_llms(global_llms)
            set_bound_skills(skills)
            set_all_skills(global_skills)
            // 同步刷新工具栏的可选 LLM 下拉列表
            if (is_current)
                chat_model.load_selectable_llms(agent.agentId)
        } catch {
            message.error(t('加载绑定信息失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [agent.agentId])
    useEffect(() => {
        set_agent_form({
            description: agent.description || '',
            systemPrompt: agent.systemPrompt || '',
        })
    }, [agent.agentId, agent.description, agent.systemPrompt])
    
    async function save_agent () {
        set_saving_agent(true)
        try {
            await chat_model.update_agent(agent.agentId, {
                description: agent_form.description || undefined,
                systemPrompt: agent_form.systemPrompt || undefined,
            })
            message.success(t('保存成功'))
            on_refresh()
        } catch (err: any) {
            message.error(err.message || t('保存失败'))
        } finally {
            set_saving_agent(false)
        }
    }
    
    const bound_llm_ids = new Set(bound_llms.map(l => l.llmConfigId))
    const unbound_llms = all_llms.filter(l => !bound_llm_ids.has(l.llmConfigId) && l.enabled !== false)
    const sorted_bound_llms = [...bound_llms].sort((a, b) => a.priority - b.priority)
    
    const bound_skill_ids = new Set(bound_skills.map(s => s.skillId))
    const unbound_skills = all_skills.filter(s => !bound_skill_ids.has(s.skillId) && s.enabled !== false)
    
    return <div style={{ padding: '12px 0' }}>
        {/* Agent 基本信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{agent.agentName}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {agent.description || agent.agentType} · {agent.agentId.slice(0, 20)}...
                </div>
            </div>
            <Space size={4}>
                {!is_current && agent.statusName === 'ACTIVE' && <Button
                    size='small'
                    type='primary'
                    onClick={() => { chat_model.select_agent(agent.agentId) }}
                >{t('设为当前')}</Button>}
                {agent.statusName !== 'ACTIVE' && <Button
                    size='small'
                    icon={<CheckCircleOutlined />}
                    onClick={async () => {
                        try {
                            await chat_model.activate_agent(agent.agentId)
                            message.success(t('已激活'))
                            on_refresh()
                        } catch (err: any) {
                            message.error(err.message || t('激活失败'))
                        }
                    }}
                >{t('激活')}</Button>}
                {agent.statusName === 'ACTIVE' && <Popconfirm
                    title={t('确定挂起此 Agent？')}
                    onConfirm={async () => {
                        try {
                            await chat_model.suspend_agent(agent.agentId)
                            message.success(t('已挂起'))
                            on_refresh()
                        } catch (err: any) {
                            message.error(err.message || t('挂起失败'))
                        }
                    }}
                >
                    <Button size='small' icon={<StopOutlined />}>{t('挂起')}</Button>
                </Popconfirm>}
                <Popconfirm
                    title={t('确定删除此 Agent？')}
                    onConfirm={async () => {
                        try {
                            await chat_model.delete_agent(agent.agentId)
                            message.success(t('已删除'))
                            on_refresh()
                        } catch (err: any) {
                            message.error(err.message || t('删除失败'))
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
            </div>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
                <Button size='small' type='primary' icon={<SaveOutlined />} loading={saving_agent} onClick={save_agent}>
                    {t('保存 Agent')}
                </Button>
            </div>
        </div>
        
        {loading
            ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            : <Tabs size='small' items={[
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
                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{llm.name}</span>
                                        <span style={{ color: '#999', fontSize: 12 }}>{llm.providerName || llm.adapterType || ''}/{llm.model}</span>
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
                                                        await chat_model.bind_llm_to_agent(agent.agentId, llm.llmConfigId, llm.isDefault, value)
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('设置失败'))
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
                                                        await chat_model.bind_llm_to_agent(agent.agentId, llm.llmConfigId, true)
                                                        message.success(t('已设为默认'))
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('设置失败'))
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
                                                        await chat_model.unbind_llm_from_agent(agent.agentId, llm.llmConfigId)
                                                        message.success(t('已解绑'))
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('解绑失败'))
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
                                            <span style={{ fontSize: 13 }}>{llm.name}</span>
                                            <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{llm.providerName || llm.adapterType || ''}/{llm.model}</span>
                                        </div>
                                        <Tooltip title={t('绑定')}>
                                            <Button
                                                type='text' size='small'
                                                icon={<LinkOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await chat_model.bind_llm_to_agent(agent.agentId, llm.llmConfigId, bound_llms.length === 0)
                                                        message.success(t('已绑定'))
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('绑定失败'))
                                                    }
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
                        {/* 已绑定的技能 */}
                        {bound_skills.length > 0 && <div style={{ marginBottom: 12 }}>
                            {bound_skills.map(binding => {
                                const skill = binding.skill || all_skills.find(s => s.skillId === binding.skillId)
                                return <div key={binding.skillId} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 10px', border: '1px solid #f0f0f0', borderRadius: 4, marginBottom: 4,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{skill?.displayName || skill?.name || binding.skillId}</span>
                                        <Tag color={binding.enabled ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                            {binding.enabled ? t('启用') : t('禁用')}
                                        </Tag>
                                    </div>
                                    <Space size={4}>
                                        <Switch
                                            size='small'
                                            checked={binding.enabled}
                                            onChange={async checked => {
                                                try {
                                                    await chat_model.toggle_skill_binding(binding.skillId, checked, agent.agentId)
                                                    message.success(checked ? t('已启用') : t('已禁用'))
                                                    await load()
                                                } catch (err: any) {
                                                    message.error(err.message || t('操作失败'))
                                                }
                                            }}
                                        />
                                        <Tooltip title={t('解绑')}>
                                            <Button
                                                type='text' size='small' danger
                                                icon={<DisconnectOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await chat_model.unbind_skill(binding.skillId, agent.agentId)
                                                        message.success(t('已解绑'))
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('解绑失败'))
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </Space>
                                </div>
                            })}
                        </div>}
                        
                        {/* 可绑定的技能 */}
                        {unbound_skills.length > 0
                            ? <div>
                                <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{t('可用技能')}</div>
                                {unbound_skills.map(skill =>
                                    <div key={skill.skillId} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '6px 10px', border: '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 4,
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 13 }}>{skill.displayName || skill.name}</span>
                                            {skill.description && <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>{skill.description.slice(0, 40)}</span>}
                                        </div>
                                        <Tooltip title={t('绑定')}>
                                            <Button
                                                type='text' size='small'
                                                icon={<LinkOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await chat_model.bind_skill(skill.skillId, agent.agentId)
                                                        message.success(t('已绑定'))
                                                        await load()
                                                    } catch (err: any) {
                                                        message.error(err.message || t('绑定失败'))
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                            : bound_skills.length === 0 && <Empty description={t('暂无可用技能，请先在「技能管理」中上传')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }
                    </div>,
                },
            ]} />
        }
    </div>
}


const ADAPTER_TYPE_OPTIONS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'openai-compatible', label: 'OpenAI Compatible' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'azure', label: 'Azure' },
    { value: 'local', label: 'Local' },
]


const EMBEDDING_METRIC_OPTIONS = [
    { value: 'euclidean', label: 'Euclidean' },
    { value: 'cosine', label: 'Cosine' },
]


const DEFAULT_CONTEXT_WINDOW = 256000


const DEFAULT_PROVIDER_FORM = {
    name: '',
    adapterType: 'openai',
    baseUrl: '',
    apiKey: '',
}


const DEFAULT_CONFIG_FORM = {
    name: '',
    model: '',
    capability: 'chat' as 'chat' | 'embedding',
    requestPath: '/v1/chat/completions',
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    defaultParams: '',
    embeddingDimension: 1536,
    embeddingMetric: 'euclidean' as 'euclidean' | 'cosine',
    embeddingNormalize: false,
    maxConcurrency: undefined as number | undefined,
    rateLimitRPM: undefined as number | undefined,
    timeoutMs: undefined as number | undefined,
    retryConfig: '',
}


function parse_json_field (value: string, field_label: string): Record<string, unknown> | undefined {
    if (!value.trim())
        return undefined
    try {
        return JSON.parse(value)
    } catch {
        message.error(t('{{field}} JSON 格式错误', { field: field_label }))
        throw new Error('invalid json')
    }
}


function LlmConfigTab () {
    const [providers, set_providers] = useState<ILlmProvider[]>([ ])
    const [configs, set_configs] = useState<ILlmConfig[]>([ ])
    const [selected_provider_id, set_selected_provider_id] = useState('')
    const [provider_mode, set_provider_mode] = useState<'idle' | 'create' | 'edit'>('idle')
    const [provider_form, set_provider_form] = useState({ ...DEFAULT_PROVIDER_FORM })
    
    const [config_modal_mode, set_config_modal_mode] = useState<'closed' | 'create' | 'edit'>('closed')
    const [editing_config_id, set_editing_config_id] = useState('')
    const [config_form, set_config_form] = useState({ ...DEFAULT_CONFIG_FORM })
    
    const [loading, set_loading] = useState(false)
    const [saving_provider, set_saving_provider] = useState(false)
    const [saving_config, set_saving_config] = useState(false)
    
    async function load () {
        set_loading(true)
        try {
            const [ps, cs] = await Promise.all([
                chat_model.load_llm_providers(),
                chat_model.load_llm_configs(),
            ])
            const visible_providers = ps.filter(p => p.statusName !== 'DELETED')
            const lookup = new Map(visible_providers.map(p => [p.providerId, p]))
            const enriched = cs
                .filter(c => c.statusName !== 'DELETED')
                .map(c => ({
                    ...c,
                    providerName: c.providerName || lookup.get(c.providerId)?.name,
                    adapterType: c.adapterType || lookup.get(c.providerId)?.adapterType,
                }))
            set_providers(visible_providers)
            set_configs(enriched)
        } catch {
            message.error(t('加载模型配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    const selected_provider = providers.find(p => p.providerId === selected_provider_id)
    const provider_configs = configs.filter(c => c.providerId === selected_provider_id)
    
    function open_create_provider () {
        set_selected_provider_id('')
        set_provider_mode('create')
        set_provider_form({ ...DEFAULT_PROVIDER_FORM })
    }
    
    function open_edit_provider (p: ILlmProvider) {
        set_selected_provider_id(p.providerId)
        set_provider_mode('edit')
        set_provider_form({
            name: p.name,
            adapterType: p.adapterType || 'openai',
            baseUrl: p.baseUrl,
            apiKey: p.apiKey || '',
        })
    }
    
    async function save_provider () {
        if (!provider_form.name.trim()) {
            message.warning(t('请输入 Provider 名称'))
            return
        }
        if (!provider_form.baseUrl.trim()) {
            message.warning(t('请输入 Base URL'))
            return
        }
        set_saving_provider(true)
        try {
            if (provider_mode === 'create') {
                const created = await chat_model.register_llm_provider({
                    name: provider_form.name.trim(),
                    adapterType: provider_form.adapterType,
                    baseUrl: provider_form.baseUrl.trim(),
                    apiKey: provider_form.apiKey || undefined,
                    enabled: true,
                })
                message.success(t('创建成功'))
                await load()
                set_selected_provider_id(created.providerId)
                set_provider_mode('edit')
            } else if (provider_mode === 'edit' && selected_provider_id) {
                const payload: Record<string, unknown> = {
                    name: provider_form.name.trim(),
                    adapterType: provider_form.adapterType,
                    baseUrl: provider_form.baseUrl.trim(),
                }
                if (provider_form.apiKey && provider_form.apiKey !== (selected_provider?.apiKey || ''))
                    payload.apiKey = provider_form.apiKey
                
                await chat_model.update_llm_provider(selected_provider_id, payload)
                message.success(t('保存成功'))
                await load()
            }
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving_provider(false)
        }
    }
    
    async function delete_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.delete_llm_provider(selected_provider_id)
            message.success(t('删除成功'))
            set_selected_provider_id('')
            set_provider_mode('idle')
            set_provider_form({ ...DEFAULT_PROVIDER_FORM })
            await load()
        } catch (e: any) {
            message.error(e.message || t('删除失败，请先删除该 Provider 下的所有模型配置'))
        }
    }
    
    
    async function disable_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.disable_llm_provider(selected_provider_id)
            message.success(t('禁用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('禁用失败'))
            await load()
        }
    }
    
    
    async function enable_provider () {
        if (!selected_provider_id)
            return
        try {
            await chat_model.enable_llm_provider(selected_provider_id)
            message.success(t('启用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('启用失败'))
            await load()
        }
    }
    
    function open_create_config () {
        if (!selected_provider_id) {
            message.warning(t('请先选择一个 Provider'))
            return
        }
        if (selected_provider?.enabled === false) {
            message.warning(t('只有活跃 Provider 可以新增模型配置'))
            return
        }
        set_editing_config_id('')
        set_config_modal_mode('create')
        set_config_form({ ...DEFAULT_CONFIG_FORM })
    }
    
    function open_edit_config (cfg: ILlmConfig) {
        set_editing_config_id(cfg.llmConfigId)
        set_config_modal_mode('edit')
        set_config_form({
            name: cfg.name,
            model: cfg.model,
            capability: (cfg.capability as 'chat' | 'embedding') || 'chat',
            requestPath: cfg.requestPath || '/v1/chat/completions',
            contextWindow: cfg.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
            defaultParams: cfg.defaultParams ? JSON.stringify(cfg.defaultParams, null, 2) : '',
            embeddingDimension: cfg.embeddingDimension ?? 1536,
            embeddingMetric: (cfg.embeddingMetric as 'euclidean' | 'cosine') || 'euclidean',
            embeddingNormalize: cfg.embeddingNormalize ?? false,
            maxConcurrency: cfg.maxConcurrency,
            rateLimitRPM: cfg.rateLimitRPM,
            timeoutMs: cfg.timeoutMs,
            retryConfig: cfg.retryConfig ? JSON.stringify(cfg.retryConfig, null, 2) : '',
        })
    }
    
    async function save_config () {
        if (!config_form.name.trim()) {
            message.warning(t('请输入配置名称'))
            return
        }
        if (!config_form.model.trim()) {
            message.warning(t('请输入模型名称'))
            return
        }
        if (!config_form.requestPath.trim() || !config_form.requestPath.startsWith('/')) {
            message.warning(t('请求路径必须以 / 开头'))
            return
        }
        
        let default_params: Record<string, unknown> | undefined
        let retry_config: Record<string, unknown> | undefined
        try {
            default_params = parse_json_field(config_form.defaultParams, t('自定义参数'))
            retry_config = parse_json_field(config_form.retryConfig, t('重试配置'))
        } catch {
            return
        }
        
        const is_embedding = config_form.capability === 'embedding'
        if (is_embedding && config_form.embeddingMetric === 'cosine' && !config_form.embeddingNormalize) {
            message.warning(t('embeddingMetric=cosine 时必须勾选归一化'))
            return
        }
        
        const payload: any = {
            name: config_form.name.trim(),
            model: config_form.model.trim(),
            capability: config_form.capability,
            requestPath: config_form.requestPath.trim(),
            contextWindow: config_form.contextWindow,
            defaultParams: default_params,
            maxConcurrency: config_form.maxConcurrency,
            rateLimitRPM: config_form.rateLimitRPM,
            timeoutMs: config_form.timeoutMs,
            retryConfig: retry_config,
        }
        if (is_embedding) {
            payload.embeddingDimension = config_form.embeddingDimension
            payload.embeddingMetric = config_form.embeddingMetric
            payload.embeddingNormalize = config_form.embeddingNormalize
        }
        
        set_saving_config(true)
        try {
            if (config_modal_mode === 'create') {
                await chat_model.register_llm_config({ ...payload, providerId: selected_provider_id, enabled: true })
                message.success(t('创建成功'))
            } else if (editing_config_id) {
                await chat_model.update_llm_config(editing_config_id, payload)
                message.success(t('保存成功'))
            }
            set_config_modal_mode('closed')
            await load()
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving_config(false)
        }
    }
    
    async function delete_config (cfg: ILlmConfig) {
        try {
            await chat_model.delete_llm_config(cfg.llmConfigId)
            message.success(t('删除成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('删除失败'))
            await load()
        }
    }
    
    
    async function disable_config (cfg: ILlmConfig) {
        try {
            await chat_model.disable_llm_config(cfg.llmConfigId)
            message.success(t('禁用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('禁用失败'))
            await load()
        }
    }
    
    
    async function enable_config (cfg: ILlmConfig) {
        try {
            await chat_model.enable_llm_config(cfg.llmConfigId)
            message.success(t('启用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('启用失败'))
            await load()
        }
    }
    
    const is_embedding_form = config_form.capability === 'embedding'
    
    return <div style={{ display: 'flex', height: 520 }}>
        {/* 左侧 Provider 列表 */}
        <div style={{
            width: 260, borderRight: '1px solid #f0f0f0', display: 'flex',
            flexDirection: 'column', flexShrink: 0,
        }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={open_create_provider}>
                    {t('新建 Provider')}
                </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading
                    ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    : providers.length === 0
                        ? <Empty description={t('暂无 Provider')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : providers.map(p => {
                            const count = configs.filter(c => c.providerId === p.providerId).length
                            return <div
                                key={p.providerId}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer',
                                    background: p.providerId === selected_provider_id ? '#e6f4ff' : 'transparent',
                                    borderLeft: p.providerId === selected_provider_id ? '3px solid #1677ff' : '3px solid transparent',
                                }}
                                onClick={() => { open_edit_provider(p) }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                                    <Tag style={{ fontSize: 11 }}>{p.adapterType}</Tag>
                                    {p.enabled === false && <Tag color='default' style={{ fontSize: 11 }}>{t('禁用')}</Tag>}
                                </div>
                                <div style={{ fontSize: 12, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.baseUrl || t('未配置 Base URL')}
                                </div>
                                <div style={{ fontSize: 12, color: '#1677ff', marginTop: 2 }}>
                                    {t('模型数: {{count}}', { count })}
                                </div>
                            </div>
                        })
                }
            </div>
        </div>
        
        {/* 右侧 Provider 编辑器 + 内嵌模型列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
            {provider_mode === 'idle'
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请从左侧选择一个 Provider，或点击上方新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>
                        {provider_mode === 'create' ? t('新建 Provider') : t('编辑 Provider')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('Provider 名称')}</div>
                            <Input
                                value={provider_form.name}
                                onChange={e => { set_provider_form({ ...provider_form, name: e.target.value }) }}
                                placeholder={t('名称')}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('适配器类型')}</div>
                            <Select
                                style={{ width: '100%' }}
                                value={provider_form.adapterType}
                                onChange={val => { set_provider_form({ ...provider_form, adapterType: val }) }}
                                options={ADAPTER_TYPE_OPTIONS}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>Base URL</div>
                            <Input
                                value={provider_form.baseUrl}
                                onChange={e => { set_provider_form({ ...provider_form, baseUrl: e.target.value }) }}
                                placeholder='https://api.openai.com'
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>API Key</div>
                            <Input.Password
                                value={provider_form.apiKey}
                                onChange={e => { set_provider_form({ ...provider_form, apiKey: e.target.value }) }}
                                placeholder='sk-...'
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {provider_mode === 'edit' && selected_provider?.enabled !== false && <Popconfirm
                            title={t('确定禁用此 Provider？')}
                            description={t('禁用前需要确保没有未删除的模型配置继续引用该 Provider')}
                            onConfirm={disable_provider}
                        >
                            <Button icon={<StopOutlined />}>{t('禁用 Provider')}</Button>
                        </Popconfirm>}
                        {provider_mode === 'edit' && selected_provider?.enabled === false && <Popconfirm
                            title={t('确定启用此 Provider？')}
                            description={t('启用 Provider 不会自动启用引用它的模型配置')}
                            onConfirm={enable_provider}
                        >
                            <Button icon={<CheckCircleOutlined />}>{t('启用 Provider')}</Button>
                        </Popconfirm>}
                        {provider_mode === 'edit' && <Popconfirm
                            title={t('确定删除此 Provider？')}
                            onConfirm={delete_provider}
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<DeleteOutlined />}>{t('删除 Provider')}</Button>
                        </Popconfirm>}
                        <Button type='primary' icon={<SaveOutlined />} loading={saving_provider} onClick={save_provider}>
                            {provider_mode === 'create' ? t('创建') : t('保存')}
                        </Button>
                    </div>
                    
                    {provider_mode === 'edit' && selected_provider && <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{t('关联模型配置') + ` (${provider_configs.length})`}</div>
                            <Button size='small' icon={<PlusOutlined />} disabled={selected_provider.enabled === false} onClick={open_create_config}>
                                {t('新增模型')}
                            </Button>
                        </div>
                        {provider_configs.length === 0
                            ? <Empty description={t('暂无模型，点击上方新增')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            : provider_configs.map(cfg =>
                                <div key={cfg.llmConfigId} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 4, marginBottom: 6,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                                            {cfg.name}
                                            <Tag style={{ marginLeft: 8, fontSize: 11 }} color={cfg.capability === 'embedding' ? 'purple' : 'blue'}>
                                                {cfg.capability || 'chat'}
                                            </Tag>
                                            <Tag
                                                style={{ fontSize: 11 }}
                                                color={cfg.enabled !== false ? 'green' : 'default'}
                                            >
                                                {cfg.enabled !== false ? t('启用') : t('禁用')}
                                            </Tag>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                            {cfg.model} · {cfg.requestPath}
                                        </div>
                                    </div>
                                    <Space size={4}>
                                        {cfg.statusName === 'DELETED'
                                            ? <Tooltip title={t('已删除的模型配置不可编辑')}>
                                                <Button type='text' size='small' disabled icon={<EditOutlined />} />
                                            </Tooltip>
                                            : <Button type='text' size='small' icon={<EditOutlined />} onClick={() => { open_edit_config(cfg) }} />}
                                        {cfg.enabled !== false && <Popconfirm
                                            title={t('确定禁用此模型配置？')}
                                            onConfirm={async () => { await disable_config(cfg) }}
                                        >
                                            <Button type='text' size='small' icon={<StopOutlined />}>{t('禁用')}</Button>
                                        </Popconfirm>}
                                        {cfg.enabled === false && <Popconfirm
                                            title={t('确定启用此模型配置？')}
                                            description={t('启用前要求所属 Provider 为 ACTIVE')}
                                            onConfirm={async () => { await enable_config(cfg) }}
                                        >
                                            <Button type='text' size='small' icon={<CheckCircleOutlined />}>{t('启用')}</Button>
                                        </Popconfirm>}
                                        <Popconfirm
                                            title={t('确定删除此模型配置？')}
                                            onConfirm={async () => { await delete_config(cfg) }}
                                        >
                                            <Button type='text' size='small' danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            )
                        }
                    </div>}
                </>
            }
        </div>
        
        {/* 模型配置编辑 Modal */}
        <Modal
            title={config_modal_mode === 'create' ? t('新增模型配置') : t('编辑模型配置')}
            open={config_modal_mode !== 'closed'}
            onCancel={() => { set_config_modal_mode('closed') }}
            onOk={save_config}
            confirmLoading={saving_config}
            okText={t('保存')}
            cancelText={t('取消')}
            width={720}
            destroyOnClose
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 12 }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('配置名称')}</div>
                    <Input
                        value={config_form.name}
                        onChange={e => { set_config_form({ ...config_form, name: e.target.value }) }}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('能力')}</div>
                    <Select
                        style={{ width: '100%' }}
                        value={config_form.capability}
                        onChange={val => { set_config_form({ ...config_form, capability: val }) }}
                        options={[
                            { value: 'chat', label: 'Chat' },
                            { value: 'embedding', label: 'Embedding' },
                        ]}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('模型名称')}</div>
                    <Input
                        value={config_form.model}
                        onChange={e => { set_config_form({ ...config_form, model: e.target.value }) }}
                        placeholder='gpt-4o'
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('请求路径')}</div>
                    <Input
                        value={config_form.requestPath}
                        onChange={e => { set_config_form({ ...config_form, requestPath: e.target.value }) }}
                        placeholder='/v1/chat/completions'
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>Context Window</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.contextWindow}
                        onChange={val => { set_config_form({ ...config_form, contextWindow: val ?? DEFAULT_CONTEXT_WINDOW }) }}
                        min={1024}
                        step={1024}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('最大并发（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.maxConcurrency}
                        onChange={val => { set_config_form({ ...config_form, maxConcurrency: val ?? undefined }) }}
                        min={1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('速率限制 RPM（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.rateLimitRPM}
                        onChange={val => { set_config_form({ ...config_form, rateLimitRPM: val ?? undefined }) }}
                        min={1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('超时毫秒（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.timeoutMs}
                        onChange={val => { set_config_form({ ...config_form, timeoutMs: val ?? undefined }) }}
                        min={1000}
                        step={1000}
                    />
                </div>
                {is_embedding_form && <>
                    <div>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>Embedding Dimension</div>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={config_form.embeddingDimension}
                            onChange={val => { set_config_form({ ...config_form, embeddingDimension: val ?? 1536 }) }}
                            min={1}
                        />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>Embedding Metric</div>
                        <Select
                            style={{ width: '100%' }}
                            value={config_form.embeddingMetric}
                            onChange={val => { set_config_form({ ...config_form, embeddingMetric: val }) }}
                            options={EMBEDDING_METRIC_OPTIONS}
                        />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch
                            checked={config_form.embeddingNormalize}
                            onChange={checked => { set_config_form({ ...config_form, embeddingNormalize: checked }) }}
                        />
                        <span style={{ fontSize: 13 }}>{t('对向量做归一化（metric=cosine 时必须开启）')}</span>
                    </div>
                </>}
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('自定义参数 (JSON，传给模型的其他参数)')}</div>
                    <Input.TextArea
                        value={config_form.defaultParams}
                        onChange={e => { set_config_form({ ...config_form, defaultParams: e.target.value }) }}
                        placeholder='{"temperature": 0.7}'
                        rows={3}
                        style={{ fontFamily: 'monospace' }}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('重试配置 (JSON，可选)')}</div>
                    <Input.TextArea
                        value={config_form.retryConfig}
                        onChange={e => { set_config_form({ ...config_form, retryConfig: e.target.value }) }}
                        placeholder='{"maxRetries": 3, "backoffMs": 500}'
                        rows={2}
                        style={{ fontFamily: 'monospace' }}
                    />
                </div>
            </div>
        </Modal>
    </div>
}


function SkillsTab () {
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [loading, set_loading] = useState(false)
    const [creating, set_creating] = useState(false)
    const [detail_skill, set_detail_skill] = useState<ISkillInfo | null>(null)
    const [skill_instruction, set_skill_instruction] = useState('')
    const [skill_files, set_skill_files] = useState<string[]>([ ])
    const [selected_skill_file, set_selected_skill_file] = useState('')
    const [skill_file_content, set_skill_file_content] = useState('')
    const [loading_detail, set_loading_detail] = useState(false)
    const [skill_file, set_skill_file] = useState<File | null>(null)
    const detail_request_ref = useRef(0)
    const file_request_ref = useRef(0)
    const [overrides, set_overrides] = useState({
        name: '',
        displayName: '',
        description: '',
        category: '',
        version: '',
    })
    
    async function load () {
        set_loading(true)
        try {
            const skills = await chat_model.load_skills()
            set_all_skills(skills)
        } catch {
            message.error(t('加载技能列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    function decode_skill_file (content: string, encoding?: string) {
        if (encoding !== 'base64')
            return content
        try {
            const bytes = Uint8Array.from(atob(content), char => char.charCodeAt(0))
            return new TextDecoder().decode(bytes)
        } catch {
            return content
        }
    }
    
    
    function build_skill_file_tree (paths: string[]) {
        type FileTreeNode = TreeDataNode & { children?: FileTreeNode[] }
        
        const roots: FileTreeNode[] = [ ]
        const node_map = new Map<string, FileTreeNode>()
        for (const file_path of paths) {
            const parts = file_path.split(/[\\/]/).filter(Boolean)
            let current_path = ''
            let siblings = roots
            parts.forEach((part, index) => {
                const is_file = index === parts.length - 1
                current_path = current_path ? `${current_path}/${part}` : part
                let node = node_map.get(current_path)
                if (!node) {
                    node = {
                        key: current_path,
                        title: part,
                        isLeaf: is_file,
                        selectable: is_file,
                        children: is_file ? undefined : [ ],
                    }
                    node_map.set(current_path, node)
                    siblings.push(node)
                }
                if (!is_file) {
                    node.isLeaf = false
                    node.selectable = false
                    node.children ||= [ ]
                    siblings = node.children
                }
            })
        }
        return roots
    }
    
    
    async function open_skill_detail (skill: ISkillInfo) {
        const request_id = ++detail_request_ref.current
        file_request_ref.current += 1
        set_detail_skill(skill)
        set_skill_instruction('')
        set_skill_files([ ])
        set_selected_skill_file('')
        set_skill_file_content('')
        set_loading_detail(true)
        try {
            const [instruction, files] = await Promise.all([
                chat_model.load_skill_instruction(skill.skillId).catch(() => null),
                chat_model.load_skill_files(skill.skillId).catch(() => ({ items: [ ] })),
            ])
            if (request_id !== detail_request_ref.current)
                return
            if (instruction)
                set_skill_instruction(instruction.instruction || instruction.content || JSON.stringify(instruction, null, 2))
            set_skill_files(files.items || [ ])
        } finally {
            if (request_id === detail_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    
    async function open_skill_file (file_path: string) {
        if (!detail_skill)
            return
        const request_id = ++file_request_ref.current
        const skill_id = detail_skill.skillId
        set_selected_skill_file(file_path)
        set_skill_file_content('')
        set_loading_detail(true)
        try {
            const file = await chat_model.get_skill_file(skill_id, file_path)
            if (request_id !== file_request_ref.current || skill_id !== detail_skill.skillId)
                return
            set_skill_file_content(decode_skill_file(file.content, file.encoding))
        } catch (error) {
            if (request_id === file_request_ref.current)
                message.error(error instanceof Error ? error.message : t('加载文件失败'))
        } finally {
            if (request_id === file_request_ref.current)
                set_loading_detail(false)
        }
    }
    
    if (loading && !creating)
        return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        
    return <div style={{ maxHeight: 520, overflow: 'auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button
                type='dashed'
                icon={<PlusOutlined />}
                onClick={() => { set_creating(!creating) }}
            >
                {t('注册技能')}
            </Button>
        </div>
        
        {creating && <div style={{
            border: '1px solid #d9d9d9', borderRadius: 6, padding: 16, marginBottom: 16,
        }}>
            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('技能包')} (ZIP) *</div>
                <Upload
                    accept='.zip'
                    maxCount={1}
                    beforeUpload={file => {
                        set_skill_file(file)
                        return false
                    }}
                    onRemove={() => { set_skill_file(null) }}
                >
                    <Button icon={<UploadOutlined />}>{t('选择 ZIP 文件')}</Button>
                </Upload>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {t('ZIP 包须包含 SKILL.md 入口文件（含 YAML frontmatter 元数据和 Markdown 指令体）')}
                </div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>{t('覆盖元数据（可选，覆盖 SKILL.md 中的同名字段）')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('名称')}</div>
                    <Input
                        value={overrides.name}
                        onChange={e => { set_overrides({ ...overrides, name: e.target.value }) }}
                        placeholder={t('例如: search-database')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('显示名称')}</div>
                    <Input
                        value={overrides.displayName}
                        onChange={e => { set_overrides({ ...overrides, displayName: e.target.value }) }}
                        placeholder={t('例如: 数据库搜索')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('分类')}</div>
                    <Input
                        value={overrides.category}
                        onChange={e => { set_overrides({ ...overrides, category: e.target.value }) }}
                        placeholder={t('例如: database')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('版本')}</div>
                    <Input
                        value={overrides.version}
                        onChange={e => { set_overrides({ ...overrides, version: e.target.value }) }}
                        placeholder={t('例如: 1.0.0')}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                    <Input.TextArea
                        value={overrides.description}
                        onChange={e => { set_overrides({ ...overrides, description: e.target.value }) }}
                        placeholder={t('技能描述，会作为 Agent 调用技能时的参考信息')}
                        rows={3}
                    />
                </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => {
                    set_creating(false)
                    set_skill_file(null)
                    set_overrides({ name: '', displayName: '', description: '', category: '', version: '' })
                }}>{t('取消')}</Button>
                <Button type='primary' loading={loading} onClick={async () => {
                    if (!skill_file) {
                        message.warning(t('请选择技能包 ZIP 文件'))
                        return
                    }
                    set_loading(true)
                    try {
                        const override_obj: Record<string, string> = { }
                        for (const [k, v] of Object.entries(overrides))
                            if (v.trim())
                                override_obj[k] = v.trim()
                                
                        await chat_model.register_skill(
                            skill_file,
                            Object.keys(override_obj).length > 0 ? override_obj : undefined,
                        )
                        message.success(t('技能注册成功'))
                        set_creating(false)
                        set_skill_file(null)
                        set_overrides({ name: '', displayName: '', description: '', category: '', version: '' })
                        await load()
                    } catch (e: any) {
                        message.error(e.message || t('注册失败'))
                    } finally {
                        set_loading(false)
                    }
                }}>{t('注册')}</Button>
            </div>
        </div>}
        
        {all_skills.length === 0
            ? <Empty description={t('暂无可用技能，请先创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : <Table
                size='small'
                rowKey='skillId'
                dataSource={all_skills}
                pagination={false}
                columns={[
                    {
                        title: t('技能'),
                        render: (_: unknown, s: ISkillInfo) => <div>
                            <div>{s.displayName || s.name}</div>
                            <Text type='secondary'>{s.description || t('无描述')}</Text>
                        </div>,
                    },
                    {
                        title: t('分类'),
                        width: 110,
                        render: (_: unknown, s: ISkillInfo) => s.category ? <Tag>{s.category}</Tag> : '-',
                    },
                    {
                        title: t('版本'),
                        width: 90,
                        render: (_: unknown, s: ISkillInfo) => s.version ? <Tag color='blue'>v{s.version}</Tag> : '-',
                    },
                    {
                        title: t('状态'),
                        width: 90,
                        render: (_: unknown, s: ISkillInfo) => <Tag color={s.enabled !== false ? 'green' : 'default'}>{s.enabled !== false ? t('启用') : t('禁用')}</Tag>,
                    },
                    {
                        title: t('操作'),
                        width: 220,
                        render: (_: unknown, s: ISkillInfo) => <Space size={4}>
                            <Button size='small' onClick={() => { open_skill_detail(s) }}>{t('详情')}</Button>
                            {s.enabled === false
                                ? <Button
                                    size='small'
                                    icon={<CheckCircleOutlined />}
                                    onClick={async () => {
                                        try {
                                            await chat_model.set_skill_enabled(s.skillId, true)
                                            message.success(t('已激活'))
                                            await load()
                                        } catch (e: any) {
                                            message.error(e.message || t('操作失败'))
                                        }
                                    }}
                                >{t('启用')}</Button>
                                : <Popconfirm
                                    title={t('确定禁用此技能？')}
                                    onConfirm={async () => {
                                        try {
                                            await chat_model.set_skill_enabled(s.skillId, false)
                                            message.success(t('已禁用'))
                                            await load()
                                        } catch (e: any) {
                                            message.error(e.message || t('操作失败'))
                                        }
                                    }}
                                >
                                    <Button size='small' icon={<StopOutlined />}>{t('禁用')}</Button>
                                </Popconfirm>
                            }
                            <Popconfirm
                                title={t('确定删除此技能？')}
                                onConfirm={async () => {
                                    try {
                                        await chat_model.delete_skill(s.skillId)
                                        message.success(t('已删除'))
                                        await load()
                                    } catch (e: any) {
                                        message.error(e.message || t('删除失败'))
                                    }
                                }}
                            >
                                <Button size='small' danger icon={<DeleteOutlined />}>{t('删除')}</Button>
                            </Popconfirm>
                        </Space>,
                    },
                ]}
            />
        }
        <Modal
            title={detail_skill ? t('技能详情：{{name}}', { name: detail_skill.displayName || detail_skill.name }) : t('技能详情')}
            open={Boolean(detail_skill)}
            onCancel={() => {
                detail_request_ref.current += 1
                file_request_ref.current += 1
                set_detail_skill(null)
            }}
            footer={null}
            width={1120}
            styles={{ body: { maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' } }}
        >
            {detail_skill && <Spin spinning={loading_detail}>
                <Space direction='vertical' style={{ width: '100%' }}>
                    <Tabs
                        items={[
                            {
                                key: 'basic',
                                label: t('基本信息'),
                                children: <Space direction='vertical' style={{ width: '100%' }}>
                                    <Table
                                        size='small'
                                        pagination={false}
                                        showHeader={false}
                                        rowKey='key'
                                        dataSource={[
                                            { key: 'id', label: 'ID', value: detail_skill.skillId },
                                            { key: 'name', label: t('名称'), value: detail_skill.name },
                                            { key: 'displayName', label: t('显示名称'), value: detail_skill.displayName || '-' },
                                            { key: 'category', label: t('分类'), value: detail_skill.category || '-' },
                                            { key: 'version', label: t('版本'), value: detail_skill.version || '-' },
                                            { key: 'common', label: t('公共技能'), value: detail_skill.isCommon ? t('是') : t('否') },
                                            { key: 'owner', label: t('所有者'), value: detail_skill.ownerUserId || '-' },
                                            { key: 'license', label: 'License', value: detail_skill.license || '-' },
                                            { key: 'compatibility', label: t('兼容性'), value: detail_skill.compatibility || '-' },
                                            { key: 'argumentHint', label: t('参数提示'), value: detail_skill.argumentHint || '-' },
                                            { key: 'contentRevision', label: t('内容版本'), value: detail_skill.contentRevision ?? '-' },
                                            { key: 'contentHash', label: t('内容 Hash'), value: detail_skill.contentHash || '-' },
                                            { key: 'updateTime', label: t('更新时间'), value: detail_skill.updateTime || '-' },
                                        ]}
                                        columns={[
                                            { dataIndex: 'label', width: 120 },
                                            { dataIndex: 'value', render: (value: unknown) => String(value) },
                                        ]}
                                    />
                                    <div>
                                        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('技能指令')}</div>
                                        <Input.TextArea value={skill_instruction || t('暂无指令')} rows={16} readOnly />
                                    </div>
                                </Space>,
                            },
                            {
                                key: 'files',
                                label: t('技能文件'),
                                children: skill_files.length === 0
                                    ? <Empty description={t('暂无技能文件')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    : <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, height: 'calc(100vh - 260px)', minHeight: 520 }}>
                                        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8, overflow: 'auto', minHeight: 0 }}>
                                            <Tree
                                                blockNode
                                                defaultExpandAll
                                                selectedKeys={selected_skill_file ? [selected_skill_file] : [ ]}
                                                treeData={build_skill_file_tree(skill_files)}
                                                onSelect={keys => {
                                                    const file_path = String(keys[0] || '')
                                                    if (file_path)
                                                        open_skill_file(file_path)
                                                }}
                                            />
                                        </div>
                                        <div style={{ minWidth: 0, minHeight: 0 }}>
                                            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                <Text strong>{t('文件预览')}</Text>
                                                <Text type='secondary' ellipsis>{selected_skill_file || t('请选择左侧文件')}</Text>
                                            </div>
                                            <Input.TextArea
                                                value={selected_skill_file ? skill_file_content || t('文件内容为空') : t('请选择左侧文件')}
                                                style={{ height: 'calc(100% - 32px)', resize: 'none' }}
                                                readOnly
                                            />
                                        </div>
                                    </div>,
                            },
                        ]}
                    />
                </Space>
            </Spin>}
        </Modal>
    </div>
}


export function SettingsModal () {
    const { settings_visible } = chat_model.use(['settings_visible'])
    const { admin } = model.use(['admin'])
    const [builtin_status, set_builtin_status] = useState<IBuiltinInitResult | null>(null)
    const [checking_builtin, set_checking_builtin] = useState(false)
    const [initializing_builtin, set_initializing_builtin] = useState(false)
    
    useEffect(() => {
        if (!settings_visible)
            return
        let disposed = false
        set_checking_builtin(true)
        chat_model.load_builtin_init_status(false)
            .then(result => {
                if (!disposed)
                    set_builtin_status(result)
            })
            .catch(error => {
                console.error('Load built-in Agent/Skill init status failed:', error)
                if (!disposed)
                    set_builtin_status(null)
            })
            .finally(() => {
                if (!disposed)
                    set_checking_builtin(false)
            })
        return () => { disposed = true }
    }, [settings_visible])
    
    const builtin_ready = builtin_status?.initialized === true || builtin_status?.state === 'READY'
    const show_builtin_init = checking_builtin || Boolean(builtin_status && !builtin_ready)
    
    async function initialize_builtins () {
        set_initializing_builtin(true)
        try {
            const result = await chat_model.init_builtins({ dryRun: false, includeDetails: false })
            set_builtin_status(result)
            if (result.initialized === true || result.state === 'READY') {
                message.success(t('初始化完成'))
                await chat_model.load_agents()
            } else {
                console.warn('Built-in Agent/Skill init finished but is not ready:', result)
                message.error(t('初始化未完成，详情请查看控制台'))
            }
        } catch (error) {
            console.error('Built-in Agent/Skill init failed:', error)
            message.error(t('初始化失败，详情请查看控制台'))
        } finally {
            set_initializing_builtin(false)
        }
    }
    
    return <Modal
        title={t('AI 设置')}
        open={settings_visible}
        onCancel={() => { chat_model.set({ settings_visible: false }) }}
        footer={null}
        width={960}
        destroyOnClose
    >
        <div style={{ position: 'relative', minHeight: 520 }}>
            <Tabs
                destroyInactiveTabPane
                items={[
                    {
                        key: 'agent',
                        label: t('Agent 管理'),
                        children: <AgentTab />,
                    },
                    {
                        key: 'llm',
                        label: t('模型配置'),
                        children: <LlmConfigTab />,
                    },
                    {
                        key: 'skills',
                        label: t('技能管理'),
                        children: <SkillsTab />,
                    },
                    {
                        key: 'user',
                        label: t('个人中心'),
                        children: <DolphinXUserTab />,
                    },
                    ...admin
                        ? [{
                            key: 'admin',
                            label: t('用户管理'),
                            children: <DolphinXAdminTab />,
                        }]
                        : [ ],
                ]}
            />
            {show_builtin_init && <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(1px)',
            }}>
                <div style={{
                    width: 420,
                    padding: 28,
                    borderRadius: 8,
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    textAlign: 'center',
                }}>
                    {checking_builtin
                        ? <Spin />
                        : <>
                            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{t('需要初始化 AI 内置资源')}</div>
                            <Text type='secondary'>{t('首次使用 AI 前，需要初始化内置 Agent 和 Skill。')}</Text>
                            <div style={{ marginTop: 20 }}>
                                {admin
                                    ? <Button type='primary' size='large' loading={initializing_builtin} onClick={initialize_builtins}>{t('一键初始化')}</Button>
                                    : <Text type='danger'>{t('请联系管理员完成初始化')}</Text>
                                }
                            </div>
                        </>
                    }
                </div>
            </div>}
        </div>
    </Modal>
}
