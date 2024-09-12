import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { Modal, Form, Input, message, Select, Segmented, Button } from 'antd'

import { useCallback, useState } from 'react'

import type { IParserTemplate } from '../../type.js'
import { t } from '../../../../i18n/index.js'
import { request } from '../../utils.js'
import { NAME_RULES, protocols, template_code } from '../../constant.js'
import { Editor } from '../../../components/Editor/index.js'

interface IProps {
    editedTemplate?: IParserTemplate
    refresh: () => void
    mode?: 'edit' | 'view'
}


export function EditorField ({ onChange, disabled = false, ...others }: any) {
    
    const [mode, set_mode] = useState(0)
    
    return <>
        <Segmented 
            className='editor-segmented' 
            onChange={val => { set_mode(val) }} 
            options={[
                { label: t('自定义模板'), value: 0 }, 
                { label: t('模板参考'), value: 1 }
            ]} 
        />
        {mode === 0 && <Editor readonly={disabled} on_change={onChange} {...others}/> }
        {mode === 1 && <Editor readonly={disabled} value={template_code} />}
    
    </>  
}

interface FormValues {
    name: string
    protocol: string
    comment?: string
    handler: string
}

export const ParserTemplateModal = NiceModal.create(({ refresh, editedTemplate, mode = 'edit' }: IProps) => {
    
    const modal = useModal()
    const [form] = Form.useForm<FormValues>()
    
    const on_submit = useCallback(async (values: FormValues) => {        
        if (editedTemplate) {
            await request('dcp_updateHandler', { ...values, id: editedTemplate.id })
            message.success(t('修改成功'))
        }
        else {
            await request('dcp_addHandler', values)
            message.success(t('创建成功'))
        }
        modal.hide()
        refresh()
    }, [refresh, editedTemplate])
    
    
    
    return <Modal 
        footer={null}
        className='create-parser-template-modal'
        title={editedTemplate ? t('编辑模板') : t('创建模板')} 
        width={'80%'} 
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove}
        >
        <Form 
            onFinish={on_submit}
            disabled={mode === 'view'}
            className='parser-template-form' 
            initialValues={editedTemplate} 
            form={form} 
            labelAlign='left' 
            labelCol={{ span: 4 }}
        >
            <Form.Item 
                label={t('名称')} 
                name='name' 
                rules={NAME_RULES}
            >
                <Input placeholder={t('请输入模板名称')} />
            </Form.Item>
            <Form.Item label={t('协议')} name='protocol' rules={[{ required: true, message: t('请选择协议') }]}>
                <Select placeholder={t('请选择协议')} options={protocols.map(item => ({ label: item, value: item }))}/>
            </Form.Item>
            <Form.Item label={t('备注')} name='comment'>
                <Input placeholder={t('请输入备注')}/>
            </Form.Item>
            <Form.Item label={t('代码')} name='handler' className='handler-form-item' rules={[{ required: true, message: t('请输入代码') }]}>
                <EditorField disabled={mode === 'view'}/>
            </Form.Item>
            <Form.Item className='submit-btn-form-item'>
                <Button htmlType='submit' type='primary'>{t('确定')}</Button>
            </Form.Item>
        </Form>
    </Modal>
}) 
