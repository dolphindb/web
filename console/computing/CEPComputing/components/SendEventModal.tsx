import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Modal, Select, Typography } from 'antd'
import { useCallback } from 'react'
import { type ICEPEngineDetail } from '../type.js'
import { t } from '../../../../i18n/index.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { DdbDict, type DdbObj, type DdbValue, DdbType } from 'dolphindb'
import { model } from '../../../model.js'
import { DdbObjField } from './DdbObjField.js'

interface IProps { 
    engine_info: ICEPEngineDetail
}

const test_msg_schema = [{
    eventType: 'order',
    eventKeys: [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j'
    ],
    eventValuesTypeStringList: [
        'INT',
        'DATE',
        'MONTH',
        'DATETIME',
        'MINUTE',
        'TIMESTAMP',
        'DATEHOUR',
        'MINUTE',
        'TIME',
        'SECOND'
    ],
    eventValuesTypeInt: [DdbType.int, DdbType.date, DdbType.month, DdbType.datetime, DdbType.minute, DdbType.timestamp, DdbType.datehour, DdbType.minute, DdbType.time, DdbType.second]
}]

export const SendEventModal = NiceModal.create((props: IProps) => { 
    
    const { msgSchema = test_msg_schema, EngineStat: { name } } = props.engine_info
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_send = useCallback(async () => {
        const values = await form.validateFields()
        const params = new DdbDict(values)
        // @ts-ignore
        await model.ddb.call('appendEvent', [name, params])
        modal.hide()
    }, [name, msgSchema])
    
    const validate_type = useCallback(async (value: DdbObj<DdbValue>, type: number) => {
        if (type !== value.type)
            return Promise.reject(t('输入类型有误，请检查'))
    }, [ ])
    
    const event_type = Form.useWatch('eventType', form)
    
    return <Modal 
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={async () => model.execute(on_send)}
        className='cep-send-event-wrapper'
        title={t('发送事件到 {{name}} 引擎', { name })}
        width={700}
    >
        <Form form={form} colon={false} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} labelAlign='left'>
            <Form.Item label={t('事件类型')} name='eventType' rules={[{ required: true }] }>
                <Select options={ msgSchema.map(item => ({ label: item.eventType, value: item.eventType })) } />
            </Form.Item>
            {
                event_type && <div className='event-fields-wrapper'>
                <FormDependencies dependencies={['eventType']}>
                    {({ eventType }) => {
                        if (!eventType)
                            return null
                        const { eventKeys: keys = [ ], eventValuesTypeStringList: types = [ ], eventValuesTypeInt: type_ids } = msgSchema.find(item => item.eventType === eventType) ?? { }
                        
                        return <>
                            <h4>
                                {t('事件字段')}
                                <Typography.Link target='_blank' className='type-doc-link' href='https://docs.dolphindb.cn/zh/progr/data_types.html'>{t('类型说明')}</Typography.Link>
                            </h4>
                            {keys.map((key, idx) => <Form.Item
                                name={key}
                                key={key}
                                label={key}
                                rules={[
                                    { required: true },
                                    { validator: async (_, value) => validate_type(value, type_ids[idx])  }
                                ]}
                            >
                                <DdbObjField key={key} type={types[idx]} placeholder={t('数据类型为 {{type}}', { type: types[idx] }) } />
                            </Form.Item>
                        ) }
                        </>
                    } }
                </FormDependencies>
            </div>
            
            }
        </Form>
    </Modal>
})
