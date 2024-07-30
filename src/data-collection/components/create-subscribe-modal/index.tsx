import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Form, Input, InputNumber, Modal, Select, Space, Spin, Switch, Tag, Tooltip, message } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import { isNil } from 'lodash'

import { QuestionCircleOutlined } from '@ant-design/icons'

import { t } from '../../../../i18n/index.js'
import { Protocol, type ISubscribe, type IParserTemplate } from '../../type.js'
import { safe_json_parse } from '../../../dashboard/utils.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'

import { create_subscribe, edit_subscribe } from '../../api.js'

import { NodeSelect } from '../node-select/index.js'

import { KafkaConfig } from './kafka-config.js'

interface IProps {
    /** 修改时传 */
    edited_subscribe?: ISubscribe
    parser_templates: IParserTemplate[]
    // 创建时传
    connection_id?: string
    protocol: Protocol
    refresh: () => void
}

export const CreateSubscribeModal = NiceModal.create((props: IProps) => {

    const { edited_subscribe, parser_templates = [ ], connection_id, refresh, protocol } = props
    
    const modal = useModal()
    const [form] = Form.useForm<ISubscribe>()
    
    const [handlerId, setHandlerId] = useState(edited_subscribe?.handlerId)
    const [template_params_names, set_template_params_names] = useState(
        edited_subscribe 
        ? safe_json_parse(edited_subscribe.templateParams).map(item => item?.key)
        : [ ]
    )
    
    const partition = Form.useWatch('partition', form)
    const offset = Form.useWatch('offset', form)
    
    const protocol_params = useMemo(() => {
        switch (protocol) {
            case Protocol.MQTT:
                return <Form.Item label={t('接收缓冲区大小')} name='recvbufSize' tooltip={t('默认为 20480')}>
                    <InputNumber min={0} placeholder={t('请输入接收缓冲区大小')}/>
                </Form.Item>
            case Protocol.KAFKA:
                return <>
                    <Form.Item 
                        rules={[
                            { 
                                validator: async (_, value) => {
                                    console.log(value)
                                    if ((offset && !value) || (value && !offset)) 
                                        return Promise.reject(t('偏移量与分区需同时设置，或者均不设置'))        
                                    return Promise.resolve()
                                },
                                validateTrigger: ['onSubmit']
                            }
                        ]} 
                        label={t('分区')} 
                        name='partition' 
                        initialValue={null}
                    >
                        <InputNumber min={0} placeholder={t('请输入分区数')}/>
                    </Form.Item>
                    <Form.Item 
                        label={t('偏移量')} 
                        name='offset' 
                        initialValue={null}
                        rules={[
                            { 
                                validator: async (_, value) => {
                                    if ((partition && !value) || (value && !partition)) 
                                        return Promise.reject(t('偏移量与分区需同时设置，或者均不设置'))        
                                    return Promise.resolve()
                                },
                                validateTrigger: ['onSubmit']
                            }
                        ]} 
                    >
                        <InputNumber min={0} placeholder={t('请输入偏移量')}/>
                    </Form.Item>
                    {/* kafka 消费配置 */}
                    <KafkaConfig />
                </>
            default:
                return  null
        }
    }, [protocol, offset, partition])
    
    const on_submit = useCallback(async () => {        
        try { await form.validateFields() } catch { return }
        let values = await form.getFieldsValue()
        
        if (edited_subscribe) 
            await edit_subscribe(protocol, { ...values, id: edited_subscribe.id, })
        else 
            await create_subscribe(protocol, { ...values, connectId: connection_id } )
        message.success(edited_subscribe ? t('修改成功') : t('创建成功'))
        modal.hide()
        refresh()
    }, [edited_subscribe, connection_id, refresh])
    
    return <Modal 
        className='create-subscribe-modal'
        width='60%' 
        onOk={on_submit}
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove} 
        title={edited_subscribe ? t('修改订阅') : t('创建订阅')}
        destroyOnClose
    >
        <Form 
            className='subscribe-form'
            form={form} 
            initialValues={edited_subscribe ?? undefined} 
            labelAlign='left' 
            labelCol={{ span: 6 }}
        >
            <Form.Item 
                label={t('名称')} 
                name='name' 
                rules={[
                    { required: true, message: t('请输入名称') },
                    {
                        validator: async (_rule, value) => {
                            if (value.includes(' ')) 
                                return Promise.reject(t('名称不能包含空格'))
                            return Promise.resolve()
                        }
                    }
                ]}
            >
                <Input placeholder={t('请输入名称')}/>
            </Form.Item>
            <Form.Item label={t('主题')} name='topic' rules={[{ required: true, message: t('请输入主题') }]} >
                <Input placeholder={t('请输入主题')}/>
            </Form.Item>
            <Form.Item label={t('节点')} name='subNode' tooltip={t('默认为当前节点')}>
                <NodeSelect />
            </Form.Item>
            <Form.Item label={t('是否需要点位解析')} initialValue={false} name='parseJson'>
                <Switch />
            </Form.Item>
            <FormDependencies dependencies={['parseJson']}>
                {({ parseJson }) => {
                    if (!parseJson)
                        return <Form.List name='templateParams' initialValue={[{ }]}>
                            {() => {
                                return <>
                                    <Form.Item name={[0, 'key']} hidden initialValue='outputTableName'>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item 
                                        label={t('默认流表名称')} 
                                        name={[0, 'value']} 
                                        rules={[{ required: true, message: t('请输入默认流表名称') }]}
                                    >
                                        <Input placeholder={t('请输入默认流表名称')}/>
                                    </Form.Item>
                                
                                </>
                            }}
                        </Form.List>
                    else
                        return <>
                            <Form.Item label={t('点位解析模板')} name='handlerId' rules={[{ required: true, message: t('请选择点位解析模板') }]}>
                                <Select 
                                    onSelect={val => { 
                                        setHandlerId(val) 
                                        const names = parser_templates?.find(item => item.id === val)?.templateParams || [ ]
                                        set_template_params_names(names)
                                        form.setFieldValue('templateParams', names.map(key => ({ key })))
                                    }}
                                    options={parser_templates.map(item => (
                                        { 
                                            value: item.id, 
                                            label: (<div className='parser-template-label'>
                                                {item.name}
                                                <Tag color='processing' bordered={false}>{item.protocol}</Tag>
                                            </div> )
                                        }))} 
                                    placeholder={t('请选择点位解析模板')}
                                />
                            </Form.Item>
                            
                            {!isNil(handlerId) && <div className='parser-template-params'>
                                {/* <Space className="parser"> */}
                                    <h4>
                                        {t('模板参数')}
                                        <Tooltip title={t('请注意，自定义解析模板的输出流表需要自行创建')}>
                                            <QuestionCircleOutlined className='parser-template-header-icon'/>
                                        </Tooltip>
                                    </h4>
                                    
                                {/* </Space> */}
                                <Form.List name='templateParams'>
                                    {fields => fields.map(field => <div key={field.key}>
                                        <Form.Item name={[field.name, 'key']} hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item rules={[{ required: true, message: t('请输入参数值') }]} name={[field.name, 'value']} label={template_params_names[field.key]}>
                                            <Input placeholder={t('请输入参数值')} />
                                        </Form.Item>
                                    </div>)}
                                </Form.List>    
                            </div>}
                        </>
                }}
            </FormDependencies>
            
            {protocol_params}
            
        </Form>
    </Modal>
})
