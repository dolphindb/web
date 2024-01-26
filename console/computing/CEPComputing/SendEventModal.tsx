import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Form, Modal, Select } from "antd";
import { useCallback } from "react";
import { CEPEngineDetail } from "./type";

interface IProps { 
    engine_info: CEPEngineDetail
}

export const SendEventModal = NiceModal.create((props: IProps) => { 
    const { engine_info } = props
    const modal = useModal()
    
    const on_send = useCallback(() => { },[])
    
    return <Modal 
        open={modal.visible}
        onCancel={modal.hide}
        afterClose={modal.remove}
        onOk={on_send}
    >
        <Form>
            <Form.Item>
                <Select />
            </Form.Item>
        </Form>
    </Modal>
})