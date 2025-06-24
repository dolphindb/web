import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { List, Modal, Typography } from 'antd'

import useSWR from 'swr'

import { t } from '@i18n'
import { request } from '../../utils.ts'
import type { Protocol } from '../../type.js'

interface IProps {
    protocol: Protocol
}

export const ViewLogModal = NiceModal.create(({ protocol }: IProps) => {
    const modal  = useModal()
    
    const { data = [ ], isLoading } = useSWR(
        ['dcp_getLog', protocol],
        async () => request<string[]>('dcp_getLog', { protocol })
    )
    
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
            pagination={{ defaultPageSize: 10, showQuickJumper: true }}
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
