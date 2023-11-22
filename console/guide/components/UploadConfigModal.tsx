import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Modal } from 'antd'
import { useCallback } from 'react'
import { safe_json_parse } from '../../dashboard/utils.js'
import { UploadFileField } from './UploadFileField.js'

interface IProps { 
    apply: (info: any) => void
}

export const UploadConfigModal = NiceModal.create((props: IProps) => { 
    const { apply } = props
    const [form] = Form.useForm()
    
    const modal = useModal()
    
    const on_apply = useCallback(async () => {
        try {
            await form.validateFields()
            const { file } = form.getFieldsValue()
            const config = safe_json_parse(await file.file.text())
            apply(config)
            await modal.hide()
        } catch { }
     }, [ apply ])
    
    return <Modal
        title='应用配置'
        open={modal.visible}
        onCancel={async () => modal.hide()}
        afterClose={() => { modal.remove() }}
        onOk={on_apply}
    >
        <Form form={form}>
            <UploadFileField accept='application/json' tip='仅支持上传JSON文件'/>
        </Form>
    </Modal>
})
