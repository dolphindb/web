import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Button, Form, Input, InputNumber, Modal, Select, Spin, Tag, message } from 'antd'

import { useCallback, useState } from 'react'

import { isNil } from 'lodash'

import { t } from '../../../../i18n/index.js'
import type { ParserTemplate, Subscribe } from '../../type.js'
import { request } from '../../utils.js'

interface IProps {
    /** 修改时传 */
    edited_subscribe?: Subscribe
    parser_templates: ParserTemplate[]
    // 创建时传
    connection_id?: string
    refresh: () => void
}

export const CreateSubscribeModal = NiceModal.create((props: IProps) => {
    const { edited_subscribe, parser_templates = [ ], connection_id, refresh } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const [handlerId, setHandlerId] = useState<number>(edited_subscribe?.handlerId)
    const [template_params_names, set_template_params_names] = useState([ ])
    
    const on_submit = useCallback(async () => {        
        try { await form.validateFields() } catch { return }
        let values = await form.getFieldsValue()
        values = { ...values, templateParams: JSON.stringify(values?.templateParams) }
        
        if (edited_subscribe) 
            await request('dcp_updateSubscribe', { ...edited_subscribe, ...values })
        else
            await request('dcp_addSubscribe', { ...values, connectId: Number(connection_id) })
            message.success(edited_subscribe ? t('修改成功') : t('创建成功'))
        modal.hide()
        refresh()
    }, [edited_subscribe, connection_id])
    
    return <Modal 
        className='create-subscribe-modal'
        footer={null} 
        width={800} 
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove} 
        title={edited_subscribe ? t('修改订阅') : t('创建订阅')}
        destroyOnClose
    >
        <Form 
            form={form} 
            initialValues={edited_subscribe ? { ...edited_subscribe, templateParams: JSON.parse(edited_subscribe.templateParams) } : undefined} 
            labelAlign='left' 
            labelCol={{ span: 6 }}
        >
            <Form.Item label={t('名称')} name='name' rules={[{ required: true, message: t('请输入名称') }]}>
                <Input placeholder={t('请输入名称')}/>
            </Form.Item>
            <Form.Item label={t('主题')} name='topic' rules={[{ required: true, message: t('请输入主题') }]} >
                <Input placeholder={t('请输入主题')}/>
            </Form.Item>
            <Form.Item label={t('点位解析模板')} name='handlerId' rules={[{ required: true, message: t('请选择点位解析模板') }]}>
                <Select 
                    onSelect={val => { 
                        setHandlerId(val) 
                        const names = JSON.parse(parser_templates?.find(item => item.id === val)?.templateParams || '[]')
                        set_template_params_names(names)
                        form.setFieldValue('templateParams', names.map(key => ({ key })))
                    }}
                    options={parser_templates.map(item => (
                        { 
                            value: item.id, 
                            label: <div className='parser-template-label'>
                                {item.name}
                                <Tag color='processing' bordered={false}>{item.protocol}</Tag>
                            </div> 
                        }))} 
                    placeholder={t('请选择点位解析模板')}
                />
            </Form.Item>
            
            
            {!isNil(handlerId) && <div className='parser-template-params'>
                <h4>{t('模板参数')}</h4>
                <Form.List name='templateParams'>
                    {fields => fields.map(field => <div key={field.key}>
                        <Form.Item name={[field.name, 'key']} hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item rules={[{ required: true, message: t('请输入参数值') }]} name={[field.name, 'value']} label={template_params_names[field.key]}>
                            <Input placeholder={t('请输入参数值')} />
                        </Form.Item>
                    </div>)}
                </Form.List>    
            </div>}
             
           
                
            <Form.Item label='接收缓冲区大小' name='recvbufSize' tooltip={t('默认为 20480')}>
                <InputNumber placeholder={t('请输入接收缓冲区大小')}/>
            </Form.Item>
        </Form>
        <Form.Item className='submit-btn-form-item'>
            <Button onClick={on_submit} type='primary'>{t('确定')}</Button>
        </Form.Item>
    </Modal>
})
