import { useState } from 'react'
import { Form, InputNumber, Modal, Radio, Select, Switch, Typography, message } from 'antd'

import { t } from '@i18n'
import type { IKnowledgeBaseConfig, ILlmConfig } from '@/agent/model.ts'


const { Text } = Typography


export function IndexBuildModal ({
    visible,
    embedding_configs,
    loading,
    on_close,
    on_submit,
}: {
    visible: boolean
    embedding_configs: ILlmConfig[]
    loading: boolean
    on_close: () => void
    on_submit: (config?: IKnowledgeBaseConfig) => Promise<void>
}) {
    const [use_custom_config, set_use_custom_config] = useState(false)
    const [embedding_source, set_embedding_source] = useState<'builtin' | 'llmConfig'>('builtin')
    const [llm_config_id, set_llm_config_id] = useState('')
    const [max_chunk_chars, set_max_chunk_chars] = useState(1000)
    const [overlap_chars, set_overlap_chars] = useState(100)
    const [include_heading, set_include_heading] = useState(true)
    const [parser, set_parser] = useState<'mixed' | 'chinese' | 'english'>('mixed')
    const [full, set_full] = useState(false)
    const [lowercase, set_lowercase] = useState(true)
    const [stem, set_stem] = useState(false)
    const [index_type, set_index_type] = useState<'flat' | 'hnsw'>('flat')
    const [error_msg, set_error_msg] = useState('')
    
    async function handle_submit () {
        if (!use_custom_config) {
            try {
                await on_submit()
                on_close()
            } catch (err: any) {
                message.error(err.message || t('触发索引构建失败'))
            }
            return
        }
        
        if (embedding_source === 'llmConfig' && !llm_config_id) {
            set_error_msg(t('请选择 Embedding 模型配置'))
            return
        }
        if (overlap_chars > max_chunk_chars * 0.25) {
            set_error_msg(t('重叠字符数不能超过最大分块字符数的 25%'))
            return
        }
        set_error_msg('')
        
        const config: IKnowledgeBaseConfig = {
            embeddingRef: {
                source: embedding_source,
                ...(embedding_source === 'llmConfig' ? { llmConfigId: llm_config_id } : { }),
            },
            chunking: {
                maxChunkChars: max_chunk_chars,
                overlapChars: overlap_chars,
                includeHeading: include_heading,
            },
            textIndex: {
                parser,
                full: parser === 'chinese' ? full : false,
                lowercase,
                stem: parser === 'english' ? stem : false,
            },
            vectorIndex: {
                indexType: index_type,
            },
        }
        
        try {
            await on_submit(config)
            on_close()
        } catch (err: any) {
            message.error(err.message || t('构建新索引失败'))
        }
    }
    
    return <Modal
        title={t('构建索引 Generation')}
        open={visible}
        onCancel={on_close}
        onOk={handle_submit}
        confirmLoading={loading}
        okText={t('开始构建')}
        cancelText={t('取消')}
        width={600}
        destroyOnHidden
    >
        <div style={{ marginTop: 12 }}>
            <Radio.Group
                value={use_custom_config}
                onChange={e => { set_use_custom_config(e.target.value) }}
                style={{ marginBottom: 16 }}
            >
                <Radio value={false}>{t('复用当前索引配置（重新全量索引）')}</Radio>
                <Radio value>{t('自定义新索引配置')}</Radio>
            </Radio.Group>
            
            {use_custom_config && <Form layout='vertical' size='small'>
                <Form.Item label={t('Embedding 模型')} required>
                    <Radio.Group
                        value={embedding_source}
                        onChange={e => { set_embedding_source(e.target.value) }}
                        style={{ marginBottom: 8 }}
                    >
                        <Radio value='builtin'>{t('内置 Embedding (granite)')}</Radio>
                        <Radio value='llmConfig'>{t('自定义 Embedding 配置')}</Radio>
                    </Radio.Group>
                    {embedding_source === 'llmConfig' && <Select
                        placeholder={t('选择启用的 Embedding 模型配置')}
                        value={llm_config_id || undefined}
                        onChange={set_llm_config_id}
                        options={embedding_configs.map(cfg => ({
                            value: cfg.llmConfigId,
                            label: `${cfg.name} (${cfg.model})`,
                        }))}
                    />}
                </Form.Item>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <Form.Item label={t('分块大小')}>
                        <InputNumber
                            min={200}
                            max={4000}
                            value={max_chunk_chars}
                            style={{ width: '100%' }}
                            onChange={val => { set_max_chunk_chars(val || 1000) }}
                        />
                    </Form.Item>
                    <Form.Item label={t('重叠字数')}>
                        <InputNumber
                            min={0}
                            max={Math.floor(max_chunk_chars * 0.25)}
                            value={overlap_chars}
                            style={{ width: '100%' }}
                            onChange={val => { set_overlap_chars(val ?? 0) }}
                        />
                    </Form.Item>
                    <Form.Item label={t('包含标题')}>
                        <Switch
                            checked={include_heading}
                            onChange={set_include_heading}
                        />
                    </Form.Item>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Item label={t('文本分词器')}>
                        <Select
                            value={parser}
                            onChange={set_parser}
                            options={[
                                { value: 'mixed', label: t('中英混合 (mixed)') },
                                { value: 'chinese', label: t('中文 (chinese)') },
                                { value: 'english', label: t('英文 (english)') },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label={t('向量索引类型')}>
                        <Select
                            value={index_type}
                            onChange={set_index_type}
                            options={[
                                { value: 'flat', label: 'Flat (精确搜索)' },
                                { value: 'hnsw', label: 'HNSW (近似图索引)' },
                            ]}
                        />
                    </Form.Item>
                </div>
            </Form>}
            
            {error_msg && <Text type='danger'>{error_msg}</Text>}
        </div>
    </Modal>
}
