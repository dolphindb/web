import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Form, Input, Modal, Select, Space } from 'antd'
import { t } from '../../i18n/index.js'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { CONFIG_CLASSIFICATION } from './type.js'
import { useCallback } from 'react'


export const NodesConfigAddModal = NiceModal.create(() => {
    const modal = NiceModal.useModal()
    
    const filter_config = useCallback(
        (input: string, option?: { label: string, options: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()), [ ])
    
    return <Modal
                className='add-config-modal' 
                open={modal.visible}
                onCancel={modal.hide}
                maskClosable={false}
                title={t('新增配置')}
                footer={false}
                afterClose={modal.remove}>
                
                <Form     
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 20 }}>
                    <Form.Item
                        label='Qualifier'
                        name='qualifier'
                    >
                        <Input placeholder='eg dn1 or dn% or empty'/>
                    </Form.Item>
    
                    <Form.Item
                        label='Name'
                        name='name'
                        rules={[{ required: true, message: t('请输入或选择配置项名') }]}
                        >
                        <AutoComplete 
                            showSearch
                            optionFilterProp='label'
                            filterOption={filter_config}
                            options={Object.keys(CONFIG_CLASSIFICATION).map(cfg_cls => ({
                                label: cfg_cls,
                                options: CONFIG_CLASSIFICATION[cfg_cls].map(cfg => ({
                                    label: cfg,
                                    value: cfg
                                }))
                            }))}/>
                    </Form.Item>
                    
                    <Form.Item
                        label='Value'
                        name='value'
                        rules={[{ required: true, message: t('请输入配置项值') }]}
                        >
                        <Input />
                    </Form.Item>
                    
                    <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                    <Button  
                        type='primary' 
                        htmlType='submit'
                        >
                        {t('确定')}
                    </Button>
                    </Form.Item>
                </Form>
            </Modal>
})
