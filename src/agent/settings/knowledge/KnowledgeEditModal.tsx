import { useEffect, useState } from 'react'
import { Form, Input, Modal, Typography } from 'antd'

import { t } from '@i18n'
import { model } from '@model'
import type { IKnowledgeBaseInfo } from '@/agent/model/types.ts'


const { Text } = Typography


export function KnowledgeEditModal ({
    visible,
    kb,
    loading,
    on_close,
    on_submit,
}: {
    visible: boolean
    kb: IKnowledgeBaseInfo | null
    loading: boolean
    on_close: () => void
    on_submit: (name: string, description: string) => Promise<void>
}) {
    const [name, set_name] = useState('')
    const [description, set_description] = useState('')
    const [error_msg, set_error_msg] = useState('')
    
    useEffect(() => {
        if (kb) {
            set_name(kb.name || '')
            set_description(kb.description || '')
            set_error_msg('')
        }
    }, [kb, visible])
    
    async function handle_submit () {
        if (!name.trim()) {
            set_error_msg(t('请输入知识库名称'))
            return
        }
        if (!description.trim()) {
            set_error_msg(t('请输入知识库描述'))
            return
        }
        set_error_msg('')
        try {
            await on_submit(name.trim(), description.trim())
            on_close()
        } catch (err: any) {
            model.message.error(err.message || t('更新知识库失败'))
        }
    }
    
    return <Modal
        title={t('编辑知识库')}
        open={visible}
        onCancel={() => {
            set_error_msg('')
            on_close()
        }}
        onOk={handle_submit}
        confirmLoading={loading}
        okText={t('保存')}
        cancelText={t('取消')}
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
            <Form.Item label={t('描述')} required>
                <Input.TextArea
                    rows={3}
                    value={description}
                    onChange={e => {
                        set_description(e.target.value)
                        set_error_msg('')
                    }}
                />
            </Form.Item>
            {error_msg && <div style={{ marginTop: 8 }}><Text type='danger'>{error_msg}</Text></div>}
        </Form>
    </Modal>
}
