import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Form, Input, InputNumber, Modal, Select } from "antd";
import { useCallback } from "react";
import { CEPEngineDetail } from "./type.js";
import { t } from "../../../i18n/index.js";
import { FormDependencies } from "../../components/formily/FormDependcies";

interface IProps { 
    engine_info: CEPEngineDetail
}

const FIELD_MAP = {
    "INT": <InputNumber precision={0} />
}

export const SendEventModal = NiceModal.create((props: IProps) => { 
    const { engine_info: { msgSchema = [] } } = props
    const modal = useModal()
    const [form] = Form.useForm()
    
    const on_send = useCallback(async () => {
        const values = await form.validateFields()
        
    },[])
    
    return <Modal 
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={on_send}
        className='cep-send-event-wrapper'
    >
        <Form form={form}>
            <Form.Item label={t('事件类型')} name="event_type">
                <Select options={ msgSchema.map(item => ({label: item.eventType, value: item.eventType})) } />
            </Form.Item>
            <div className='event-fields-wrapper'>
                <h4>{t('事件字段')}</h4>
                <FormDependencies dependencies={['event_type']}>
                    {({ event_type }) => { 
                        const { eventKeys: keys, eventValuesTypeString: types } = msgSchema.find(item => item.eventType === event_type)
                        return keys.map((key, idx) => <Form.Item name={key} key={key} label={key} rules={[{required: true}]}>
                            <Input></Input>
                        </Form.Item>)
                    } }
                </FormDependencies>
            </div>
        </Form>
    </Modal>
})