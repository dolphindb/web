import { useState } from 'react'
import { Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Typography } from 'antd'

import { t } from '@i18n'
import type { ILlmConfig, IKnowledgeBaseRegisterPayload } from '@/agent/model/types.ts'
import { required_plugins_model } from '@/agent/model/required-plugins.ts'
import { DEFAULT_KB_FORM, VECTOR_INDEX_TYPE_OPTIONS, format_model_label, type KnowledgeCreateFormState } from './types.ts'


const { Text } = Typography


export function KnowledgeCreateModal ({
    visible,
    embedding_configs,
    chat_configs,
    loading,
    on_close,
    on_submit,
}: {
    visible: boolean
    embedding_configs: ILlmConfig[]
    chat_configs: ILlmConfig[]
    loading: boolean
    on_close: () => void
    on_submit: (payload: IKnowledgeBaseRegisterPayload) => Promise<void>
}) {
    const [form, set_form] = useState<KnowledgeCreateFormState>({ ...DEFAULT_KB_FORM })
    const [error_msg, set_error_msg] = useState('')
    
    function handle_top_k_change (val: number | null) {
        const new_top_k = val || 8
        const min_candidate = Math.max(new_top_k, 20)
        set_form(prev => ({
            ...prev,
            topK: new_top_k,
            candidateCount: prev.candidateCount < min_candidate ? min_candidate : prev.candidateCount,
        }))
        set_error_msg('')
    }
    
    async function handle_submit () {
        if (!form.name.trim()) {
            set_error_msg(t('请输入知识库名称'))
            return
        }
        if (form.rerankEnabled && !form.rerankProviderConfigId) {
            set_error_msg(t('启用 Rerank 时必须选择评估模型'))
            return
        }
        const min_candidate = Math.max(form.topK, 20)
        if (form.candidateCount < min_candidate || form.candidateCount > 50) {
            set_error_msg(t('初步召回候选数必须在 {{min}} 到 50 之间', { min: min_candidate }))
            return
        }
        if (form.embeddingSource === 'llmConfig' && !form.llmConfigId) {
            set_error_msg(t('请选择 Embedding 模型配置'))
            return
        }
        if (form.overlapChars > form.maxChunkChars * 0.25) {
            set_error_msg(t('重叠字符数不能超过最大分块字符数的 25%'))
            return
        }
        set_error_msg('')
        
        const payload: IKnowledgeBaseRegisterPayload = {
            name: form.name.trim(),
            description: form.description.trim(),
            retrievalConfig: {
                topK: form.topK,
                candidateCount: form.candidateCount,
                rerankEnabled: form.rerankEnabled,
                rerankProviderConfigId: form.rerankEnabled ? form.rerankProviderConfigId : '',
            },
            config: {
                embeddingRef: {
                    source: form.embeddingSource,
                    ...(form.embeddingSource === 'llmConfig' ? { llmConfigId: form.llmConfigId } : { }),
                },
                chunking: {
                    maxChunkChars: form.maxChunkChars,
                    overlapChars: form.overlapChars,
                    includeHeading: form.includeHeading,
                },
                textIndex: {
                    parser: form.parser,
                    full: form.parser === 'chinese' ? form.full : false,
                    lowercase: form.lowercase,
                    stem: form.parser === 'english' ? form.stem : false,
                },
                vectorIndex: {
                    indexType: form.indexType,
                },
            },
        }
        
        try {
            await on_submit(payload)
            set_form({ ...DEFAULT_KB_FORM })
            set_error_msg('')
        } catch (err: any) {
            required_plugins_model.open(err)
        }
    }
    
    const min_candidate_count = Math.max(form.topK, 20)
    
    return <Modal
        title={t('创建知识库')}
        open={visible}
        onCancel={() => {
            set_error_msg('')
            on_close()
        }}
        onOk={handle_submit}
        confirmLoading={loading}
        okText={t('创建')}
        cancelText={t('取消')}
        width={680}
        destroyOnHidden
    >
        <Form layout='vertical' size='small' style={{ marginTop: 12 }}>
            <Form.Item label={t('名称')} required>
                <Input
                    placeholder={t('例如：产品手册、运维知识库')}
                    value={form.name}
                    onChange={e => { set_form({ ...form, name: e.target.value }) }}
                />
            </Form.Item>
            <Form.Item label={t('描述')}>
                <Input.TextArea
                    rows={2}
                    placeholder={t('描述该知识库覆盖的范围和内容')}
                    value={form.description}
                    onChange={e => { set_form({ ...form, description: e.target.value }) }}
                />
            </Form.Item>
            
            <div style={{ fontWeight: 500, marginBottom: 8, marginTop: 16 }}>{t('检索设置')}</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item
                    label={t('初步召回候选数 ({{min}}~50)', { min: min_candidate_count })}
                    extra={<span style={{ fontSize: 12 }}>{t('初步检索出的候选片段数，供重排筛选，推荐 30')}</span>}
                    required
                >
                    <InputNumber
                        min={min_candidate_count}
                        max={50}
                        value={form.candidateCount}
                        onChange={val => {
                            set_form({ ...form, candidateCount: val || min_candidate_count })
                            set_error_msg('')
                        }}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item
                    label={t('最终返回条目 (Top K: 1~20)')}
                    extra={<span style={{ fontSize: 12 }}>{t('最终返回给 Agent 的片段数，推荐 8')}</span>}
                    required
                >
                    <InputNumber
                        min={1}
                        max={20}
                        value={form.topK}
                        onChange={handle_top_k_change}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </div>
            
            <Form.Item label={t('启用 Rerank')}>
                <Space direction='vertical' style={{ width: '100%' }}>
                    <Space>
                        <Switch
                            checked={form.rerankEnabled}
                            onChange={checked => {
                                set_form({ ...form, rerankEnabled: checked })
                                set_error_msg('')
                            }}
                        />
                        <Text type='secondary'>
                            {form.rerankEnabled ? t('已启用，检索将对融合候选进行二次重排') : t('已禁用，使用多路召回 RRF 融合结果')}
                        </Text>
                    </Space>
                    {form.rerankEnabled && <Select
                        placeholder={t('选择启用的 Chat 评估模型')}
                        value={form.rerankProviderConfigId || undefined}
                        onChange={val => {
                            set_form({ ...form, rerankProviderConfigId: val })
                            set_error_msg('')
                        }}
                        options={chat_configs.map(cfg => ({
                            value: cfg.llmConfigId,
                            label: format_model_label(cfg),
                        }))}
                        style={{ width: '100%', marginTop: 6 }}
                    />}
                </Space>
            </Form.Item>
            
            <div style={{ fontWeight: 500, marginBottom: 8, marginTop: 16 }}>{t('向量与索引配置')}</div>
            
            <Form.Item label={t('Embedding 模型')} required>
                <Radio.Group
                    value={form.embeddingSource}
                    onChange={e => { set_form({ ...form, embeddingSource: e.target.value }) }}
                    style={{ marginBottom: 8 }}
                >
                    <Radio value='builtin'>{t('内置 Embedding (granite)')}</Radio>
                    <Radio value='llmConfig'>{t('自定义 Embedding 配置')}</Radio>
                </Radio.Group>
                {form.embeddingSource === 'llmConfig' && <Select
                    placeholder={t('选择启用的 Embedding 模型配置')}
                    value={form.llmConfigId || undefined}
                    onChange={val => { set_form({ ...form, llmConfigId: val }) }}
                    options={embedding_configs.map(cfg => ({
                        value: cfg.llmConfigId,
                        label: format_model_label(cfg),
                    }))}
                />}
            </Form.Item>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Form.Item label={t('分块字符数 (200~4000)')} required>
                    <InputNumber
                        min={200}
                        max={4000}
                        value={form.maxChunkChars}
                        style={{ width: '100%' }}
                        onChange={val => { set_form({ ...form, maxChunkChars: val || 1000 }) }}
                    />
                </Form.Item>
                <Form.Item label={t('重叠字符数 (≤25%)')} required>
                    <InputNumber
                        min={0}
                        max={Math.floor(form.maxChunkChars * 0.25)}
                        value={form.overlapChars}
                        style={{ width: '100%' }}
                        onChange={val => { set_form({ ...form, overlapChars: val ?? 0 }) }}
                    />
                </Form.Item>
                <Form.Item label={t('包含标题')}>
                    <Switch
                        checked={form.includeHeading}
                        onChange={checked => { set_form({ ...form, includeHeading: checked }) }}
                    />
                </Form.Item>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item label={t('文本分词器')}>
                    <Select
                        value={form.parser}
                        onChange={val => { set_form({ ...form, parser: val }) }}
                        options={[
                            { value: 'mixed', label: t('中英混合 (mixed)') },
                            { value: 'chinese', label: t('中文 (chinese)') },
                            { value: 'english', label: t('英文 (english)') },
                        ]}
                    />
                </Form.Item>
                <Form.Item label={t('向量索引类型')}>
                    <Select
                        value={form.indexType}
                        onChange={val => { set_form({ ...form, indexType: val }) }}
                        options={VECTOR_INDEX_TYPE_OPTIONS}
                    />
                </Form.Item>
            </div>
            
            <Space size={16} style={{ marginTop: 4 }}>
                {form.parser === 'chinese' && <Space>
                    <Switch
                        checked={form.full}
                        onChange={checked => { set_form({ ...form, full: checked }) }}
                    />
                    <span>{t('中文全模式分词')}</span>
                </Space>}
                <Space>
                    <Switch
                        checked={form.lowercase}
                        onChange={checked => { set_form({ ...form, lowercase: checked }) }}
                    />
                    <span>{t('英文忽略大小写')}</span>
                </Space>
                {form.parser === 'english' && <Space>
                    <Switch
                        checked={form.stem}
                        onChange={checked => { set_form({ ...form, stem: checked }) }}
                    />
                    <span>{t('英文词干提取')}</span>
                </Space>}
            </Space>
            
            {error_msg && <div style={{ marginTop: 12 }}><Text type='danger'>{error_msg}</Text></div>}
        </Form>
    </Modal>
}
