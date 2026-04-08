import { useEffect, useState } from 'react'

import {
    Modal, Tabs, Input, Button, Switch, Space, Tag, Tooltip,
    Popconfirm, InputNumber, Empty, Spin, message,
} from 'antd'
import {
    PlusOutlined, DeleteOutlined, EditOutlined, StarOutlined, StarFilled,
    SaveOutlined,
} from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from './model.ts'


const { TextArea } = Input


interface Provider {
    providerId: string
    providerName: string
    baseUrl: string
    apiKey: string
    description: string
    headers: string
    defaultModelId: string
    createTime: string
    updateTime: string
    isEnabled: boolean
}

interface ProviderModel {
    modelId: string
    providerId: string
    modelName: string
    modelCode: string
    contextWindow: number
    supportTool: boolean
    temperature: number
    topP: number
    maxTokens: number
    extraConfig: string
    isDefault: boolean
    createTime: string
    updateTime: string
    isEnabled: boolean
}

interface Skill {
    skillId: string
    skillName: string
    description: string
    script: string
    createTime: string
    updateTime: string
    isEnabled: boolean
}


function ServerSettingsTab () {
    const [url_input, set_url_input] = useState(chat_model.server_url)
    const [saving, set_saving] = useState(false)
    
    useEffect(() => {
        set_url_input(chat_model.server_url)
    }, [])
    
    return <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('后端服务地址')}</div>
        <Space.Compact style={{ width: '100%' }}>
            <Input
                value={url_input}
                onChange={e => {
                    set_url_input(e.target.value)
                }}
                placeholder='http://localhost:3012'
            />
            <Button
                type='primary'
                icon={<SaveOutlined />}
                loading={saving}
                onClick={async () => {
                    set_saving(true)
                    try {
                        chat_model.set_server_url(url_input)
                        await chat_model.init()
                        message.success(t('保存成功'))
                    } catch {
                        message.error(t('连接失败，请检查地址'))
                    } finally {
                        set_saving(false)
                    }
                }}
            >
                {t('保存')}
            </Button>
        </Space.Compact>
    </div>
}


function ProviderSettingsTab () {
    const [providers, set_providers] = useState<Provider[]>([ ])
    const [selected_id, set_selected_id] = useState('')
    const [is_creating, set_is_creating] = useState(false)
    const [provider_form, set_provider_form] = useState({
        providerName: '',
        baseUrl: '',
        apiKey: '',
        headers: '',
        description: '',
        isEnabled: true,
    })
    const [models, set_models] = useState<ProviderModel[]>([ ])
    const [loading, set_loading] = useState(false)
    const [saving, set_saving] = useState(false)
    const [model_modal_visible, set_model_modal_visible] = useState(false)
    const [editing_model, set_editing_model] = useState<ProviderModel | null>(null)
    const [model_form, set_model_form] = useState({
        modelName: '',
        modelCode: '',
        contextWindow: 4096,
        supportTool: false,
        temperature: 0.7,
        topP: 1,
        maxTokens: 4096,
        extraConfig: '',
        isEnabled: true,
    })
    const [model_saving, set_model_saving] = useState(false)
    
    async function load_providers () {
        set_loading(true)
        try {
            const res = await chat_model.api_fetch('/api/providers')
            set_providers(res.providers || [ ])
        } catch {
            message.error(t('加载提供商列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    async function load_models (provider_id: string) {
        try {
            const res = await chat_model.api_fetch(`/api/providers/${provider_id}/models`)
            set_models(res.models || [ ])
        } catch {
            set_models([ ])
        }
    }
    
    async function select_provider (provider: Provider) {
        set_selected_id(provider.providerId)
        set_is_creating(false)
        set_provider_form({
            providerName: provider.providerName,
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            headers: provider.headers || '',
            description: provider.description || '',
            isEnabled: provider.isEnabled,
        })
        await load_models(provider.providerId)
    }
    
    async function save_provider () {
        set_saving(true)
        try {
            if (selected_id) {
                await chat_model.api_fetch(`/api/providers/${selected_id}`, {
                    method: 'PUT',
                    body: JSON.stringify(provider_form),
                })
                message.success(t('保存成功'))
            } else {
                const res = await chat_model.api_fetch('/api/providers', {
                    method: 'POST',
                    body: JSON.stringify(provider_form),
                })
                set_selected_id(res.provider.providerId)
                set_is_creating(false)
                message.success(t('创建成功'))
            }
            await load_providers()
        } catch {
            message.error(t('保存失败'))
        } finally {
            set_saving(false)
        }
    }
    
    async function delete_provider (provider_id: string) {
        try {
            await chat_model.api_fetch(`/api/providers/${provider_id}`, { method: 'DELETE' })
            message.success(t('删除成功'))
            if (selected_id === provider_id) {
                set_selected_id('')
                set_is_creating(false)
                set_provider_form({ providerName: '', baseUrl: '', apiKey: '', headers: '', description: '', isEnabled: true })
                set_models([ ])
            }
            await load_providers()
        } catch {
            message.error(t('删除失败'))
        }
    }
    
    function new_provider () {
        set_selected_id('')
        set_is_creating(true)
        set_provider_form({ providerName: '', baseUrl: '', apiKey: '', headers: '', description: '', isEnabled: true })
        set_models([ ])
    }
    
    function open_model_modal (model_item?: ProviderModel) {
        if (model_item) {
            set_editing_model(model_item)
            set_model_form({
                modelName: model_item.modelName,
                modelCode: model_item.modelCode,
                contextWindow: model_item.contextWindow,
                supportTool: model_item.supportTool,
                temperature: model_item.temperature,
                topP: model_item.topP,
                maxTokens: model_item.maxTokens,
                extraConfig: model_item.extraConfig || '',
                isEnabled: model_item.isEnabled,
            })
        } else {
            set_editing_model(null)
            set_model_form({
                modelName: '',
                modelCode: '',
                contextWindow: 4096,
                supportTool: false,
                temperature: 0.7,
                topP: 1,
                maxTokens: 4096,
                extraConfig: '',
                isEnabled: true,
            })
        }
        set_model_modal_visible(true)
    }
    
    async function save_model () {
        set_model_saving(true)
        try {
            const payload = {
                modelName: model_form.modelName,
                modelCode: model_form.modelCode,
                contextWindow: model_form.contextWindow,
                supportTool: model_form.supportTool,
                temperature: model_form.temperature,
                topP: model_form.topP,
                maxTokens: model_form.maxTokens,
                extraConfig: model_form.extraConfig,
                isEnabled: model_form.isEnabled,
            }
            if (editing_model)
                await chat_model.api_fetch(`/api/providers/${selected_id}/models/${editing_model.modelId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                })
            else
                await chat_model.api_fetch(`/api/providers/${selected_id}/models`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
            
            message.success(t('保存成功'))
            set_model_modal_visible(false)
            await load_models(selected_id)
        } catch {
            message.error(t('保存失败'))
        } finally {
            set_model_saving(false)
        }
    }
    
    async function delete_model (model_id: string) {
        try {
            await chat_model.api_fetch(`/api/providers/${selected_id}/models/${model_id}`, { method: 'DELETE' })
            message.success(t('删除成功'))
            await load_models(selected_id)
        } catch {
            message.error(t('删除失败'))
        }
    }
    
    async function set_default_model (model_id: string) {
        try {
            await chat_model.api_fetch(`/api/providers/${selected_id}/models/${model_id}/default`, { method: 'PUT' })
            message.success(t('已设为默认模型'))
            await load_models(selected_id)
        } catch {
            message.error(t('设置默认模型失败'))
        }
    }
    
    useEffect(() => {
        load_providers()
    }, [ ])
    
    return <div style={{ display: 'flex', height: 520 }}>
        {/* Left: provider list */}
        <div style={{
            width: 280, borderRight: '1px solid #f0f0f0', display: 'flex',
            flexDirection: 'column', flexShrink: 0,
        }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={new_provider}>
                    {t('新建提供商')}
                </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading
                    ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    : providers.length === 0
                        ? <Empty description={t('暂无提供商')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : providers.map(p =>
                            <div
                                key={p.providerId}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between',
                                    background: p.providerId === selected_id ? '#e6f4ff' : 'transparent',
                                    borderLeft: p.providerId === selected_id ? '3px solid #1677ff' : '3px solid transparent',
                                }}
                                onClick={() => { select_provider(p) }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 500, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {p.providerName}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                        {p.baseUrl}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                                    {!p.isEnabled && <Tag color='default'>{t('已禁用')}</Tag>}
                                    <Popconfirm
                                        title={t('确定删除此提供商？')}
                                        onConfirm={async e => {
                                            e?.stopPropagation()
                                            await delete_provider(p.providerId)
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
        
        {/* Right: provider form + models */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
            {!selected_id && !is_creating && providers.length > 0
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请选择一个提供商或新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>
                            {selected_id ? t('编辑提供商') : t('新建提供商')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                            <div>
                                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('提供商名称')}</div>
                                <Input
                                    value={provider_form.providerName}
                                    onChange={e => { set_provider_form({ ...provider_form, providerName: e.target.value }) }}
                                    placeholder={t('提供商名称')}
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 4, fontSize: 13 }}>Base URL</div>
                                <Input
                                    value={provider_form.baseUrl}
                                    onChange={e => { set_provider_form({ ...provider_form, baseUrl: e.target.value }) }}
                                    placeholder='https://api.openai.com/v1'
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 4, fontSize: 13 }}>API Key</div>
                                <Input.Password
                                    value={provider_form.apiKey}
                                    onChange={e => { set_provider_form({ ...provider_form, apiKey: e.target.value }) }}
                                    placeholder='sk-...'
                                />
                            </div>
                            <div>
                                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('自定义请求头')}</div>
                                <Input
                                    value={provider_form.headers}
                                    onChange={e => { set_provider_form({ ...provider_form, headers: e.target.value }) }}
                                    placeholder='{"X-Custom": "value"}'
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                                <Input
                                    value={provider_form.description}
                                    onChange={e => { set_provider_form({ ...provider_form, description: e.target.value }) }}
                                    placeholder={t('描述')}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13 }}>{t('启用')}</span>
                                <Switch
                                    checked={provider_form.isEnabled}
                                    onChange={val => { set_provider_form({ ...provider_form, isEnabled: val }) }}
                                />
                            </div>
                            <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={save_provider}>
                                {t('保存')}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Models section */}
                    {selected_id && <>
                        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', marginBottom: 12,
                            }}>
                                <span style={{ fontWeight: 500, fontSize: 15 }}>{t('模型列表')}</span>
                                <Button
                                    type='dashed'
                                    size='small'
                                    icon={<PlusOutlined />}
                                    onClick={() => { open_model_modal() }}
                                >
                                    {t('新增模型')}
                                </Button>
                            </div>
                            {models.length === 0
                                ? <Empty description={t('暂无模型')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {models.map(m =>
                                        <div
                                            key={m.modelId}
                                            style={{
                                                border: '1px solid #f0f0f0', borderRadius: 6, padding: '10px 14px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 500 }}>{m.modelName}</span>
                                                    {m.isDefault && <Tag color='gold'>{t('默认')}</Tag>}
                                                    {!m.isEnabled && <Tag color='default'>{t('已禁用')}</Tag>}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                                                    {m.modelCode || m.modelId}
                                                    {' · '}temperature: {m.temperature}
                                                </div>
                                            </div>
                                            <Space size={4}>
                                                <Tooltip title={t('设为默认')}>
                                                    <Button
                                                        type='text'
                                                        size='small'
                                                        icon={m.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                                        onClick={async () => { await set_default_model(m.modelId) }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title={t('编辑')}>
                                                    <Button
                                                        type='text'
                                                        size='small'
                                                        icon={<EditOutlined />}
                                                        onClick={() => { open_model_modal(m) }}
                                                    />
                                                </Tooltip>
                                                <Popconfirm
                                                    title={t('确定删除此模型？')}
                                                    onConfirm={async () => { await delete_model(m.modelId) }}
                                                >
                                                    <Button type='text' size='small' danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            }
                        </div>
                    </>}
                </>
            }
        </div>
        
        {/* Model editing modal */}
        <Modal
            title={editing_model ? t('编辑模型') : t('新增模型')}
            open={model_modal_visible}
            onCancel={() => { set_model_modal_visible(false) }}
            onOk={save_model}
            confirmLoading={model_saving}
            destroyOnClose
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 16 }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('模型名称')}</div>
                    <Input
                        value={model_form.modelName}
                        onChange={e => { set_model_form({ ...model_form, modelName: e.target.value }) }}
                        placeholder={t('模型名称')}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('模型代码')}</div>
                    <Input
                        value={model_form.modelCode}
                        onChange={e => { set_model_form({ ...model_form, modelCode: e.target.value }) }}
                        placeholder='gpt-4o'
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>Temperature</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={model_form.temperature}
                        onChange={val => { set_model_form({ ...model_form, temperature: val ?? 0.7 }) }}
                        min={0}
                        max={2}
                        step={0.1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>Top P</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={model_form.topP}
                        onChange={val => { set_model_form({ ...model_form, topP: val ?? 1 }) }}
                        min={0}
                        max={1}
                        step={0.1}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{t('启用')}</span>
                    <Switch
                        checked={model_form.isEnabled}
                        onChange={val => { set_model_form({ ...model_form, isEnabled: val }) }}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('额外配置')}</div>
                    <TextArea
                        value={model_form.extraConfig}
                        onChange={e => { set_model_form({ ...model_form, extraConfig: e.target.value }) }}
                        placeholder='{"key": "value"}'
                        rows={3}
                    />
                </div>
            </div>
        </Modal>
    </div>
}


function SkillsTab () {
    const [skills, set_skills] = useState<Skill[]>([ ])
    const [selected_id, set_selected_id] = useState('')
    const [is_creating, set_is_creating] = useState(false)
    const [skill_form, set_skill_form] = useState({
        skillName: '',
        description: '',
        script: '',
        isEnabled: true,
    })
    const [loading, set_loading] = useState(false)
    const [saving, set_saving] = useState(false)
    
    async function load_skills () {
        set_loading(true)
        try {
            const res = await chat_model.api_fetch('/api/skills')
            set_skills(res.skills || [ ])
        } catch {
            message.error(t('加载技能列表失败'))
        } finally {
            set_loading(false)
        }
    }
    
    function select_skill (skill: Skill) {
        set_selected_id(skill.skillId)
        set_is_creating(false)
        set_skill_form({
            skillName: skill.skillName,
            description: skill.description || '',
            script: skill.script || '',
            isEnabled: skill.isEnabled,
        })
    }
    
    function new_skill () {
        set_selected_id('')
        set_is_creating(true)
        set_skill_form({ skillName: '', description: '', script: '', isEnabled: true })
    }
    
    async function save_skill () {
        set_saving(true)
        try {
            if (selected_id) {
                await chat_model.api_fetch(`/api/skills/${selected_id}`, {
                    method: 'PUT',
                    body: JSON.stringify(skill_form),
                })
                message.success(t('保存成功'))
            } else {
                const res = await chat_model.api_fetch('/api/skills', {
                    method: 'POST',
                    body: JSON.stringify(skill_form),
                })
                set_selected_id(res.skill.skillId)
                set_is_creating(false)
                message.success(t('创建成功'))
            }
            await load_skills()
        } catch {
            message.error(t('保存失败'))
        } finally {
            set_saving(false)
        }
    }
    
    async function delete_skill (skill_id: string) {
        try {
            await chat_model.api_fetch(`/api/skills/${skill_id}`, { method: 'DELETE' })
            message.success(t('删除成功'))
            if (selected_id === skill_id) {
                set_selected_id('')
                set_is_creating(false)
                set_skill_form({ skillName: '', description: '', script: '', isEnabled: true })
            }
            await load_skills()
        } catch {
            message.error(t('删除失败'))
        }
    }
    
    useEffect(() => {
        load_skills()
    }, [ ])
    
    return <div style={{ display: 'flex', height: 520 }}>
        {/* Left: skill list */}
        <div style={{
            width: 280, borderRight: '1px solid #f0f0f0', display: 'flex',
            flexDirection: 'column', flexShrink: 0,
        }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={new_skill}>
                    {t('新建技能')}
                </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                {loading
                    ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    : skills.length === 0
                        ? <Empty description={t('暂无技能')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        : skills.map(s =>
                            <div
                                key={s.skillId}
                                style={{
                                    padding: '10px 16px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between',
                                    background: s.skillId === selected_id ? '#e6f4ff' : 'transparent',
                                    borderLeft: s.skillId === selected_id ? '3px solid #1677ff' : '3px solid transparent',
                                }}
                                onClick={() => { select_skill(s) }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 500, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {s.skillName}
                                    </div>
                                    <div style={{
                                        fontSize: 12, color: '#999', marginTop: 2,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {s.description || t('无描述')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                                    {!s.isEnabled && <Tag color='default'>{t('已禁用')}</Tag>}
                                    <Popconfirm
                                        title={t('确定删除此技能？')}
                                        onConfirm={async e => {
                                            e?.stopPropagation()
                                            await delete_skill(s.skillId)
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
        
        {/* Right: skill form */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
            {!selected_id && !is_creating && skills.length > 0
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请选择一个技能或新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>
                        {selected_id ? t('编辑技能') : t('新建技能')}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>{t('技能名称')}</div>
                        <Input
                            value={skill_form.skillName}
                            onChange={e => { set_skill_form({ ...skill_form, skillName: e.target.value }) }}
                            placeholder={t('技能名称')}
                        />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>{t('描述')}</div>
                        <Input
                            value={skill_form.description}
                            onChange={e => { set_skill_form({ ...skill_form, description: e.target.value }) }}
                            placeholder={t('描述')}
                        />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>{t('脚本')}</div>
                        <TextArea
                            value={skill_form.script}
                            onChange={e => { set_skill_form({ ...skill_form, script: e.target.value }) }}
                            placeholder={t('输入技能脚本内容')}
                            rows={10}
                            style={{ fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13 }}>{t('启用')}</span>
                            <Switch
                                checked={skill_form.isEnabled}
                                onChange={val => { set_skill_form({ ...skill_form, isEnabled: val }) }}
                            />
                        </div>
                        <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={save_skill}>
                            {t('保存')}
                        </Button>
                    </div>
                </>
            }
        </div>
    </div>
}


export function SettingsModal () {
    const { settings_visible } = chat_model.use(['settings_visible'])
    
    return <Modal
        title={t('设置')}
        open={settings_visible}
        onCancel={() => { chat_model.set({ settings_visible: false }) }}
        footer={null}
        width={960}
        destroyOnClose
    >
        <Tabs
            items={[
                {
                    key: 'server',
                    label: t('服务设置'),
                    children: <ServerSettingsTab />,
                },
                {
                    key: 'providers',
                    label: t('模型配置'),
                    children: <ProviderSettingsTab />,
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
