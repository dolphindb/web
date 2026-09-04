import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Modal, Select, Space, Switch, Typography } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import type { IKnowledgeBaseInfo, IKnowledgeRetrievalConfig, ILlmConfig } from '@/agent/model/types.ts'
import { format_model_label } from './types.ts'


const { Text } = Typography


export function KnowledgeEditModal ({
    visible,
    kb,
    chat_configs,
    loading,
    on_close,
    on_submit,
}: {
    visible: boolean
    kb: IKnowledgeBaseInfo | null
    chat_configs: ILlmConfig[]
    loading: boolean
    on_close: () => void
    on_submit: (name: string, description: string, retrieval_config: IKnowledgeRetrievalConfig) => Promise<void>
}) {
    const [name, set_name] = useState('')
    const [description, set_description] = useState('')
    const [top_k, set_top_k] = useState(8)
    const [candidate_count, set_candidate_count] = useState(30)
    const [rerank_enabled, set_rerank_enabled] = useState(false)
    const [rerank_provider_config_id, set_rerank_provider_config_id] = useState('')
    const [error_msg, set_error_msg] = useState('')
    
    useEffect(() => {
        if (kb) {
            set_name(kb.name || '')
            set_description(kb.description || '')
            set_top_k(kb.retrievalConfig?.topK ?? 8)
            set_candidate_count(kb.retrievalConfig?.candidateCount ?? 30)
            set_rerank_enabled(Boolean(kb.retrievalConfig?.rerankEnabled))
            set_rerank_provider_config_id(kb.retrievalConfig?.rerankProviderConfigId || '')
            set_error_msg('')
        }
    }, [kb, visible])
    
    function handle_top_k_change (val: number | null) {
        const new_top_k = val || 8
        set_top_k(new_top_k)
        const min_candidate = Math.max(new_top_k, 20)
        if (candidate_count < min_candidate)
            set_candidate_count(min_candidate)
        set_error_msg('')
    }
    
    async function handle_submit () {
        if (!name.trim()) {
            set_error_msg(t('请输入知识库名称'))
            return
        }
        if (rerank_enabled && !rerank_provider_config_id) {
            set_error_msg(t('启用 Rerank 时必须选择评估模型'))
            return
        }
        const min_candidate = Math.max(top_k, 20)
        if (candidate_count < min_candidate || candidate_count > 50) {
            set_error_msg(t('初步召回候选数必须在 {{min}} 到 50 之间', { min: min_candidate }))
            return
        }
        set_error_msg('')
        try {
            await on_submit(
                name.trim(),
                description.trim(),
                {
                    topK: top_k,
                    candidateCount: candidate_count,
                    rerankEnabled: rerank_enabled,
                    rerankProviderConfigId: rerank_enabled ? rerank_provider_config_id : '',
                }
            )
            on_close()
        } catch (err: any) {
            model.message.error(err.message || t('更新知识库失败'))
        }
    }
    
    const min_candidate_count = Math.max(top_k, 20)
    
    return <Modal
        title={t('知识库设置')}
        open={visible}
        onCancel={() => {
            set_error_msg('')
            on_close()
        }}
        onOk={handle_submit}
        confirmLoading={loading}
        okText={t('保存')}
        cancelText={t('取消')}
        width={560}
        destroyOnHidden
    >
        <Form layout='vertical' size='small' style={{ marginTop: 12 }}>
            <Form.Item label={t('名称')} required>
                <Input
                    value={name}
                    onChange={e => {
                        set_name(e.target.value)
                        set_error_msg('')
                    }}
                />
            </Form.Item>
            <Form.Item label={t('描述')}>
                <Input.TextArea
                    rows={3}
                    value={description}
                    placeholder={t('描述该知识库覆盖的范围和内容')}
                    onChange={e => {
                        set_description(e.target.value)
                        set_error_msg('')
                    }}
                />
            </Form.Item>
            
            <div style={{ fontWeight: 500, marginBottom: 12, marginTop: 16 }}>{t('检索设置')}</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Form.Item
                    label={t('初步召回候选数 ({{min}}~50)', { min: min_candidate_count })}
                    extra={<span style={{ fontSize: 12 }}>{t('初步检索出的候选片段数，供重排筛选，推荐 30')}</span>}
                    required
                >
                    <InputNumber
                        min={min_candidate_count}
                        max={50}
                        value={candidate_count}
                        onChange={val => {
                            set_candidate_count(val || min_candidate_count)
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
                        value={top_k}
                        onChange={handle_top_k_change}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </div>
            
            <Form.Item label={t('启用 Rerank')}>
                <Space direction='vertical' style={{ width: '100%' }}>
                    <Space>
                        <Switch
                            checked={rerank_enabled}
                            onChange={checked => {
                                set_rerank_enabled(checked)
                                set_error_msg('')
                            }}
                        />
                        <Text type='secondary'>
                            {rerank_enabled ? t('已启用，检索将对融合候选进行二次重排') : t('已禁用，使用多路召回 RRF 融合结果')}
                        </Text>
                    </Space>
                    {rerank_enabled && <>
                        <Select
                            placeholder={t('选择启用的 Chat 评估模型')}
                            value={rerank_provider_config_id || undefined}
                            onChange={val => {
                                set_rerank_provider_config_id(val)
                                set_error_msg('')
                            }}
                            options={chat_configs.map(cfg => ({
                                value: cfg.llmConfigId,
                                label: format_model_label(cfg),
                            }))}
                            style={{ width: '100%', marginTop: 6 }}
                        />
                        <div style={{ fontSize: 12, color: 'var(--text-color-secondary, #8c8c8c)', marginTop: 4, lineHeight: '18px' }}>
                            {t('Rerank 由 LLM 执行且对响应速度敏感，建议选用低延迟模型，如需进一步提速亦可关闭深度思考。Rerank 与 Agent 的任务特性不同，建议配置为不同的模型。')}
                        </div>
                    </>}
                </Space>
            </Form.Item>
            
            {error_msg && <div style={{ marginTop: 8 }}><Text type='danger'>{error_msg}</Text></div>}
        </Form>
    </Modal>
}
