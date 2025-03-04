import './index.scss'

import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { App, Form, Input, InputNumber, Modal, Select, Switch, Tag, Tooltip } from 'antd'

import { useCallback, useMemo, useState } from 'react'

import { isNil } from 'lodash'

import { QuestionCircleOutlined } from '@ant-design/icons'

import useSWR from 'swr'

import { t } from '../../../../i18n/index.js'
import { Protocol, type ISubscribe } from '../../type.js'
import { safe_json_parse } from '../../../dashboard/utils.ts'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'

import { create_subscribe, edit_subscribe, get_parser_templates } from '../../api.js'

import { NodeSelect } from '../../../components/node-select/index.js'

import { NAME_RULES } from '@/data-collection/constant.js'

import { KafkaConfig } from './kafka-config.js'


interface IProps {
    /** 修改时传 */
    edited_subscribe?: ISubscribe
    // 创建时传
    connection_id?: string
    protocol: Protocol
    refresh: () => void
    mode: 'create' | 'edit' | 'view'
}

const title_map = {
    create: t('创建订阅'),
    edit: t('修改订阅'),
    view: t('查看订阅')
}

export const CreateSubscribeModal = NiceModal.create((props: IProps) => {
    const { edited_subscribe, connection_id, refresh, protocol, mode } = props
    
    const { message } = App.useApp()
    
    console.log(App.useApp(), 'ttt')
    
    const [handlerId, setHandlerId] = useState(edited_subscribe?.handlerId)
    
    
    const { data: { items: templates } = { items: [ ] } } = useSWR(
        protocol ? ['dcp_getParserTemplateList', protocol] : null,
        async () => get_parser_templates(protocol)
    )
    
    const [template_params_names, set_template_params_names] = useState(
        edited_subscribe 
        ? safe_json_parse(edited_subscribe.templateParams).map(item => item?.key)
        : [ ]
    )
    
    const modal = useModal()
    const [form] = Form.useForm<ISubscribe>()
    const partition = Form.useWatch('partition', form)
    const offset = Form.useWatch('offset', form)
    
    const on_submit = useCallback(async values => {   
        const is_edit = mode === 'edit'         
        if (is_edit) 
            await edit_subscribe(protocol, { ...values, id: edited_subscribe.id, })
        else 
            await create_subscribe(protocol, { ...values, connectId: connection_id } )
        message.success(is_edit ? t('修改成功') : t('创建成功'))
        modal.hide()
        refresh()
    }, [mode, connection_id, refresh])
    
    
    const protocol_params = useMemo(() => {
        switch (protocol) {
            case Protocol.MQTT:
                return <Form.Item label={t('接收缓冲区大小')} name='recvbufSize' tooltip={t('默认为 20480 字节')}>
                    <InputNumber min={0} placeholder={t('请输入接收缓冲区大小')}/>
                </Form.Item>
            case Protocol.KAFKA:
                return <>
                    <Form.Item 
                        rules={[
                            { 
                                validator: async (_, value) => {
                                    if ((offset && !value) || (value && !offset)) 
                                        return Promise.reject(t('偏移量与分区需同时设置，或者均不设置'))        
                                    return Promise.resolve()
                                },
                                validateTrigger: ['onSubmit']
                            }
                        ]} 
                        label={t('分区', { context: 'data_collection' })} 
                        name='partition' 
                        initialValue={null}
                    >
                        <InputNumber min={0} placeholder={t('请输入分区数')} precision={0}/>
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
                        <InputNumber min={0} placeholder={t('请输入偏移量')} precision={0}/>
                    </Form.Item>
                    {/* kafka 消费配置 */}
                    <KafkaConfig />
                </>
            default:
                return  null
        }
    }, [protocol, offset, partition])
    
    return <Modal 
        className='create-subscribe-modal'
        width='60%' 
        open={modal.visible} 
        onCancel={modal.hide} 
        afterClose={modal.remove} 
        title={title_map[mode]}
        onOk={form.submit}
        destroyOnClose
    >
        <Form 
            className='subscribe-form'
            form={form}
            onFinish={on_submit} 
            initialValues={edited_subscribe ?? undefined} 
            labelCol={{ span: 6 }}
            disabled={mode === 'view'}
        >
            <Form.Item 
                label={t('名称')} 
                name='name' 
                rules={NAME_RULES}
            >
                <Input placeholder={t('请输入名称')}/>
            </Form.Item>
            <Form.Item label={t('主题', { context: 'data_collection' })} name='topic' rules={[{ required: true, message: t('请输入主题') }, ...NAME_RULES.slice(1)]} >
                <Input placeholder={t('请输入主题')}/>
            </Form.Item>
            <Form.Item label={t('节点')} name='subNode' tooltip={t('默认为当前节点')}>
                <NodeSelect protocol={protocol}/>
            </Form.Item>
            <Form.Item label={t('是否需要点位解析')} initialValue={false} name='parseJson'>
                <Switch />
            </Form.Item>
            <FormDependencies dependencies={['parseJson']}>
                {({ parseJson }) => {
                    if (!parseJson)
                        return <Form.List name='templateParams' initialValue={[{ }]}>
                            {() => <>
                                    <Form.Item name={[0, 'key']} hidden initialValue='outputTableName'>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item 
                                        label={t('默认流表名称')} 
                                        name={[0, 'value']} 
                                        rules={[
                                            { required: true, message: t('请输入默认流表名称') },
                                            { validator: async (_rule, value) => {
                                                if (value && value.includes(' '))
                                                    return Promise.reject(t('默认流表名称不能包含空格'))
                                                return Promise.resolve()
                                            } }
                                        ]}
                                    >
                                        <Input placeholder={t('请输入默认流表名称')}/>
                                    </Form.Item>
                                
                                </>}
                        </Form.List>
                    else
                        return <>
                            <Form.Item label={t('点位解析模板')} name='handlerId' rules={[{ required: true, message: t('请选择点位解析模板') }]}>
                                <Select 
                                    onSelect={val => { 
                                        setHandlerId(val) 
                                        const names = templates?.find(item => item.id === val)?.templateParams || [ ]
                                        set_template_params_names(names)
                                        form.setFieldValue('templateParams', names.map(key => ({ key })))
                                    }}
                                    options={templates.map(item => (
                                        { 
                                            value: item.id, 
                                            label: (<div className='parser-template-label'>
                                                {item.name}
                                                <Tag color='blue' bordered={false}>{item.protocol}</Tag>
                                            </div> )
                                        }))} 
                                    placeholder={t('请选择点位解析模板')}
                                />
                            </Form.Item>
                            
                            {!isNil(handlerId) && <div className='parser-template-params'>
                 
                                <h4>
                                    {t('模板参数')}
                                    <Tooltip title={t('请注意，自定义解析模板的输出流表需要自行创建')}>
                                        <QuestionCircleOutlined className='parser-template-header-icon'/>
                                    </Tooltip>
                                </h4>
               
                                <Form.List name='templateParams'>
                                    {fields => fields.map(field => <div key={field.key}>
                                        <Form.Item name={[field.name, 'key']} hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item 
                                            rules={[
                                                { 
                                                    validator: async (_rule, value) => {
                                                        if (!!value && value?.includes(' '))
                                                            return Promise.reject(t('参数值不能包含空格'))
                                                        return Promise.resolve()
                                                    },
                                             }]} 
                                            name={[field.name, 'value']} 
                                            label={template_params_names[field.key]}
                                        >
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
