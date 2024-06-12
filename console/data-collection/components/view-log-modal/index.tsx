import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { List, Modal, Spin, Typography } from 'antd'

import useSWR from 'swr'

import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'

export const ViewLogModal = NiceModal.create(() => {
    
    const modal  = useModal()
    
    const { data = [ ], isLoading } = useSWR(
        'dcp_getMQTTLog',
        async () => request<string[]>('dcp_getMQTTLog')
    )
    
    console.log(data, 'data')
    
    return <Modal 
        title={t('日志')} 
        width='80%' 
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove}
        footer={null}
    >
        
        <List 
            loading={isLoading}
            className='log-list'
            pagination={{ pageSize: 10, showQuickJumper: true }}
            dataSource={data} 
            size='small'
            bordered={false}
            renderItem={(item, idx) => <List.Item key={idx}>
                <Typography.Text>
                    {item}
                </Typography.Text>
            </List.Item>}
        />
    
    </Modal>
})
