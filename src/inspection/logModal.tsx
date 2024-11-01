import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { t } from '@i18n/index.ts'
import { Editor } from '@monaco-editor/react'
import { Modal } from 'antd'
import useSWR from 'swr'

import { inspection } from './model.tsx'

interface LogModalProps {
    // node 代表需要 rpc
    node?: string
    reportId: string
}


export const LogModal =  NiceModal.create(({ reportId, node }: LogModalProps) => {
    const modal = useModal()
    
    const { data: logs } = useSWR(['get_logs', reportId, node], async () => inspection.get_logs(reportId, node))
    console.log('logs:', logs)
    return <Modal
        className='add-param-modal'       
        width='50%'    
        open={modal.visible}
        afterClose={modal.remove}
        onCancel={modal.hide}
        footer={null}
        title={t('查看日志')}
    >
      <Editor
        height={400}
        options={{
          readOnly: true,
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
        }}
        value={logs}
        language='logs'
      />
    </Modal>
})
