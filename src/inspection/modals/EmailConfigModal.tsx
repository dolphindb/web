import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n'
import { Button, Form, Input, Modal, Select, Space, Switch } from 'antd'
import { useState } from 'react'

import { model } from '@model'
 
import { config } from '@/config/model.ts'
import { inspection } from '@/inspection/model.ts'
import { use_modal, type ModalController } from 'react-object-model/hooks'

const EMAIL_CONFIG_ITEMS = {
    inspectionAlertEnabled: { 
        label: t('是否启用'), 
        component: <Switch/>
    },
    inspectionAlertSMTPEmailName: { 
        label: t('邮箱名称'), 
        component: <Input/>
    },
    inspectionAlertSMTPHost: { 
        label: t('邮箱 SMTP 服务器地址'), 
        component: <Input/>
    },
    inspectionAlertSMTPPort: { 
        label: t('邮箱 SMTP 服务器端口'), 
        component: <Input/>
    },
    inspectionAlertUserId: { 
        label: t('发送者邮箱账号'), 
        component: <Input type='email'/>
    },
    inspectionAlertPwd: { 
        label: t('发送者邮箱密码'), 
        component: <Input.Password visibilityToggle/>
    },
    inspectionAlertStdSMTPMsgEnabled: { 
        label: t('使用标准 SMTP 消息'), 
        component: <Switch/>
    },
} as const

function TestEmailModal ({ modal }: { modal: ModalController }) {
    const [form] = Form.useForm()
    const [loading, set_loading] = useState(false)
    
    async function handle_send_test_email () {
        try {
            const values = await form.validateFields()
            set_loading(true)
            console.log(values)
            const result = await inspection.send_test_email(values.testRecipient, values.language || 'cn')
            
            if (result.errCode === 0) {
                model.message.success(result.errMsg || t('测试邮件发送成功'))
                modal.close()
                form.resetFields()
            } else
                model.message.error(result.errMsg || t('测试邮件发送失败'))
            
        } catch (error) {
            console.error('发送测试邮件失败:', error)
            model.message.error(t('发送测试邮件失败'))
        } finally {
            set_loading(false)
        }
    }
    
    return <Modal
            title={t('发送测试邮件')}
            open={modal.visible}
            onCancel={modal.close}
            footer={null}
            width={500}
        >
            <Form
                form={form}
                layout='vertical'
                initialValues={{ language: 'cn' }}
            >
                <Form.Item
                    name='testRecipient'
                    label={t('测试收件人')}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (!value || value.trim() === '') 
                                    return Promise.reject(new Error(t('请输入测试收件人邮箱')))
                                
                                const emails = value.split(',').map((email: string) => email.trim())
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                                for (const email of emails) 
                                    if (!emailRegex.test(email)) 
                                        return Promise.reject(new Error(t('请输入有效的邮箱地址')))
                                    
                                
                                return Promise.resolve()
                            }
                        }
                    ]}
                    extra={t('多个邮箱请用逗号分隔')}
                >
                    <Input.TextArea
                        placeholder={t('例如: user1@example.com, user2@example.com')}
                        rows={3}
                    />
                </Form.Item>
                
                <Form.Item
                    name='language'
                    label={t('邮件语言')}
                    initialValue='cn'
                >
                    <Select>
                        <Select.Option value='cn'>{t('中文')}</Select.Option>
                        <Select.Option value='en'>{t('英文')}</Select.Option>
                    </Select>
                </Form.Item>
                
                <Form.Item>
                    <Space>
                        <Button onClick={modal.close}>{t('取消')}</Button>
                        <Button type='primary' loading={loading} onClick={handle_send_test_email}>
                            {t('发送测试邮件')}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
}

export const EmailConfigModal = NiceModal.create(() => {
    const modal = useModal()
    let test_modal = use_modal()
    const [form] = Form.useForm()
    
    const initialValues = Object.fromEntries(
        Object.keys(EMAIL_CONFIG_ITEMS).map(key => [
            key, 
            key.endsWith('Enabled') 
                ? config.get_config(key) === 'true'
                : config.get_config(key) || ''
        ])
    )
    
    function handle_test_email () {
        // 先保存当前配置
        const currentValues = form.getFieldsValue()
        
        // 检查必要的配置项是否已填写
        const requiredFields = [
            'inspectionAlertSMTPEmailName',
            'inspectionAlertSMTPHost',
            'inspectionAlertSMTPPort',
            'inspectionAlertUserId',
            'inspectionAlertPwd'
        ]
        
        if (requiredFields.find(field => !currentValues[field])) {
            model.message.warning(t('请先完整填写邮件配置信息'))
            return
        }
        
        test_modal.close()
    }
    
    return <>
            <Modal
                width='30%'    
                open={modal.visible}
                afterClose={modal.remove}
                onCancel={modal.hide}
                title={t('邮件告警设置')}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={async configs => {
                        Object.
                            entries(configs).
                            forEach(([key, val]) => {
                            config.set_config(key, val as string)
                        })
                        await config.save_configs()
                        await config.load_configs()
                        model.message.success(t('保存成功'))
                        modal.remove()
                    }}
                    initialValues={initialValues}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    >
                    {Object.entries(EMAIL_CONFIG_ITEMS)
                        .map(([name, { label, component }]) => 
                            <Form.Item key={name} label={t(label)} name={name}>
                                {component}
                            </Form.Item>)}
                    <Form.Item wrapperCol={{ offset: 8, span: 16 }} >
                        <Space size={20} wrap>
                            <Button htmlType='button' onClick={modal.hide}>{t('取消')}</Button>
                            <Button htmlType='button' onClick={handle_test_email}>{t('测试邮件')}</Button>
                            <Button type='primary' htmlType='submit'>{t('保存')}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
            
            <TestEmailModal modal={test_modal} />
        </>
})
