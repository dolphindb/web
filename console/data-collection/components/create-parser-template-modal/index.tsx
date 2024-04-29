import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { Modal, Form, Input, message } from 'antd'

import { useCallback } from 'react'

import type { ParserTemplate } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { Editor } from '../../../shell/Editor/index.js'
import { request } from '../../utils.js'

interface IProps {
    editedTemplate?: ParserTemplate
    refresh: () => void
}


export function EditorField ({ onChange, ...others }: any) {
    return <Editor on_change={onChange} {...others}/>   
}

export const ParserTemplateModal = NiceModal.create(({ refresh, editedTemplate }: IProps) => {
    
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_submit = useCallback(async () => {
        let params
        
        try {
            params = await form.validateFields()
        } catch { return }
        if (editedTemplate) {
            await request('dcp_updateHandler', { ...params, id: editedTemplate.id })
            message.success('修改成功')
        }
        else {
            await request('dcp_addHandler', params)
            message.success(t('创建成功'))
        }
        modal.hide()
        refresh()
    }, [refresh, editedTemplate])
    
    
    
    return <Modal onOk={on_submit} title={editedTemplate ? t('编辑模板') : t('创建模板')} width={1000} open={modal.visible} onCancel={modal.hide} afterClose={modal.remove}>
        <Form initialValues={editedTemplate} form={form} labelAlign='left' labelCol={{ span: 2 }}>
            <Form.Item label={t('名称')} name='name' rules={[{ required: true, message: t('请输入名称') }]}>
                <Input placeholder={t('请输入模板名称')} />
            </Form.Item>
            <Form.Item label={t('备注')} name='comment'>
                <Input placeholder={t('请输入备注')}/>
            </Form.Item>
            <Form.Item label={t('代码')} name='handler' className='handler-form-item' rules={[{ required: true, message: t('请输入代码') }]}>
                <EditorField />
            </Form.Item>
        </Form>
    </Modal>
}) 
