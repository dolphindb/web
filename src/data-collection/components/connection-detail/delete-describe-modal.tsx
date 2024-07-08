import './index.scss'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Form, Switch, Button } from 'antd'

import { useCallback } from 'react'


import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'

interface IProps {
    ids: string[]
    refresh: () => void
}


export const DeleteDescribeModal = NiceModal.create(({ ids = [ ], refresh }: IProps) => {
    
    const modal = useModal()
    
    const on_delete = useCallback(async (params: { dropUseTable: boolean }) => {
        await request('dcp_deleteSubscribe', { ...params, ids })
        modal.hide()
        refresh()
    }, [ids, refresh])
    
    
    return <Modal 
            title={t('删除订阅')} 
            footer={null} 
            width={600} 
            onCancel={modal.hide} 
            open={modal.visible}
        >
        <Form className='subscribe-delete-form' onFinish={async values => { on_delete(values) } }>
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
