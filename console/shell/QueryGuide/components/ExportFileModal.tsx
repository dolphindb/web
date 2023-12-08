import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Modal, Form, Input } from 'antd'
import { useCallback } from 'react'
import { request } from '../../../guide/utils.js'
import { useBoolean } from 'ahooks'

import { safe_json_parse } from '../../../dashboard/utils.js'

interface IProps { 
    table: string
    code: string
}

const key = 'export_notification'

// const export_notification_config = {
//     [ExportStatus.FAILED]: {
//         icon: <CloseCircleFilled className='export-error-icon' />,
//         message: t('导出失败') 
//     },
//     [ExportStatus.SUCCESS]: {
//         icon: <CheckCircleFilled className='export-success-icon' />,
//         message: t('您的数据已导出成功！')
//     },
//     [ExportStatus.LOADING]: {
//         icon: <LoadingOutlined className='export-loading-icon'/>,
//         description: t('正在导出您查询的数据文件，请耐心等待...'),
//     }
// }

export const ExportFileModal = NiceModal.create((props: IProps) => {
    const { table, code } = props
    const modal = useModal()
    const [form] = Form.useForm()
    const [loading, action] = useBoolean(false)
    
    // const [api, contextHolder] = notification.useNotification()
    
    // const open_notification = useCallback((status: ExportStatus) => {
    //     api.open({
    //         key,
    //         message: t('数据导出'),
    //         ...export_notification_config[status]
    //     })
    // }, [ ])
    
  
    const download = useCallback(async () => { 
        try { 
            action.setTrue()
            await form.validateFields()
            const { name } = form.getFieldsValue()
            const { csvContent } = safe_json_parse(new TextDecoder().decode((await request('executeQuery', { code }))))
            const link = document.createElement('a')
            link.href = 'data:application/vnd.ms-excel;charset=utf-8,\uFEFF' + encodeURIComponent(csvContent)
            link.download = `${name}.csv`
            link.click()
            link.remove()
            action.setFalse()
            modal.hide()
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
