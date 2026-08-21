import { useEffect, useState } from 'react'
import { Alert, Button, Form, InputNumber, Modal, Select, Space, Spin, Switch, Typography, message } from 'antd'

import { t } from '@i18n'
import type { ILlmConfig } from '@/agent/model.ts'
import { chat_model } from '@/agent/model.ts'


const { Text } = Typography


export function RerankConfigModal ({
    visible,
    chat_configs,
    on_close,
}: {
    visible: boolean
    chat_configs: ILlmConfig[]
    on_close: () => void
}) {
    const [enabled, set_enabled] = useState(false)
    const [provider_config_id, set_provider_config_id] = useState('')
    const [candidate_count, set_candidate_count] = useState(30)
    const [loading, set_loading] = useState(false)
    const [saving, set_saving] = useState(false)
    const [load_error, set_load_error] = useState('')
    const [error_msg, set_error_msg] = useState('')
    
    async function load () {
        set_loading(true)
        set_load_error('')
        try {
            const data = await chat_model.knowledge.get_rerank_config()
            set_enabled(Boolean(data?.enabled))
            set_provider_config_id(data?.providerConfigId || '')
            set_candidate_count(data?.candidateCount ?? 30)
            set_error_msg('')
        } catch (error) {
            set_load_error(error instanceof Error ? error.message : t('加载全局 Rerank 配置失败'))
        } finally {
            set_loading(false)
        }
    }
    
    useEffect(() => {
        if (visible)
            load()
    }, [visible])
    
    async function handle_save () {
        if (loading || load_error)
            return
        if (enabled && !chat_configs.some(config => config.llmConfigId === provider_config_id)) {
            set_error_msg(t('启用全局 Rerank 时必须选择模型配置'))
            return
        }
        set_error_msg('')
        set_saving(true)
        try {
            await chat_model.knowledge.update_rerank_config({
                enabled,
                providerConfigId: enabled ? provider_config_id : undefined,
                candidateCount: candidate_count,
            })
            message.success(t('保存全局 Rerank 配置成功'))
            on_close()
        } catch (err: any) {
            message.error(err.message || t('保存全局 Rerank 配置失败'))
        } finally {
            set_saving(false)
        }
    }
    
    return <Modal
        title={t('全局 Rerank 重排配置')}
        open={visible}
        onCancel={on_close}
        onOk={handle_save}
        confirmLoading={saving}
        okButtonProps={{ disabled: loading || Boolean(load_error) }}
        okText={t('保存')}
        cancelText={t('取消')}
        destroyOnHidden
    >
        {loading
            ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
            : load_error
                ? <Alert
                    type='error'
                    showIcon
                    message={t('加载全局 Rerank 配置失败')}
                    description={load_error}
                    action={<Button size='small' onClick={load}>{t('重试')}</Button>}
                    style={{ marginTop: 12 }}
                />
                : <Form layout='vertical' size='small' style={{ marginTop: 12 }}>
                <Form.Item label={t('启用全局 Rerank')}>
                    <Space>
                        <Switch checked={enabled} onChange={set_enabled} />
                        <Text type='secondary'>
                            {enabled ? t('已启用，知识库检索将对候选 chunk 进行二次重排') : t('已禁用，使用多路召回 RRF 融合结果')}
                        </Text>
                    </Space>
                </Form.Item>
                
                {enabled && <>
                    <Form.Item label={t('Rerank 评估模型')} required>
                        <Select
                            placeholder={t('选择启用的 Chat 模型配置')}
                            value={provider_config_id || undefined}
                            onChange={set_provider_config_id}
                            options={chat_configs.map(cfg => ({
                                value: cfg.llmConfigId,
                                label: [cfg.model, cfg.name, cfg.providerName].filter(Boolean).join(' · '),
                            }))}
                        />
                    </Form.Item>
                    
                    <Form.Item label={t('候选重排数量 (20~50)')} required>
                        <InputNumber
                            min={20}
                            max={50}
                            value={candidate_count}
                            onChange={val => { set_candidate_count(val || 30) }}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </>}
                
                {error_msg && <Text type='danger'>{error_msg}</Text>}
                </Form>
        }
    </Modal>
}
