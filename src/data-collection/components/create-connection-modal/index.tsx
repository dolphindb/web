import './index.scss'
import { Button, Form, Input, InputNumber, Modal, message } from 'antd'

import { useCallback } from 'react'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { t } from '../../../../i18n/index.js'
import { Protocol, type Connection } from '../../type.js'
import { request } from '../../utils.js'

interface IProps {
    editedConnection?: Connection
    protocol: string
    refresh: () => void
}

export const CreateConnectionModal = NiceModal.create((props: IProps) => {
    const [form] = Form.useForm()
    const { protocol, refresh, editedConnection } = props
    
    const modal = useModal()
    
    const on_submit = useCallback(async values => {
        if (editedConnection)
            await request('dcp_updateConnect', { ...values, id: editedConnection.id })
        else
            await request('dcp_addConnect', { ...values, protocol })   
        message.success(editedConnection ? t('编辑成功') : t('创建成功'))
        modal.hide()
        refresh()
    }, [ refresh, protocol ])
    
    return <Modal 
        title={t('创建 {{name}}连接', { name: protocol + ' 协议' })}
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove}
        width={800}
        footer={null}
        className='create-connection-modal'
    >
        <Form labelAlign='left' labelCol={{ span: 6 }} form={form} onFinish={on_submit} initialValues={editedConnection}>
            <Form.Item 
                label={t('名称')} 
                name='name' 
                rules={[
                    { required: true, message: t('请输入名称') },
                    {
                        validator: async (_rule, value) => {
                            if (value.includes(' ')) 
                                return Promise.reject(t('名称不能包含空格'))
                            return Promise.resolve()
                        }
                    }
                ]}>
                <Input placeholder={t('请输入名称')}/>
            </Form.Item>
            <Form.Item 
                label={t('服务器地址')}
                name='host' 
                rules={[
                    { required: true, message: t('请输入服务器地址') },
                    { 
                        pattern: /^(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/g,
                        message: t('请输入有效的服务器地址') 
                    } 
                ]}>
                <Input placeholder={t('请输入服务器地址')}/>
            </Form.Item>
            <Form.Item 
                label={t('端口')} 
                name='port' 
                rules={[
                    { required: true, message: t('请输入端口') },
                    { 
                        pattern: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g, 
                        message: t('请输入有效的端口') 
                    }
                ]}>
                <InputNumber min={0} placeholder={t('请输入端口')}/>
            </Form.Item>
            {
                protocol === Protocol.MQTT && <>
                    <Form.Item label={t('用户名')} name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
                        <Input placeholder={t('请输入用户名')}/>           
                    </Form.Item>
                    <Form.Item label={t('密码')} name='password'  rules={[{ required: true, message: t('请输入密码') }]}>
                        <Input.Password placeholder={t('请输入密码')}/>
                    </Form.Item>
                </>
            }
            <Form.Item className='submit-btn-form-item'>
                <Button htmlType='submit' type='primary'>{t('确定')}</Button>
            </Form.Item>
        </Form>
    </Modal>
})
