import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Form, Input, message } from 'antd'
import { useCallback } from 'react'
import { request } from '../../../guide/utils.js'
import { useBoolean } from 'ahooks'

import { safe_json_parse } from '../../../dashboard/utils.js'
import { t } from '../../../../i18n/index.js'

interface IProps { 
    table: string
    code: string
}


export const ExportFileModal = NiceModal.create((props: IProps) => {
    const { table, code } = props
    const modal = useModal()
    const [form] = Form.useForm()
    const [loading, action] = useBoolean(false)
  
    const download = useCallback(async () => { 
        try { 
            action.setTrue()
            await form.validateFields()
            const { name } = form.getFieldsValue()
            const res = await request<any>('executeQuery', { code })
            let text = ''
            if (typeof res.csvContent === 'string')  
                text = res.csvContent
             else
                text = (safe_json_parse(new TextDecoder().decode((await request('executeQuery', { code }))))).csvContent
            const link = document.createElement('a')
            link.href = 'data:application/vnd.ms-excel;charset=utf-8,\uFEFF' + encodeURIComponent(text)
            link.download = `${name}.csv`
            link.click()
            link.remove()
            action.setFalse()
            modal.hide()
            message.success(t('导出成功'))
        } catch { 
            action.setFalse()
        }
    }, [code])
    
    
    
    return <Modal
        title='导出数据'
        width={600}
        open={modal.visible}
        onOk={download}
        onCancel={modal.hide}
        afterClose={modal.remove}
        okButtonProps={{ loading }}
    >
        <Form form={form}>
            <Form.Item rules={[{ required: true, message: '请输入文件名' }]} name='name' label='文件名' initialValue={table}>
                <Input addonAfter='.csv' placeholder='请输入文件名' />
            </Form.Item>
        </Form>
    </Modal>
    
    
})
