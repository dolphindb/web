import NiceModal from '@ebay/nice-modal-react'
import { Button, Form, Input, Modal, Select, Space } from 'antd'
import { t } from '../../i18n/index.js'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'


export const NodesConfigAddModal = NiceModal.create(() => {
    const modal = NiceModal.useModal()
    
    return <Modal
                className='add-config-modal' 
                open={modal.visible}
                onCancel={modal.hide}
                maskClosable={false}
                title={t('新增配置')}
                footer={false}
                afterClose={modal.remove}>
                
            <Form
                name='add-config-form'
                // onFinish={onFinish}
                // style={{ maxWidth: 600 }}
                autoComplete='off'
            >
                    <Form.List name='config'>
                    {(fields, { add, remove }) => <>
                        {fields.map(({ key, name, ...restField }) => <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align='baseline'>
                            <Form.Item
                                {...restField}
                                name={[name, 'qualifier']}
                                rules={[{ required: true, message: 'Missing first name' }]}
                            >
                                <Input placeholder='eg dn1 or dn% or empty' />
                            </Form.Item>
                            <Form.Item
                                {...restField}
                                name={[name, 'key']}
                                rules={[{ required: true, message: 'Missing last name' }]}
                            >
                                <Select 
                                    placeholder={t('请输入或选择配置项')} 
                                    // options={}    
                                />
                            </Form.Item>
                            <Form.Item
                                {...restField}
                                name={[name, 'value']}
                                rules={[{ required: true, message: 'Missing last name' }]}
                            >
                                <Input placeholder={t('请输入配置值')} />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => { remove(name) }} />
                            </Space>)}
                        <Form.Item>
                            <Button type='dashed' onClick={() => { add() }} block icon={<PlusOutlined />}>
                            Add field
                            </Button>
                        </Form.Item>
                        </>}
                    </Form.List>
                    <Form.Item>
                    <Button type='primary' htmlType='submit'>
                        Submit
                    </Button>
                    </Form.Item>
                </Form> 
            </Modal>
})
