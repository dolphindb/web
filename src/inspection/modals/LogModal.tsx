import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Editor } from '@monaco-editor/react'
import { Modal } from 'antd'
import useSWR from 'swr'

import { inspection } from '@/inspection/model.ts'

interface LogModalProps {
    node?: string
    report_id: string
}


export const LogModal =  NiceModal.create(({ report_id, node }: LogModalProps) => {
    const modal = useModal()
    
    const { data: logs, isLoading } = useSWR(['get_logs', report_id, node], async () => inspection.get_logs(report_id, node))
    return <Modal
        className='add-param-modal'       
        width='80%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('查看日志')}
    >
      <Editor
        key={logs}
        options={{
          readOnly: true,
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
        }}
        loading={isLoading}
        value={logs}
        language='logs'
      />
    </Modal>
})
