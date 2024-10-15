import NiceModal from '@ebay/nice-modal-react'
import { AutoComplete, Button, Form, Input, Modal, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'

import { useCallback } from 'react'

import { DdbDatabaseError } from 'dolphindb/browser.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { config } from './model.js'


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
        footer={false}
        afterClose={modal.remove}>
        
        <Form
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            form={add_config_form}
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
                    options={Object.entries(model.get_config_classification()).map(([cfg_cls, configs]) => ({
                        label: cfg_cls,
                        options: Array.from(configs).map(cfg => ({
                            label: cfg,
                            value: cfg
                        }))
                    }))} />
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
                        }
                    }
                >
                    {t('保存')}
                </Button>
            </Form.Item>
        </Form>
    </Modal>
})
