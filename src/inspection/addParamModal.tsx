import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Button, DatePicker, Form, Input, Modal, Select, Table } from 'antd'

import type { Metric, MetricParam, MetricsWithStatus } from './type.ts'
import { MetricGroupTable } from './inspectionForm.tsx'

export const addParamModal = NiceModal.create(({ 
    checked_metrics, 
    set_checked_metrics 
}: 
{ 
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void 
}) => {
    const modal = useModal()   
    
    return <Modal
        className='add-param-modal'       
        width='50%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('添加指标')}
    >
      <MetricGroupTable checked_metrics={checked_metrics} set_checked_metrics={set_checked_metrics} editing close={modal.hide}/>
    </Modal>
})
 
