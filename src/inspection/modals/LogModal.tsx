import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { MonacoEditor } from '@components/Editor/MonacoEditor.tsx'
import { Modal } from 'antd'
import useSWR from 'swr'

import { t } from '@i18n'
import { inspection } from '@/inspection/model.ts'

interface LogModalProps {
    node?: string
    report_id: string
}

export const LogModal = NiceModal.create(({ report_id, node }: LogModalProps) => {
    const modal = useModal()
    
    const { data: logs, isLoading } = useSWR(['get_logs', report_id, node], async () =>
        inspection.get_logs(report_id, node))
    
    if (isLoading)
        return
    
    return <Modal
        className='add-param-modal'
        width='80%'
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('查看日志')}
    >
        <MonacoEditor
            key={logs}
            readonly
            default_value={logs}
            language='logs'
        />
    </Modal>
})
