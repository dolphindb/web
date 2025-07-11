import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Input, Modal } from 'antd'
import { useCallback } from 'react'

import { t } from '@i18n'

interface IProps { 
    config: any
}

export const DownloadConfigModal = NiceModal.create((props: IProps) => {
    const { config } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_download_config = useCallback(async () => { 
        try {
            const { name } =  await form.validateFields()
            let a = document.createElement('a')
            a.download = `${name}.json`
            a.href = URL.createObjectURL(
                new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' })
            )
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            modal.hide()
        } catch { }
    }, [config])
    
    
    
    return <Modal
        title={t('导出表单配置')}
        onOk={on_download_config}
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
    >
        <Form form={form}>
            <Form.Item name='name' label={t('名称')} rules={[{ required: true, message: t('请输入文件名称') }]}>
                <Input placeholder={t('请输入文件名称')} addonAfter='.json'/>
            </Form.Item>
        </Form>
    </Modal>
 })
