import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Modal, Select, Typography, message } from 'antd'
import { useCallback, useMemo } from 'react'

import { DdbDict, DdbType } from 'dolphindb/browser.js'

import type { DdbObj } from 'dolphindb'

import { type ICEPEngineDetail } from '../type.js'
import { t } from '../../../../i18n/index.js'
import { model } from '../../../model.js'

import { convertDecimalType } from '../../../utils/decimal.js'

import { DdbObjField } from './DdbObjField.js'

interface IProps { 
    engine_info: ICEPEngineDetail
    on_refresh: () => void
}

export const SendEventModal = NiceModal.create(({ on_refresh, engine_info }: IProps) => { 
    
    const { eventSchema, engineStat: { name } } = engine_info
    
    
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_send = useCallback(async () => {
        try { 
            const values = await form.validateFields() 
            const params = new DdbDict(values)
            await model.ddb.call('appendEvent', [name, params])
            message.success(t('发送成功'))
            on_refresh?.()
            modal.hide()
        }
        catch { }
    }, [name, eventSchema, on_refresh])
    
    const event_type = Form.useWatch('eventType', form)
    
    const msg_item = useMemo(() => {
        const item = eventSchema.find(item => item.eventType === event_type)
        return {
            types: item?.eventValuesTypeStringList ?? [ ],
            type_ids: item?.eventValuesTypeIntList ?? [ ],
            keys: item?.eventField ?? [ ],
            forms: item?.eventFormIdList ?? [ ]
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
        <Form form={form} colon={false} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} labelAlign='left'>
            <Form.Item label={t('事件类型')} name='eventType' rules={[{ required: true }] }>
                <Select placeholder={t('请选择事件类型')} options={ eventSchema.map(item => ({ label: item.eventType, value: item.eventType })) } />
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
                            tooltip={msg_item.type_ids[idx] === DdbType.point && (msg_item.forms[idx] === 0) ? '格式为 a,b，例如(1, 2)则填入1,2' : null}
                            rules={[
                                {
                                    validator: async (_, value: DdbObj | undefined) => { 
                                        if (!value)
                                            return Promise.reject(t('请输入事件字段'))
                                        
                                        if (msg_item.types[idx].includes('DECIMAL')) { 
                                            // decimal 类型的需要先转化 type，精度不同 type 也不同
                                            const [type_id] = convertDecimalType(msg_item.type_ids[idx])
                                            if (type_id !== value?.type) 
                                                return Promise.reject(t('字段类型有误，请检查'))
                                        }
                                        else if (msg_item.type_ids[idx] !== value?.type || msg_item.forms[idx] !== value?.form)
                                            return Promise.reject(t('字段类型有误，请检查'))
                                } }
                            ]}
                        >
                        <DdbObjField key={key} type={msg_item.types[idx]} form={msg_item.forms[idx]} type_id={msg_item.type_ids[idx]} placeholder={t('数据类型为 {{name}}', { name: msg_item.types[idx] }) } />
                        </Form.Item>
                    ) }
                </div>
            
            }
        </Form>
    </Modal>
})
