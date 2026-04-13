import { useEffect, useState } from 'react'

import {
    Modal, Tabs, Input, Button, Switch, Space, Tag, Tooltip,
    Popconfirm, InputNumber, Empty, Spin, Select, message, Upload,
} from 'antd'
import {
    PlusOutlined, DeleteOutlined, EditOutlined,
    SaveOutlined, LinkOutlined, DisconnectOutlined,
    CheckCircleOutlined, PauseCircleOutlined,
    UploadOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from './model.ts'
import type { ILlmConfig, ISkillInfo, ISkillBinding, IAgentInfo } from './model.ts'


const PROVIDER_OPTIONS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'qwen', label: 'Qwen' },
    { value: 'zhipu', label: 'Zhipu' },
    { value: 'custom', label: t('自定义') },
]


function AgentTab () {
    const { agents, agent_id } = chat_model.use(['agents', 'agent_id'])
    
    const [creating, set_creating] = useState(false)
    const [loading, set_loading] = useState(false)
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
    
    return <div style={{ maxHeight: 520, overflow: 'auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button
                type='dashed'
                icon={<PlusOutlined />}
                onClick={() => { set_creating(!creating) }}
            >
                {t('新建 Agent')}
            </Button>
        </div>
        
        {creating && <div style={{
            border: '1px solid #d9d9d9', borderRadius: 6, padding: 16, marginBottom: 16,
        }}>
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
        </div>}
        
        {loading && !creating
            ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            : agents.length === 0
                ? <Empty description={t('暂无 Agent，请先创建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {agents.filter(a => a.statusName !== 'DELETED').map(a =>
                        <div
                            key={a.agentId}
                            style={{
                                border: `1px solid ${a.agentId === agent_id ? '#1677ff' : '#f0f0f0'}`,
                                borderRadius: 6,
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: a.agentId === agent_id ? '#e6f4ff' : 'transparent',
                                cursor: 'pointer',
                            }}
                            onClick={() => {
                                if (a.statusName === 'ACTIVE')
                                    chat_model.select_agent(a.agentId)
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 500 }}>{a.agentName}</span>
                                    <Tag color={a.statusName === 'ACTIVE' ? 'green' : 'default'}>
                                        {a.statusName === 'ACTIVE'
                                            ? <><CheckCircleOutlined /> {t('活跃')}</>
                                            : <><PauseCircleOutlined /> {a.statusName}</>
                                        }
                                    </Tag>
                                    {a.agentId === agent_id && <Tag color='blue'>{t('当前')}</Tag>}
                                </div>
                                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                    {a.description || a.agentType}
                                </div>
                            </div>
                            <Space size={4}>
                                {a.statusName !== 'ACTIVE' && <Tooltip title={t('激活')}>
                                    <Button
                                        type='text'
                                        size='small'
                                        icon={<CheckCircleOutlined />}
                                        onClick={async e => {
                                            e.stopPropagation()
                                            try {
                                                await chat_model.activate_agent(a.agentId)
                                                message.success(t('已激活'))
                                            } catch (err: any) {
                                                message.error(err.message || t('激活失败'))
                                            }
                                        }}
                                    />
                                </Tooltip>}
                                <Popconfirm
                                    title={t('确定删除此 Agent？')}
                                    onConfirm={async e => {
                                        e?.stopPropagation()
                                        try {
                                            await chat_model.delete_agent(a.agentId)
                                            message.success(t('已删除'))
                                        } catch (err: any) {
                                            message.error(err.message || t('删除失败'))
                                        }
                                    }}
                                    onCancel={e => { e?.stopPropagation() }}
                                >
                                    <Button
                                        type='text'
                                        size='small'
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={e => { e.stopPropagation() }}
                                    />
                                </Popconfirm>
                            </Space>
                        </div>
                    )}
                </div>
        }
    </div>
}


function LlmConfigTab () {
    const [configs, set_configs] = useState<ILlmConfig[]>([ ])
    const [selected_id, set_selected_id] = useState('')
    const [is_creating, set_is_creating] = useState(false)
    const [form, set_form] = useState({
        name: '',
        provider: 'openai',
        model: '',
        endpoint: '',
        apiKey: '',
        contextWindow: 128000,
        defaultParams: '',
    })
    const [loading, set_loading] = useState(false)
    const [saving, set_saving] = useState(false)
    
    async function load () {
        set_loading(true)
        try {
            const items = await chat_model.load_llm_configs()
            set_configs(items)
        } catch {
            message.error(t('加载模型配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    function select_config (cfg: ILlmConfig) {
        set_selected_id(cfg.llmConfigId)
        set_is_creating(false)
        set_form({
            name: cfg.name,
            provider: cfg.provider,
            model: cfg.model,
            endpoint: cfg.endpoint || '',
            apiKey: cfg.apiKey || '',
            contextWindow: cfg.contextWindow || 128000,
            defaultParams: cfg.defaultParams ? JSON.stringify(cfg.defaultParams, null, 2) : '',
        })
    }
    
    function new_config () {
        set_selected_id('')
        set_is_creating(true)
        set_form({ name: '', provider: 'openai', model: '', endpoint: '', apiKey: '', contextWindow: 128000, defaultParams: '' })
    }
    
    async function save_config () {
        set_saving(true)
        try {
            let default_params: Record<string, unknown> | undefined
            if (form.defaultParams.trim())
                try { default_params = JSON.parse(form.defaultParams) } catch {
                    message.error(t('默认参数 JSON 格式错误'))
                    return
                }
            
            if (selected_id) {
                await chat_model.update_llm_config(selected_id, {
                    name: form.name,
                    provider: form.provider,
                    model: form.model,
                    endpoint: form.endpoint || undefined,
                    apiKey: form.apiKey || undefined,
                    contextWindow: form.contextWindow,
                    defaultParams: default_params,
                })
                message.success(t('保存成功'))
            } else {
                const result = await chat_model.register_llm_config({
                    name: form.name,
                    provider: form.provider,
                    model: form.model,
                    endpoint: form.endpoint || undefined,
                    apiKey: form.apiKey || undefined,
                    contextWindow: form.contextWindow,
                    defaultParams: default_params,
                })
                set_selected_id(result.llmConfigId)
                set_is_creating(false)
                message.success(t('创建成功'))
            }
            await load()
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving(false)
        }
    }
    
    async function remove_config (config_id: string) {
        try {
            await chat_model.unbind_llm_config(config_id)
            await chat_model.disable_llm_config(config_id)
            message.success(t('删除成功'))
            if (selected_id === config_id) {
                set_selected_id('')
                set_is_creating(false)
                set_form({ name: '', provider: 'openai', model: '', endpoint: '', apiKey: '', contextWindow: 128000, defaultParams: '' })
            }
            await load()
        } catch (e: any) {
            message.error(e.message || t('删除失败'))
        }
    }
    
    useEffect(() => { load() }, [ ])
    
    return <div style={{ display: 'flex', height: 520 }}>
        <div style={{
            width: 280, borderRight: '1px solid #f0f0f0', display: 'flex',
            flexDirection: 'column', flexShrink: 0,
        }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={new_config}>
                    {t('新建模型配置')}
                </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading
                    ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    : configs.length === 0
                        ? <Empty description={t('暂无模型配置')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : configs.map(c =>
                            <div
                                key={c.llmConfigId}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between',
                                    background: c.llmConfigId === selected_id ? '#e6f4ff' : 'transparent',
                                    borderLeft: c.llmConfigId === selected_id ? '3px solid #1677ff' : '3px solid transparent',
                                }}
                                onClick={() => { select_config(c) }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 500, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {c.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                        {c.provider} · {c.model}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                                    <Popconfirm
                                        title={t('确定删除此配置？')}
                                        onConfirm={async e => {
                                            e?.stopPropagation()
                                            await remove_config(c.llmConfigId)
                                        }}
                                        onCancel={e => { e?.stopPropagation() }}
                                    >
                                        <Button
                                            type='text'
                                            size='small'
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={e => { e.stopPropagation() }}
                                        />
                                    </Popconfirm>
                                </div>
                            </div>
                        )
                }
            </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
            {!selected_id && !is_creating && configs.length > 0
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请选择一个配置或新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>
                        {selected_id ? t('编辑模型配置') : t('新建模型配置')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('配置名称')}</div>
                            <Input
                                value={form.name}
                                onChange={e => { set_form({ ...form, name: e.target.value }) }}
                                placeholder={t('配置名称')}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('提供商')}</div>
                            <Select
                                style={{ width: '100%' }}
                                value={form.provider}
                                onChange={val => { set_form({ ...form, provider: val }) }}
                                options={PROVIDER_OPTIONS}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('模型')}</div>
                            <Input
                                value={form.model}
                                onChange={e => { set_form({ ...form, model: e.target.value }) }}
                                placeholder='gpt-4o'
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>Endpoint</div>
                            <Input
                                value={form.endpoint}
                                onChange={e => { set_form({ ...form, endpoint: e.target.value }) }}
                                placeholder='https://api.openai.com/v1'
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>API Key</div>
                            <Input.Password
                                value={form.apiKey}
                                onChange={e => { set_form({ ...form, apiKey: e.target.value }) }}
                                placeholder='sk-...'
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>Context Window</div>
                            <InputNumber
                                style={{ width: '100%' }}
                                value={form.contextWindow}
                                onChange={val => { set_form({ ...form, contextWindow: val ?? 128000 }) }}
                                min={1024}
                                step={1024}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{t('默认参数 (JSON)')}</div>
                            <Input.TextArea
                                value={form.defaultParams}
                                onChange={e => { set_form({ ...form, defaultParams: e.target.value }) }}
                                placeholder='{"temperature": 0.7}'
                                rows={3}
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={async () => { await save_config() }}>
                            {t('保存')}
                        </Button>
                    </div>
                </>
            }
        </div>
    </div>
}


function SkillsTab () {
    const [all_skills, set_all_skills] = useState<ISkillInfo[]>([ ])
    const [bindings, set_bindings] = useState<ISkillBinding[]>([ ])
    const [loading, set_loading] = useState(false)
    const [creating, set_creating] = useState(false)
    const [skill_file, set_skill_file] = useState<File | null>(null)
    const [overrides, set_overrides] = useState({
        name: '',
        displayName: '',
        description: '',
        category: '',
        version: '',
    })
    
    const bound_ids = new Set(bindings.filter(b => b.enabled).map(b => b.skillId))
    
    async function load () {
        set_loading(true)
        try {
            const [skills, binds] = await Promise.all([
                chat_model.load_skills(),
                chat_model.load_skill_bindings(),
            ])
            set_all_skills(skills)
            set_bindings(binds)
        } catch {
            message.error(t('加载技能列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => { load() }, [ ])
    
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
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {all_skills.map(s =>
                    <div
                        key={s.skillId}
                        style={{
                            border: '1px solid #f0f0f0', borderRadius: 6, padding: '12px 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 500 }}>{s.displayName || s.name}</span>
                                {s.category && <Tag>{s.category}</Tag>}
                                {s.version && <Tag color='blue'>v{s.version}</Tag>}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                {s.description || t('无描述')}
                            </div>
                        </div>
                        <Space size={4}>
                            {bound_ids.has(s.skillId)
                                ? <Tooltip title={t('取消绑定')}>
                                    <Button
                                        type='primary'
                                        size='small'
                                        icon={<DisconnectOutlined />}
                                        danger
                                        onClick={async () => {
                                            try {
                                                await chat_model.unbind_skill(s.skillId)
                                                message.success(t('已取消绑定'))
                                                await load()
                                            } catch (e: any) {
                                                message.error(e.message || t('操作失败'))
                                            }
                                        }}
                                    >
                                        {t('已绑定')}
                                    </Button>
                                </Tooltip>
                                : <Tooltip title={t('绑定到 Agent')}>
                                    <Button
                                        size='small'
                                        icon={<LinkOutlined />}
                                        onClick={async () => {
                                            try {
                                                await chat_model.bind_skill(s.skillId)
                                                message.success(t('绑定成功'))
                                                await load()
                                            } catch (e: any) {
                                                message.error(e.message || t('操作失败'))
                                            }
                                        }}
                                    >
                                        {t('绑定')}
                                    </Button>
                                </Tooltip>
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
                                <Button
                                    type='text'
                                    size='small'
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Popconfirm>
                        </Space>
                    </div>
                )}
            </div>
        }
    </div>
}


export function SettingsModal () {
    const { settings_visible } = chat_model.use(['settings_visible'])
    
    return <Modal
        title={t('AI 设置')}
        open={settings_visible}
        onCancel={() => { chat_model.set({ settings_visible: false }) }}
        footer={null}
        width={960}
        destroyOnClose
    >
        <Tabs
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
            ]}
        />
    </Modal>
}
