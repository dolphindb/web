import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Modal, Select, Typography, message } from 'antd'
import { useCallback, useMemo } from 'react'

import { type ICEPEngineDetail } from '../type.js'
import { t } from '../../../../i18n/index.js'
import { DdbDict, DdbType } from 'dolphindb/browser.js'
import { model } from '../../../model.js'
import { DdbObjField } from './DdbObjField.js'

interface IProps { 
    engine_info: ICEPEngineDetail
    on_refresh: () => void
}

export const SendEventModal = NiceModal.create((props: IProps) => { 
    const { on_refresh } = props
    
    const { msgSchema, engineStat: { name } } = props.engine_info
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_send = useCallback(async () => {
        let values
        values = await form.validateFields()
        const params = new DdbDict(values)
        await model.execute(async () => model.ddb.call('appendEvent', [name, params]))
        message.success(t('发送成功'))
        on_refresh?.()
        modal.hide()
    }, [name, msgSchema, on_refresh])
    
    const event_type = Form.useWatch('eventType', form)
    
    const msg_item = useMemo(() => {
        const item = msgSchema.find(item => item.eventType === event_type)
        return {
            types: item?.eventValuesTypeStringList?.concat(['DECIMAL(32)S']) ?? [ ],
            type_ids: item?.eventValuesTypeIntList?.concat([DdbType.decimal32]) ?? [ ],
            keys: item?.eventKeys?.concat(['test']) ?? [ ]
        }
     }, [event_type])
    
    return <Modal 
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={on_send}
        className='cep-send-event-wrapper'
        title={t('发送事件到 {{name}} 引擎', { name })}
        width={700}
    >
        <Form form={form} colon={false} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} labelAlign='left'>
            <Form.Item label={t('事件类型')} name='eventType' rules={[{ required: true }] }>
                <Select placeholder={t('请选择事件类型')} options={ msgSchema.map(item => ({ label: item.eventType, value: item.eventType })) } />
            </Form.Item>
            {
                event_type && <div className='event-fields-wrapper'>
                    <h4>
                        {t('事件字段')}
                        <Typography.Link target='_blank' className='type-doc-link' href='https://docs.dolphindb.cn/zh/progr/data_types.html'>{t('类型说明')}</Typography.Link>
                    </h4>
                    { msg_item.keys.map((key, idx) => <Form.Item
                            name={key}
                            key={key}
                            label={key}
                            required
                            rules={[
                                {
                                    validator: async (_, value, cb) => { 
                                        if (!value)
                                            return Promise.reject(t('请输入'))
                                        else if (msg_item.type_ids[idx] !== value?.type)
                                            return Promise.reject(t('输入类型有误，请检查'))
                                } }
                            ]}
                        >
                            <DdbObjField key={key} type={msg_item.types[idx]} type_id={msg_item.type_ids[idx]} placeholder={t('数据类型为 {{type}}', { type: msg_item.types[idx] }) } />
                        </Form.Item>
                    ) }
                </div>
            
            }
        </Form>
    </Modal>
})
