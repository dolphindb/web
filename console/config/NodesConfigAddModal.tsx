import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Form, Input, Modal } from 'antd'

import { useCallback } from 'react'

import { DdbDatabaseError } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { CONFIG_CLASSIFICATION } from './type.js'
import { config } from './model.js'


export const NodesConfigAddModal = NiceModal.create(() => {
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
                        label={t('限定词')}
                        name='qualifier'
                    >
                        <Input placeholder='eg dn1 or dn% or empty'/>
                    </Form.Item>
    
                    <Form.Item
                        label={t('配置项')}
                        name='name'
                        rules={[{ required: true, message: t('请输入或选择配置项') }]}
                        >
                        <AutoComplete 
                            showSearch
                            optionFilterProp='label'
                            // @ts-ignore
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
                        label={t('值')}
                        name='value'
                        rules={[{ required: true, message: t('请输入配置值') }]}
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
                            async () => {
                                try {
                                    const { qualifier, name, value } = await add_config_form.validateFields()
                                    const key = (qualifier ? qualifier + '.' : '') + name
                                    await config.change_nodes_config([[key, { qualifier, name, value, key }]])
                                    model.message.success(t('保存成功，重启控制/数据节点生效'))
                                    modal.hide()
                                } catch (error) {
                                    // 数据校验不需要展示报错弹窗
                                    if (error instanceof DdbDatabaseError)
                                        throw error
                                }
                            }
                        }
                        >
                        {t('保存')}
                    </Button>
                    </Form.Item>
                </Form>
            </Modal>
})
