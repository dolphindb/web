import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Button, Form, Input, Modal, Space, Switch } from 'antd'

import { config } from '@/config/model.ts'
import { model } from '@/model.ts'

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


export const EmailConfigModal = NiceModal.create(() => {
    const modal = useModal()   
    
    const initialValues = Object.fromEntries(
        Object.keys(EMAIL_CONFIG_ITEMS).map(key => [
            key, 
            key.endsWith('Enabled') 
                ? config.get_config(key) === 'true'
                : config.get_config(key) || ''
        ])
    )
    return <Modal
        width='30%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        title={t('邮件告警设置')}
        footer={null}
    >
        <Form
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
            {Object.entries(EMAIL_CONFIG_ITEMS).map(([name, { label, component }]) => <Form.Item key={name} label={t(label)} name={name}>
                    {component}
                </Form.Item>)}
            <Form.Item wrapperCol={{ offset: 8, span: 16 }} >
                <Space size={20} wrap>
                    <Button htmlType='button' onClick={modal.hide}>{t('取消')}</Button>
                    <Button type='primary' htmlType='submit'>{t('保存')}</Button>
                </Space>
            </Form.Item>
        </Form>
    </Modal>
})
 
