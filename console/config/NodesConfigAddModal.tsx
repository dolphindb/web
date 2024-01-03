import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Form, Input, Modal } from 'antd'
import { t } from '../../i18n/index.js'
import { CONFIG_CLASSIFICATION } from './type.js'
import { useCallback } from 'react'
import { config } from './model.js'
import { model } from '../model.js'

interface NodesConfigAddModalProps {
    configs: string[]
}

export const NodesConfigAddModal = NiceModal.create((props: NodesConfigAddModalProps) => {
    const { configs } = props
    
    const modal = NiceModal.useModal()
    
    const [add_config_form] = Form.useForm()
    
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
                    wrapperCol={{ span: 20 }}
                    form={add_config_form}
                    >
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
                            // @ts-ignore
                            options={Object.entries(CONFIG_CLASSIFICATION).map(([cfg_cls, configs]) => ({
                                label: cfg_cls,
                                options: Array.from(configs).map(cfg => ({
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
                    
                    <Form.Item wrapperCol={{ offset: 9, span: 15 }}>
                    <Button 
                        className='mr-btn'
                        onClick={modal.hide}
                    >
                        {t('取消')}
                    </Button>
                    
                    <Button  
                        type='primary' 
                        htmlType='submit'
                        onClick={
                            () => {
                                model.execute(
                                    async () => {
                                        const { qualifier, name, value } = await add_config_form.validateFields()
                                        const new_config = (qualifier ? qualifier + '.' : '') + name + '=' + value 
                                        await config.save_nodes_config([new_config, ...configs])
                                    }
                                )
                                model.message.success(t('保存成功'))
                                modal.hide()
                            }
                        }
                        >
                        {t('保存')}
                    </Button>
                    </Form.Item>
                </Form>
            </Modal>
})
