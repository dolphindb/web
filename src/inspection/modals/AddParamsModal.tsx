import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n'
import { Modal } from 'antd'

import { useState } from 'react'


import type { MetricsWithStatus } from '@/inspection/type.ts'
import { MetricTable } from '@/inspection/components/MetricTable.tsx'

interface AddParamsModalProps {
    checked_metrics: Map<string, MetricsWithStatus>
    set_checked_metrics: (metrics: Map<string, MetricsWithStatus>) => void 
}

export const AddParamsModal = NiceModal.create(({ 
    checked_metrics, 
    set_checked_metrics 
}: AddParamsModalProps) => {
    const modal = useModal()
    
    const [footer, setFooter] = useState<React.ReactNode>(null)
    
    return <Modal
        className='add-param-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        title={t('添加指标')}
        footer={footer}
    >
      <MetricTable 
        checked_metrics={checked_metrics} 
        set_checked_metrics={set_checked_metrics} 
        editing 
        close={modal.hide}
        setFooter={setFooter}/>
    </Modal>
})
 
