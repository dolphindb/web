import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Modal } from 'antd'

import { useState } from 'react'


import type { MetricsWithStatus } from '@/inspection/type.ts'
import { MetricGroupTable } from '@/inspection/components/metricTable.tsx'

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
      <MetricGroupTable 
        checked_metrics={checked_metrics} 
        set_checked_metrics={set_checked_metrics} 
        editing 
        close={modal.hide}
        renderFooter={footerNode => {
            // 使用 setTimeout 来避免在渲染周期中更新状态陷入死循环
            setTimeout(() => { setFooter(footerNode) }, 0)
            return null
        }}/>
    </Modal>
})
 
