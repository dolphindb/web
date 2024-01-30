import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Input, InputNumber, Modal, Select } from 'antd'
import { useCallback } from 'react'
import { type CEPEngineDetail } from './type.js'
import { t } from '../../../i18n/index.js'
import { FormDependencies } from '../../components/formily/FormDependcies'
import { TIME_COMPONENT } from '../../shell/QueryGuide/components/QueryForm.js'
import { VALUE_TYPES } from '../../shell/QueryGuide/constant.js'
import { DdbDict, type DdbValue, type DdbObj, DdbForm } from 'dolphindb'
import { model } from '../../model.js'

interface IProps { 
    engine_info: CEPEngineDetail
}

export function InputField ({ type }: { type: string }) { 
    if (Object.keys(TIME_COMPONENT).includes(type))
        // 事件类型
        return TIME_COMPONENT[type]
        // 数值类型
        else if (VALUE_TYPES.includes(type)) 
            return <InputNumber />
        // 其余类型
        else
            return <Input />
}

export const SendEventModal = NiceModal.create((props: IProps) => { 
    const { engine_info: { msgSchema = [ ], name } } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_send = useCallback(async () => {
        const { event_type, ...others } = await form.validateFields()
        let dict = { }
        const { eventValuesTypeString: types } = msgSchema.find(item => item.eventType === event_type)
        for (let i in Object.entries(others)) { 
            const [key, value] = others[i]
            // if()
            const obj = await model.ddb.eval(JSON.stringify(value))
            dict[key] = obj
        }
        // @ts-ignore
        await model.ddb.call('appendEvent', [name, new DdbDict(dict)])
        modal.hide()
    }, [ name ])
    
    return <Modal 
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={async () => model.execute(on_send)}
        className='cep-send-event-wrapper'
    >
        <Form form={form}>
            <Form.Item label={t('事件类型')} name='event_type'>
                <Select options={ msgSchema.map(item => ({ label: item.eventType, value: item.eventType })) } />
            </Form.Item>
            <div className='event-fields-wrapper'>
                <h4>{t('事件字段')}</h4>
                <FormDependencies dependencies={['event_type']}>
                    { ({ event_type }) => { 
                        const { eventKeys: keys, eventValuesTypeString: types } = msgSchema.find(item => item.eventType === event_type)
                        return keys.map((key, idx) => <Form.Item name={key} key={key} label={key} rules={[{ required: true }]}>
                            <InputField type={types[idx]} />
                        </Form.Item>)
                    } }
                </FormDependencies>
            </div>
        </Form>
    </Modal>
})
