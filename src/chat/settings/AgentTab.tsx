import { useEffect, useState } from 'react'

import {
    Button, Empty, Input, InputNumber, message, Popconfirm, Space, Spin, Switch, Tabs, Tag, Tooltip, Typography,
} from 'antd'
import {
    CheckCircleOutlined, DeleteOutlined, DisconnectOutlined, LinkOutlined, PlusOutlined, SaveOutlined, StopOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from '@/chat/model.ts'
import type { IAgentInfo, IAgentLlmBinding, ILlmConfig, ISkillBinding, ISkillInfo } from '@/chat/model.ts'
import { field_error, required_label } from './common.tsx'


const { Paragraph, Text } = Typography


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
            set_form_error(t('请输入 Agent 名称'))
            return
        }
        set_form_error('')
        set_loading(true)
        try {
            await chat_model.register_agent({
                agentName: form.agentName.trim(),
                description: form.description || undefined,
                systemPrompt: form.systemPrompt || undefined,
            })
            message.success(t('Agent 创建成功'))
            set_creating(false)
            set_form({ agentName: '', description: '', systemPrompt: '' })
        } catch (e: any) {
            message.error(e.message || t('创建失败'))
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
    
    return <div style={{ display: 'flex', height: 520 }}>
        {/* 左侧 Agent 列表 */}
        <div style={{ width: 260, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
                                {a.description && <Paragraph type='secondary' style={{ fontSize: 11, margin: '2px 0 0' }} ellipsis={{ rows: 2, tooltip: a.description }}>
                                    {a.description}
                                </Paragraph>}
                            </div>
                        )
                }
            </div>
        </div>
        
        {/* 右侧详情 */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '0 16px' }}>
            {creating
                ? <div style={{ padding: '16px 0' }}>
                    <div style={{ display: 'grid', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('Agent 名称'))}</div>
                            <Input
                                value={form.agentName}
                                onChange={e => { set_form({ ...form, agentName: e.target.value }) }}
                                placeholder={t('例如: DolphinDB 助手')}
                            />
                            {field_error(form_error, t('请输入 Agent 名称'))}
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
    const [loading, set_loading] = useState(true)
    const [saving_agent, set_saving_agent] = useState(false)
    const [binding_tab_key, set_binding_tab_key] = useState('llm')
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
    const skill_items = [
        ...bound_skills.map(binding => ({ binding, skill: binding.skill || all_skills.find(s => s.skillId === binding.skillId) })),
        ...unbound_skills.map(skill => ({ binding: undefined, skill })),
    ]
    
    return <div style={{ padding: '12px 0' }}>
        {/* Agent 基本信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{agent.agentName}</div>
                {agent.description && <Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2 }} ellipsis={{ tooltip: agent.description }}>
                    {agent.description}
                </Text>}
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
                    okButtonProps={{ danger: true }}
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
                        {skill_items.length > 0
                            ? <div style={{ marginBottom: 12 }}>
                            {skill_items.map(({ binding, skill }) => {
                                const skill_id = binding?.skillId ?? skill!.skillId
                                return <div key={skill_id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 10px', border: binding ? '1px solid #f0f0f0' : '1px dashed #d9d9d9', borderRadius: 4, marginBottom: 4,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{skill?.displayName || skill?.name || skill_id}</span>
                                        <Tag color={binding?.enabled ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                            {binding?.enabled ? t('启用') : t('禁用')}
                                        </Tag>
                                        {skill?.description && <span style={{ color: '#999', fontSize: 12 }}>{skill.description.slice(0, 40)}</span>}
                                    </div>
                                    <Switch
                                        size='small'
                                        checked={!!binding?.enabled}
                                        onChange={async checked => {
                                            try {
                                                await chat_model.toggle_skill_binding(skill_id, checked, agent.agentId)
                                                message.success(checked ? t('已启用') : t('已禁用'))
                                                await load()
                                            } catch (err: any) {
                                                message.error(err.message || t('操作失败'))
                                            }
                                        }}
                                    />
                                </div>
                            })}
                            </div>
                            : <Empty description={t('暂无可用技能，请先在「技能管理」中上传')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>,
                },
            ]} />
        }
    </div>
}
