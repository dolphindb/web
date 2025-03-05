import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Form, Input, Modal, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'

import { useCallback } from 'react'

import { DdbDatabaseError } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { FormDependencies } from '@/components/formily/FormDependcies/index.js'

import { config, get_config_rules } from './model.js'


export const NodesConfigAddModal = NiceModal.create((props: { compute_group?: string, on_save?: () => void }) => {
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
        // footer={false}
        onOk={add_config_form.submit}
        onClose={modal.hide}
        afterClose={modal.remove}>
        
        <Form
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            form={add_config_form}
            onFinish={async () => {
                try {
                    const { qualifier, name, value } = await add_config_form.validateFields()
                    let key = (qualifier ? qualifier + '.' : '') + name
                    if (props.compute_group)
                        key = `${props.compute_group}%.${key}`
                    await config.change_configs([[key, { qualifier, name, value, key }]])
                    model.message.success(t('保存成功，重启数据节点 / 计算节点生效'))
                    props.on_save?.()
                    modal.hide()
                } catch (error) {
                    // 数据校验不需要展示报错弹窗
                    if (error instanceof DdbDatabaseError)
                        throw error
                }
            }}
            
        >
            {!props.compute_group && <Form.Item
                label={<span>
                    {t('限定词')}
                    <Tooltip title={t('指定此配置适用的节点名或节点名前缀（例如：node1 或 node%）')}>
                        <span style={{ margin: '0 4px' }}><QuestionCircleOutlined /></span>
                    </Tooltip>
                </span>}
                name='qualifier'
            >
                <Input placeholder='e.g. dn1 or dn% or empty' />
            </Form.Item>}
            
            <Form.Item
                label={t('配置项')}
                name='name'
                rules={[{ required: true, message: t('请输入或选择配置项') }]}
            >
                <AutoComplete<{ label: string, otpions: { label: string, value: string } }>
                    showSearch
                    optionFilterProp='label'
                    filterOption={filter_config}
                    options={Object.entries(config.get_config_classification()).map(([cfg_cls, configs]) => ({
                        label: cfg_cls,
                        options: Array.from(configs).map(cfg => ({
                            label: cfg,
                            value: cfg
                        }))
                    }))} />
            </Form.Item>
            <FormDependencies dependencies={['name']}>
                {({ name }) => <Form.Item
                    label={t('值')}
                    name='value'
                    dependencies={['name']}
                    rules={[
                        ({ getFieldValue }) => ({
                            async validator (_, value) {
                                const name = getFieldValue('name')
                                if (!name) 
                                    return Promise.reject(new Error(t('请先选择配置项')))
                                
                                const rules = get_config_rules(name)
                                for (const rule of rules) {
                                    if (rule.required && !value) 
                                        return Promise.reject(new Error(rule.message))
                                    
                                    if (rule.pattern && !rule.pattern.test(value)) 
                                        return Promise.reject(new Error(rule.message))
                                    
                                }
                                return Promise.resolve()
                            },
                        }), 
                    ]}
                >
                    <Input />
                </Form.Item>}
            </FormDependencies>
            
            
        </Form>
    </Modal>
})
