import { useEffect, useState } from 'react'

import {
    Button, Empty, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Spin, Switch, Tag, Tooltip,
} from 'antd'
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import { chat_model } from '@/agent/model.ts'
import type { ILlmConfig, ILlmProvider } from '@/agent/model.ts'
import { form_error_alert, required_label } from './common.tsx'


const ADAPTER_TYPE_OPTIONS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'openai-compatible', label: 'OpenAI Compatible' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'deepseek', label: 'DeepSeek' },
]


const EMBEDDING_METRIC_OPTIONS = [
    { value: 'euclidean', label: 'Euclidean' },
    { value: 'cosine', label: 'Cosine' },
]


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
    contextWindow: undefined as number | undefined,
    defaultParams: '',
    embeddingDimension: 1536,
    embeddingMetric: 'euclidean' as 'euclidean' | 'cosine',
    embeddingNormalize: false,
    maxConcurrency: undefined as number | undefined,
    rateLimitRPM: undefined as number | undefined,
    timeoutMs: undefined as number | undefined,
    retryConfig: '',
    nativeToolCall: true,
    custom: { } as Record<string, unknown>,
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


function supports_native_tool_call (custom?: Record<string, unknown>) {
    return custom?.tool_call !== false
}


function optional_positive_number (value: unknown) {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 ? num : undefined
}


function optional_nonnegative_number (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? num : undefined
}


export function LlmConfigTab () {
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
    const [provider_error, set_provider_error] = useState('')
    const [config_error, set_config_error] = useState('')
    
    async function load () {
        set_loading(true)
        try {
            const [ps, cs] = await Promise.all([
                chat_model.llm.load_llm_providers(),
                chat_model.llm.load_llm_configs(),
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
        set_provider_error('')
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
        set_provider_error('')
    }
    
    async function save_provider () {
        if (!provider_form.name.trim()) {
            set_provider_error(t('请输入 Provider 名称'))
            return
        }
        if (!provider_form.baseUrl.trim()) {
            set_provider_error(t('请输入 Base URL'))
            return
        }
        set_provider_error('')
        set_saving_provider(true)
        try {
            if (provider_mode === 'create') {
                const created = await chat_model.llm.register_llm_provider({
                    name: provider_form.name.trim(),
                    adapterType: provider_form.adapterType,
                    baseUrl: provider_form.baseUrl.trim(),
                    apiKey: provider_form.apiKey || null,
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
                if (provider_form.apiKey !== (selected_provider?.apiKey || ''))
                    payload.apiKey = provider_form.apiKey || null
                
                await chat_model.llm.update_llm_provider(selected_provider_id, payload)
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
            await chat_model.llm.delete_llm_provider(selected_provider_id)
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
            await chat_model.llm.disable_llm_provider(selected_provider_id)
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
            await chat_model.llm.enable_llm_provider(selected_provider_id)
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
        set_config_error('')
    }
    
    function open_edit_config (cfg: ILlmConfig) {
        set_editing_config_id(cfg.llmConfigId)
        set_config_modal_mode('edit')
        set_config_form({
            name: cfg.name,
            model: cfg.model,
            capability: (cfg.capability as 'chat' | 'embedding') || 'chat',
            requestPath: cfg.requestPath || '/v1/chat/completions',
            contextWindow: optional_nonnegative_number(cfg.contextWindow),
            defaultParams: cfg.defaultParams ? JSON.stringify(cfg.defaultParams, null, 2) : '',
            embeddingDimension: cfg.embeddingDimension ?? 1536,
            embeddingMetric: (cfg.embeddingMetric as 'euclidean' | 'cosine') || 'euclidean',
            embeddingNormalize: cfg.embeddingMetric === 'cosine' || (cfg.embeddingNormalize ?? false),
            maxConcurrency: optional_positive_number(cfg.maxConcurrency),
            rateLimitRPM: optional_positive_number(cfg.rateLimitRPM),
            timeoutMs: optional_positive_number(cfg.timeoutMs),
            retryConfig: cfg.retryConfig ? JSON.stringify(cfg.retryConfig, null, 2) : '',
            nativeToolCall: supports_native_tool_call(cfg.custom),
            custom: cfg.custom || { },
        })
        set_config_error('')
    }
    
    async function save_config () {
        if (!config_form.name.trim()) {
            set_config_error(t('请输入配置名称'))
            return
        }
        if (!config_form.model.trim()) {
            set_config_error(t('请输入模型名称'))
            return
        }
        if (!config_form.requestPath.trim() || !config_form.requestPath.startsWith('/')) {
            set_config_error(t('请求路径必须以 / 开头'))
            return
        }
        set_config_error('')
        
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
            contextWindow: config_form.contextWindow ?? null,
            maxConcurrency: config_form.maxConcurrency ?? null,
            rateLimitRPM: config_form.rateLimitRPM ?? null,
            timeoutMs: config_form.timeoutMs ?? null,
            customData: JSON.stringify(is_embedding ? config_form.custom : { ...config_form.custom, tool_call: config_form.nativeToolCall }),
        }
        payload.defaultParams = default_params ?? null
        payload.retryConfig = retry_config ?? null
        if (is_embedding) {
            payload.embeddingDimension = config_form.embeddingDimension
            payload.embeddingMetric = config_form.embeddingMetric
            payload.embeddingNormalize = config_form.embeddingMetric === 'cosine' || config_form.embeddingNormalize
        }
        
        set_saving_config(true)
        try {
            if (config_modal_mode === 'create') {
                await chat_model.llm.register_llm_config({ ...payload, providerId: selected_provider_id, enabled: true })
                message.success(t('创建成功'))
            } else if (editing_config_id) {
                await chat_model.llm.update_llm_config(editing_config_id, payload)
                message.success(t('保存成功'))
            }
            set_config_modal_mode('closed')
            await load()
            chat_model.llm.load_selectable_llms().catch(() => { })
        } catch (e: any) {
            message.error(e.message || t('保存失败'))
        } finally {
            set_saving_config(false)
        }
    }
    
    async function delete_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.delete_llm_config(cfg.llmConfigId)
            message.success(t('删除成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('删除失败'))
            await load()
        }
    }
    
    
    async function disable_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.disable_llm_config(cfg.llmConfigId)
            message.success(t('禁用成功'))
            await load()
        } catch (e: any) {
            message.error(e.message || t('禁用失败'))
            await load()
        }
    }
    
    
    async function enable_config (cfg: ILlmConfig) {
        try {
            await chat_model.llm.enable_llm_config(cfg.llmConfigId)
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
            flexDirection: 'column', flexShrink: 0, minWidth: 0,
        }}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Button type='dashed' block icon={<PlusOutlined />} onClick={open_create_provider}>
                    {t('新建 Provider')}
                </Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0', minWidth: 0 }}>
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
                                    boxSizing: 'border-box',
                                }}
                                onClick={() => { open_edit_provider(p) }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                                    <span
                                        title={p.name}
                                        style={{ fontWeight: 500, fontSize: 13, minWidth: 0, maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {p.name}
                                    </span>
                                    <Tag style={{ fontSize: 11, flexShrink: 0 }}>{p.adapterType}</Tag>
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
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '0 20px' }}>
            {provider_mode === 'idle'
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Empty description={t('请从左侧选择一个 Provider，或点击上方新建')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
                : <>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 12 }}>
                        {provider_mode === 'create' ? t('新建 Provider') : t('编辑 Provider')}
                    </div>
                    {form_error_alert(provider_error)}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('Provider 名称'))}</div>
                            <Input
                                value={provider_form.name}
                                onChange={e => { set_provider_form({ ...provider_form, name: e.target.value }) }}
                                placeholder={t('名称')}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('适配器类型'))}</div>
                            <Select
                                style={{ width: '100%' }}
                                value={provider_form.adapterType}
                                onChange={val => { set_provider_form({ ...provider_form, adapterType: val }) }}
                                options={ADAPTER_TYPE_OPTIONS}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label('Base URL')}</div>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                            <span title={cfg.name} style={{ fontWeight: 500, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cfg.name}
                                            </span>
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
                                        <div title={`${cfg.model} · ${cfg.requestPath}`} style={{ fontSize: 12, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                            okButtonProps={{ danger: true }}
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
            onCancel={() => {
                set_config_modal_mode('closed')
                set_config_error('')
            }}
            onOk={save_config}
            confirmLoading={saving_config}
            okText={t('保存')}
            cancelText={t('取消')}
            width={720}
            destroyOnClose
        >
            {form_error_alert(config_error)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginTop: 12 }}>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('配置名称'))}</div>
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
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('模型名称'))}</div>
                    <Input
                        value={config_form.model}
                        onChange={e => { set_config_form({ ...config_form, model: e.target.value }) }}
                        placeholder='gpt-4o'
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('请求路径'))}</div>
                    <Input
                        value={config_form.requestPath}
                        onChange={e => { set_config_form({ ...config_form, requestPath: e.target.value }) }}
                        placeholder='/v1/chat/completions'
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('上下文窗口')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.contextWindow}
                        onChange={val => { set_config_form({ ...config_form, contextWindow: val ?? undefined }) }}
                        min={0}
                        step={1024}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('最大并发（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.maxConcurrency}
                        onChange={val => { set_config_form({ ...config_form, maxConcurrency: optional_positive_number(val ?? undefined) }) }}
                        min={1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('速率限制 RPM（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.rateLimitRPM}
                        onChange={val => { set_config_form({ ...config_form, rateLimitRPM: optional_positive_number(val ?? undefined) }) }}
                        min={1}
                    />
                </div>
                <div>
                    <div style={{ marginBottom: 4, fontSize: 13 }}>{t('超时毫秒（可选）')}</div>
                    <InputNumber
                        style={{ width: '100%' }}
                        value={config_form.timeoutMs}
                        onChange={val => { set_config_form({ ...config_form, timeoutMs: optional_positive_number(val ?? undefined) }) }}
                        min={1000}
                        step={1000}
                    />
                </div>
                {!is_embedding_form && <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                        checked={config_form.nativeToolCall}
                        onChange={checked => { set_config_form({ ...config_form, nativeToolCall: checked }) }}
                    />
                    <span style={{ fontSize: 13 }}>{t('支持原生 tool call')}</span>
                </div>}
                {is_embedding_form && <>
                    <div>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>{required_label(t('嵌入维度'))}</div>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={config_form.embeddingDimension}
                            onChange={val => { set_config_form({ ...config_form, embeddingDimension: val ?? 1536 }) }}
                            min={1}
                        />
                    </div>
                    <div>
                        <div style={{ marginBottom: 4, fontSize: 13 }}>{t('嵌入度量')}</div>
                        <Select
                            style={{ width: '100%' }}
                            value={config_form.embeddingMetric}
                            onChange={val => { set_config_form({ ...config_form, embeddingMetric: val, embeddingNormalize: val === 'cosine' || config_form.embeddingNormalize }) }}
                            options={EMBEDDING_METRIC_OPTIONS}
                        />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Switch
                            checked={config_form.embeddingMetric === 'cosine' || config_form.embeddingNormalize}
                            disabled={config_form.embeddingMetric === 'cosine'}
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
