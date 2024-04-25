import './index.scss'
import { Button, Form, Input, InputNumber, Modal, message } from 'antd'

import { useCallback } from 'react'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { t } from '../../../../i18n/index.js'
import { model } from '../../../model.js'

interface IProps {
    protocol: string
    refresh: () => void
}

export const CreateConnectionModal = NiceModal.create((props: IProps) => {
    const [form] = Form.useForm()
    const { protocol, refresh } = props
    
    const modal = useModal()
    
    const on_create = useCallback(async values => {
        await model.ddb.call('dcp_addConnect', [
          JSON.stringify({ ...values, protocol })  
        ])   
        message.success(t('创建成功'))
        modal.hide()
        refresh()
    }, [ refresh, protocol ])
    
    return <Modal 
        title={t('创建 {{name}}连接', { name: protocol + ' 协议' })}
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove}
        onOk={on_create}
        width={800}
        footer={null}
        className='create-connection-modal'
    >
        <Form labelAlign='left' labelCol={{ span: 6 }} form={form} onFinish={on_create}>
        <Form.Item label={t('名称')} name='name' rules={[{ required: true, message: t('请输入名称') }]}>
            <Input placeholder={t('请输入名称')}/>
        </Form.Item>
        <Form.Item label={t('服务器地址')} name='host' rules={[{ required: true, message: t('请输入服务器地址') }]}>
            <Input placeholder={t('请输入服务器地址')}/>
        </Form.Item>
        <Form.Item label={t('端口')} name='port' rules={[{ required: true, message: t('请输入端口') }]}>
            <InputNumber min={0} placeholder={t('请输入端口')}/>
        </Form.Item>
        <Form.Item label={t('用户名')} name='username' rules={[{ required: true, message: t('请输入用户名') }]}>
            <Input placeholder={t('请输入用户名')}/>           
        </Form.Item>
        <Form.Item label={t('密码')} name='password'  rules={[{ required: true, message: t('请输入密码') }]}>
            <Input placeholder={t('请输入密码')}/>
        </Form.Item>
        <Form.Item name='batchSize' label={t('数据包大小')} tooltip={t('当待发布内容是一个表时，可以分批发送，表示每次发送的记录行数')}>
            <InputNumber min={1} placeholder={t('请输入数据包大小')} />
        </Form.Item>
        <Form.Item name='sendbufSize' label={t('发送缓冲区大小')} tooltip={t('不填默认为 40960')}>
            <InputNumber min={1} placeholder={t('请输入发送缓冲区大小')}/>
        </Form.Item>
        
        <Form.Item className='submit-btn-form-item'>
            <Button htmlType='submit' type='primary'>{t('确定')}</Button>
        </Form.Item>
    </Form>
    </Modal>
})
