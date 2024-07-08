import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Table } from 'antd'
import useSWR from 'swr'

import { useMemo } from 'react'

import type { ColumnProps } from 'antd/es/table/Column.js'

import { request } from '../../utils.js'

interface IProps {
    id: string
}
export const ViewStatusModal = NiceModal.create(({ id }: IProps) => {
    const modal = useModal()
    
    const { data, isLoading } = useSWR(
        ['dcp_getSubStatus', id],
        async () => request('dcp_getSubStatus', { subId: id })
    )
    
    const columns = useMemo<ColumnProps<any>[]>(() => {
        return [ ]
    }, [ ])
    
    console.log(data)
    
    return <Modal open={modal.visible} loading={isLoading} width='80%' onCancel={modal.hide} footer={null}>
        <Table dataSource={[ ]} />
    </Modal>
})
