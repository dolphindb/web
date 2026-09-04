import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Spin, Switch, Tag, Typography, message } from 'antd'
import { InfoCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IAgentInfo, IKnowledgeBaseInfo, IKnowledgeRetrievalDiagnostic, IKnowledgeRetrieveResult, ILlmConfig } from '@/agent/model/types.ts'
import { chat_model } from '@/agent/model.ts'
import { format_model_label } from './types.ts'


const { Text, Paragraph } = Typography


export function RetrievalTestModal ({
    visible,
    kb,
    agents,
    chat_configs,
    on_close,
}: {
    visible: boolean
    kb: IKnowledgeBaseInfo | null
    agents: IAgentInfo[]
    chat_configs: ILlmConfig[]
    on_close: () => void
}) {
    const [selected_agent_id, set_selected_agent_id] = useState('')
    const [query, set_query] = useState('')
    const [top_k, set_top_k] = useState(8)
    const [candidate_count, set_candidate_count] = useState(30)
    const [rerank_enabled, set_rerank_enabled] = useState(false)
    const [rerank_provider_config_id, set_rerank_provider_config_id] = useState('')
    const [loading, set_loading] = useState(false)
    const [result, set_result] = useState<IKnowledgeRetrieveResult | null>(null)
    const [diagnostic, set_diagnostic] = useState<IKnowledgeRetrievalDiagnostic | null>(null)
    const active_agents = useMemo(() => agents.filter(agent => agent.statusName === 'ACTIVE'), [agents])
    
    const kb_top_k = kb?.retrievalConfig?.topK ?? 8
    const kb_candidate_count = kb?.retrievalConfig?.candidateCount ?? 30
    const kb_rerank_enabled = Boolean(kb?.retrievalConfig?.rerankEnabled)
    const kb_rerank_provider = kb?.retrievalConfig?.rerankProviderConfigId || ''
    
    function reset_to_kb_settings () {
        set_top_k(kb_top_k)
        set_candidate_count(kb_candidate_count)
        set_rerank_enabled(kb_rerank_enabled)
        set_rerank_provider_config_id(kb_rerank_provider)
    }
    
    const is_customized = top_k !== kb_top_k ||
        candidate_count !== kb_candidate_count ||
        rerank_enabled !== kb_rerank_enabled ||
        (rerank_enabled && rerank_provider_config_id !== kb_rerank_provider)
    
    useEffect(() => {
        if (!visible)
            return
        set_query('')
        reset_to_kb_settings()
        set_result(null)
        set_diagnostic(null)
    }, [visible, kb?.knowledgeBaseId, kb?.retrievalConfig])
    
    useEffect(() => {
        if (visible)
            set_selected_agent_id(current =>
                active_agents.some(agent => agent.agentId === current) ? current : active_agents[0]?.agentId || ''
            )
    }, [visible, active_agents])
    
    function handle_top_k_change (val: number | null) {
        const new_top_k = val || 8
        set_top_k(new_top_k)
        const min_candidate = Math.max(new_top_k, 20)
        if (candidate_count < min_candidate)
            set_candidate_count(min_candidate)
    }
    
    async function handle_test () {
        if (!kb)
            return
        if (!query.trim()) {
            message.warning(t('请输入检索词'))
            return
        }
        if (!selected_agent_id) {
            message.warning(t('请选择一个活跃 Agent'))
            return
        }
        if (rerank_enabled && !rerank_provider_config_id) {
            message.warning(t('启用 Rerank 时请选择评估模型'))
            return
        }
        const min_candidate = Math.max(top_k, 20)
        if (candidate_count < min_candidate || candidate_count > 50) {
            message.warning(t('初步召回候选数必须在 {{min}} 到 50 之间', { min: min_candidate }))
            return
        }
        
        set_loading(true)
        set_result(null)
        set_diagnostic(null)
        
        try {
            const res = await chat_model.knowledge.test_retrieval({
                agentId: selected_agent_id,
                knowledgeBaseId: kb.knowledgeBaseId,
                query: query.trim(),
                retrievalConfig: {
                    topK: top_k,
                    candidateCount: candidate_count,
                    rerankEnabled: rerank_enabled,
                    rerankProviderConfigId: rerank_enabled ? rerank_provider_config_id : '',
                },
            })
            set_result(res)
            set_diagnostic(res.diagnostics || null)
        } catch (err: any) {
            message.error(err.message || t('检索测试失败'))
        } finally {
            set_loading(false)
        }
    }
    
    const min_candidate_count = Math.max(top_k, 20)
    
    return <Modal
        title={`${t('检索测试与相关性诊断')}${kb ? ` · ${kb.name}` : ''}`}
        open={visible}
        onCancel={on_close}
        footer={null}
        width={840}
        destroyOnHidden
    >
        <div style={{ marginTop: 12 }}>
            <Form layout='vertical' size='small'>
                {active_agents.length > 0
                    ? <Form.Item label={t('测试 Agent（权限归属）')} required>
                    <Select
                        placeholder={t('选择 Agent')}
                        value={selected_agent_id || undefined}
                        onChange={set_selected_agent_id}
                        options={active_agents.map(a => ({ value: a.agentId, label: a.agentName || a.agentId }))}
                    />
                    </Form.Item>
                    : <Alert type='warning' showIcon message={t('暂无活跃 Agent，无法执行检索测试')} style={{ marginBottom: 12 }} />}
                
                <div style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--ant-color-border-secondary)',
                    background: 'var(--ant-color-fill-quaternary)',
                    marginBottom: 12,
                }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>{t('检索设置')}</div>
                    {is_customized && <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 10,
                        fontSize: 12,
                        color: 'var(--ant-color-text-secondary)',
                    }}>
                        <Space size={6} style={{ flex: 1, minWidth: 0 }}>
                            <InfoCircleOutlined style={{ color: 'var(--ant-color-info)', flexShrink: 0 }} />
                            <span>{t('以下检索设置仅对本次测试生效，不会修改知识库本身的配置')}</span>
                        </Space>
                        <Button size='small' icon={<ReloadOutlined />} onClick={reset_to_kb_settings}>
                            {t('恢复知识库设置')}
                        </Button>
                    </div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Item
                            label={t('初步召回候选数 ({{min}}~50)', { min: min_candidate_count })}
                            extra={<span style={{ fontSize: 12 }}>{t('初步检索出的候选片段数，供重排筛选，推荐 30')}</span>}
                            style={{ marginBottom: 8 }}
                        >
                            <InputNumber
                                min={min_candidate_count}
                                max={50}
                                value={candidate_count}
                                onChange={val => { set_candidate_count(val || min_candidate_count) }}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t('最终返回条目 (Top K: 1~20)')}
                            extra={<span style={{ fontSize: 12 }}>{t('最终返回给 Agent 的片段数，推荐 8')}</span>}
                            style={{ marginBottom: 8 }}
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
                    
                    <Form.Item label={t('当前检索启用 Rerank')} style={{ marginBottom: 0 }}>
                        <Space direction='vertical' style={{ width: '100%' }}>
                            <Space>
                                <Switch
                                    checked={rerank_enabled}
                                    onChange={set_rerank_enabled}
                                />
                                <Text type='secondary'>
                                    {rerank_enabled ? t('已启用，检索将对融合候选进行二次重排') : t('已禁用，使用多路召回 RRF 融合结果')}
                                </Text>
                            </Space>
                            {rerank_enabled && <>
                                <Select
                                    placeholder={t('选择启用的 Chat 评估模型')}
                                    value={rerank_provider_config_id || undefined}
                                    onChange={set_rerank_provider_config_id}
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
                </div>
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Form.Item label={t('检索查询词')} required style={{ flex: 1, marginBottom: 12 }}>
                        <Input
                            placeholder={t('输入想要在知识库中搜索的自然语言或关键词')}
                            value={query}
                            onChange={e => { set_query(e.target.value) }}
                            onPressEnter={handle_test}
                        />
                    </Form.Item>
                    <Form.Item label=' ' style={{ marginBottom: 12 }}>
                        <Button type='primary' icon={<SearchOutlined />} loading={loading} disabled={!selected_agent_id} onClick={handle_test}>
                            {t('检索')}
                        </Button>
                    </Form.Item>
                </div>
            </Form>
            
            {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
            
            {result && <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Space>
                        <Text strong style={{ fontSize: 14 }}>{t('召回结果')}</Text>
                        <Tag color={result.resultStatus === 'OK' ? 'green' : 'orange'}>
                            {result.resultStatus === 'OK' ? t('命中 {{count}} 条结果', { count: result.items?.length || 0 }) : t('未找到相关内容')}
                        </Tag>
                    </Space>
                    {result.retrievalId && <Text type='secondary' style={{ fontSize: 11 }}>retrievalId: {result.retrievalId}</Text>}
                </div>
                
                {diagnostic && <Card
                    size='small'
                    title={t('检索诊断')}
                    extra={diagnostic.degradationReason ? <Tag color='warning' style={{ margin: 0 }}>{t('已降级')}</Tag> : null}
                    style={{ marginBottom: 12, background: 'var(--ant-color-fill-quaternary)' }}
                >
                    <Descriptions size='small' column={3}>
                        <Descriptions.Item label={t('实际候选窗口')}>{diagnostic.candidateCount ?? candidate_count}</Descriptions.Item>
                        <Descriptions.Item label={t('实际 Top K')}>{diagnostic.topK ?? top_k}</Descriptions.Item>
                        <Descriptions.Item label={t('Rerank 应用')}>
                            {diagnostic.rerankApplied ? t('已应用') : t('未应用')}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('文本候选数')}>{diagnostic.textCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('向量候选数')}>{diagnostic.vectorCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('融合候选数')}>{diagnostic.fusedCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('文本索引应用')}>{diagnostic.textApplied ? t('是') : t('否')}</Descriptions.Item>
                        <Descriptions.Item label={t('向量索引应用')}>{diagnostic.vectorApplied ? t('是') : t('否')}</Descriptions.Item>
                        {diagnostic.totalLatencyMs !== undefined && <Descriptions.Item label={t('总耗时')}>
                            {`${diagnostic.totalLatencyMs} ms`}
                        </Descriptions.Item>}
                        {diagnostic.rerankLatencyMs !== undefined && <Descriptions.Item label={t('Rerank 耗时')}>
                            {`${diagnostic.rerankLatencyMs} ms`}
                        </Descriptions.Item>}
                    </Descriptions>
                    {diagnostic.degradationReason && <div style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: '1px dashed var(--ant-color-border-secondary)',
                        fontSize: 12,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                    }}>
                        <Text type='secondary' style={{ marginRight: 6 }}>{t('降级原因')}：</Text>
                        <Text type='warning'>{diagnostic.degradationReason}</Text>
                    </div>}
                </Card>}
                
                <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.items?.length === 0
                        ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--ant-color-text-secondary)' }}>{t('未检索到匹配的相关片段')}</div>
                        : result.items?.map((item, index) => <div
                                key={item.chunkId || index}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 6,
                                    background: 'var(--ant-color-fill-quaternary)',
                                    border: '1px solid var(--ant-color-border-secondary)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Space size={6}>
                                        <Tag color='blue' style={{ margin: 0 }}>#{index + 1}</Tag>
                                        <Text strong style={{ fontSize: 12 }}>
                                            {item.source?.fileName || '-'}
                                            {item.source?.pageNo !== null && item.source?.pageNo !== undefined ? ` (P.${item.source.pageNo})` : ''}
                                        </Text>
                                    </Space>
                                    <Text type='secondary' style={{ fontSize: 11 }}>{item.chunkId}</Text>
                                </div>
                                <Paragraph style={{ fontSize: 13, lineHeight: 1.5, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                                    {item.content}
                                </Paragraph>
                            </div>)
                    }
                </div>
            </div>}
        </div>
    </Modal>
}
