import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.js'
import { Button, Form, message, Modal, Switch } from 'antd'

import { request } from '@/data-collection/utils.js'

interface IProps {
    ids: string[]
    after_delete?:  () => Promise<void>
    name?: string
}
export const DeleteConnectionModal = NiceModal.create((props: IProps) => {
    const { ids, after_delete, name } = props
    
    const modal = useModal()
    
    async function on_delete (values) {
        await request('dcp_deleteConnect', { ids, ...values })
        message.success(t('删除成功'))
        await after_delete()
        modal.hide()
    }
    
    
    return <Modal 
            footer={null} 
            title={
                name 
                ? t('确定要删除连接 {{name}} 吗？', { name }) 
                : t('确定要删除选中的 {{num}} 个连接吗', { num: ids.length })
            } 
            open={modal.visible} 
            afterClose={modal.remove} 
            onCancel={modal.hide}
        >
        <Form className='subscribe-delete-form' onFinish={on_delete}>
            <Form.Item 
                name='dropUseTable' 
                className='subscribe-delete-form-item' 
                required 
                label={t('是否销毁流表')} 
                initialValue={false}
            >
                <Switch />
            </Form.Item>
            <Form.Item className='subscribe-delete-form-item delete-form-item'>
                <Button htmlType='submit' danger type='primary'>{t('删除')}</Button>
            </Form.Item>
            </Form>
    </Modal>
})
