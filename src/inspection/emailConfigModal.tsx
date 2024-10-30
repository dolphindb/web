import { error } from 'console'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Button, Form, Input, Modal, Space, Switch, Tooltip } from 'antd'

import useSWR from 'swr'

import { useEffect } from 'react'

import { WarningOutlined } from '@ant-design/icons'

import { config } from '@/config/model.ts'
import { model } from '@/model.ts'

import { inspection } from './model.tsx'

export function EmailConfigWarnning () {
    return <Tooltip 
                title={t('请安装 httpClient 插件到所有节点')}>
            <WarningOutlined className='email-config-warning'/> 
    </Tooltip>
}

export const EmailConfigModal = NiceModal.create(() => {
    const modal = useModal()   
    
    const { email_config } = inspection.use(['email_config'])
    
    useEffect(() => {
        if (email_config.error_msg)
            model.message.error(email_config.error_msg)
    }, [email_config.error_msg ])
    
    return <Modal
        width='30%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        title={<div className='email-config-modal-title'>
            {t('邮件告警设置')}
            {email_config.error_msg && <EmailConfigWarnning/>}
        </div>}
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
            initialValues={{ 
                inspectionAlertEnabled: config.get_config('inspectionAlertEnabled') === 'true',
                inspectionAlertUserId: config.get_config('inspectionAlertUserId'),
                inspectionAlertPwd: config.get_config('inspectionAlertPwd'),
                inspectionAlertStdSMTPMsgEnabled: config.get_config('inspectionAlertStdSMTPMsgEnabled') === 'true',
                inspectionAlertSMTPEmailName: config.get_config('inspectionAlertSMTPEmailName'),
                inspectionAlertSMTPHost: config.get_config('inspectionAlertSMTPHost'),
                inspectionAlertSMTPPort: config.get_config('inspectionAlertSMTPPort')
            }}
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            >
            <Form.Item label={t('是否启用')} name='inspectionAlertEnabled'><Switch/></Form.Item>
            <Form.Item label={t('邮箱名称')} name='inspectionAlertSMTPEmailName'><Input/></Form.Item>
            
            <Form.Item label={t('邮箱 SMTP 服务器地址')} name='inspectionAlertSMTPHost'><Input/></Form.Item>
            <Form.Item label={t('邮箱 SMTP 服务器端口')} name='inspectionAlertSMTPPort'><Input/></Form.Item>
            
            <Form.Item label={t('发送者邮箱账号')} name='inspectionAlertUserId'><Input type='email'/></Form.Item>
            <Form.Item label={t('发送者邮箱密码')} name='inspectionAlertPwd'><Input.Password visibilityToggle/></Form.Item>
            <Form.Item label={t('使用标准 SMTP 消息')} name='inspectionAlertStdSMTPMsgEnabled'><Switch/></Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }} >
                <Space size={20} wrap>
                    <Button htmlType='button' onClick={modal.hide}>{t('取消')}</Button>
                    <Button type='primary' htmlType='submit'>{t('保存')}</Button>
                </Space>
            </Form.Item>
        </Form>
    </Modal>
})
 
