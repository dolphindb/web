import { useState } from 'react'
import { Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IAgentInfo, IKnowledgeBaseInfo, IKnowledgeRetrievalDiagnostic, IKnowledgeRetrieveResult } from '@/agent/model.ts'
import { chat_model } from '@/agent/model.ts'


const { Text, Paragraph } = Typography


export function RetrievalTestModal ({
    visible,
    kb,
    agents,
    on_close,
}: {
    visible: boolean
    kb: IKnowledgeBaseInfo | null
    agents: IAgentInfo[]
    on_close: () => void
}) {
    const [selected_agent_id, set_selected_agent_id] = useState(agents[0]?.agentId || '')
    const [query, set_query] = useState('')
    const [top_k, set_top_k] = useState(8)
    const [loading, set_loading] = useState(false)
    const [result, set_result] = useState<IKnowledgeRetrieveResult | null>(null)
    const [diagnostic, set_diagnostic] = useState<IKnowledgeRetrievalDiagnostic | null>(null)
    const [loading_diag, set_loading_diag] = useState(false)
    
    async function handle_test () {
        if (!kb)
            return
        if (!query.trim()) {
            message.warning(t('请输入检索词'))
            return
        }
        
        set_loading(true)
        set_result(null)
        set_diagnostic(null)
        
        try {
            const res = await chat_model.knowledge.test_retrieval({
                agentId: selected_agent_id || undefined,
                knowledgeBaseId: kb.knowledgeBaseId,
                query: query.trim(),
                topK: top_k,
            })
            set_result(res)
            
            if (res.retrievalId) {
                set_loading_diag(true)
                try {
                    const diag = await chat_model.knowledge.get_retrieval_diagnostic(res.retrievalId)
                    set_diagnostic(diag)
                } catch { }
                finally {
                    set_loading_diag(false)
                }
            }
        } catch (err: any) {
            message.error(err.message || t('检索测试失败'))
        } finally {
            set_loading(false)
        }
    }
    
    return <Modal
        title={`${t('检索测试与相关性诊断')}${kb ? ` · ${kb.name}` : ''}`}
        open={visible}
        onCancel={on_close}
        footer={null}
        width={800}
        destroyOnHidden
    >
        <div style={{ marginTop: 12 }}>
            <Form layout='vertical' size='small'>
                {agents.length > 0 && <Form.Item label={t('测试 Agent（权限归属）')}>
                    <Select
                        placeholder={t('选择 Agent')}
                        value={selected_agent_id || undefined}
                        onChange={set_selected_agent_id}
                        options={agents.map(a => ({ value: a.agentId, label: a.agentName || a.agentId }))}
                    />
                </Form.Item>}
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Form.Item label={t('检索查询词')} required style={{ flex: 1, marginBottom: 12 }}>
                        <Input
                            placeholder={t('输入想要在知识库中搜索的自然语言或关键词')}
                            value={query}
                            onChange={e => { set_query(e.target.value) }}
                            onPressEnter={handle_test}
                        />
                    </Form.Item>
                    <Form.Item label={t('Top K')} style={{ width: 100, marginBottom: 12 }}>
                        <InputNumber
                            min={1}
                            max={20}
                            value={top_k}
                            onChange={val => { set_top_k(val || 8) }}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item label=' ' style={{ marginBottom: 12 }}>
                        <Button type='primary' icon={<SearchOutlined />} loading={loading} onClick={handle_test}>
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
                
                {diagnostic && <Card size='small' title={t('检索诊断')} style={{ marginBottom: 12, background: 'var(--ant-color-fill-quaternary)' }}>
                    <Descriptions size='small' column={3}>
                        <Descriptions.Item label={t('文本候选数')}>{diagnostic.textCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('向量候选数')}>{diagnostic.vectorCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('融合候选数')}>{diagnostic.fusedCandidateCount ?? '-'}</Descriptions.Item>
                        <Descriptions.Item label={t('文本索引应用')}>{diagnostic.textApplied ? t('是') : t('否')}</Descriptions.Item>
                        <Descriptions.Item label={t('向量索引应用')}>{diagnostic.vectorApplied ? t('是') : t('否')}</Descriptions.Item>
                        <Descriptions.Item label={t('Rerank 应用')}>{diagnostic.rerankApplied ? t('已应用') : t('未应用')}</Descriptions.Item>
                    </Descriptions>
                </Card>}
                
                <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.items?.length === 0
                        ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--ant-color-text-secondary)' }}>{t('未检索到匹配的相关片段')}</div>
                        : result.items?.map((item, index) => (
                            <div
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
                            </div>
                        ))
                    }
                </div>
            </div>}
        </div>
    </Modal>
}
