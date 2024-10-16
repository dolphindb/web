import useSWR from 'swr'

import { AutoComplete, Button, Col, Form, Input, Row, Select, Space, Tooltip } from 'antd'


import { DeleteOutlined, FileTextOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons'

import Link from 'antd/es/typography/Link.js'

import { get } from 'lodash'

import { t } from '@i18n/index.js'

import { request } from '../../utils.ts'
import { kafka_params_doc_link } from '../../constant.js'

import { FormDependencies } from '@/components/formily/FormDependcies/index.js'

const DEFAULT_DATA = {
    consumerCfgList: [ ]
}

export function KafkaConfig () {
    const { data = DEFAULT_DATA } = useSWR(
        'dcp_getKafkaConsumerCfgList',
        async () => request<{ consumerCfgList: string[] }>('dcp_getKafkaConsumerCfgList')
    )
    
    return <div className='kafka-params-list-wrapper'>
        <Space className='kafka-params-title' size='small'>
            {t('Kafka 消费参数配置')}
            <Tooltip title={t('设置偏移量与分区，group.id 参数会失效')}>
                <QuestionCircleOutlined />
            </Tooltip>
            <Link className='kafka-link-doc' href={kafka_params_doc_link} target='_blank'>
                <FileTextOutlined />
            </Link>
        </Space>
        <Form.List name='consumerCfg' initialValue={[{ key: 'group.id' } ]}>
            {(fields, { add, remove }) => <>
                {
                    fields.map((field, idx) => {
                        return <Row key={field.name} className='kafka-params-item' gutter={[16, 0]}>
                            <Col span={11}>
                                <Form.Item label={t('参数')} name={[field.name, 'key']} rules={[{ required: true, message: t('请选择参数') }]}>
                                    <AutoComplete 
                                        disabled={idx === 0} 
                                        showSearch 
                                        placeholder={t('请选择参数')} 
                                        options={
                                            data.consumerCfgList
                                            .filter(item => item !== 'group.id')
                                            .map(item => ({ label: item, value: item }))
                                        } />
                                </Form.Item>
                            </Col>
                            <Col span={11}>
                                <FormDependencies dependencies={[['consumerCfg', field.name, 'key']]}>
                                    {(values => {
                                        const key = get(values, ['consumerCfg', field.name, 'key'])
                                        return <Form.Item 
                                            label={t('参数值')} 
                                            name={[field.name, 'value']} 
                                            required
                                            rules={[
                                                {
                                                    validator: async (_rule, value) => {
                                                        if (!value) 
                                                            return Promise.reject(t('请输入参数值'))
                                                        if (value?.includes(' '))
                                                            return Promise.reject(t('参数值不能含有空格'))
                                                        return Promise.resolve()
                                                    }
                                                }
                                            
                                            ]}
                                            >
                                            {key?.includes('password') ? <Input.Password  placeholder={t('请输入参数值')}/> : <Input placeholder={t('请输入参数值')}/>}
                                        </Form.Item>
                                    })}
                                </FormDependencies>
                            </Col>
                            <Col span={2}>
                                <Button icon={<DeleteOutlined />} type='link' disabled={idx === 0} danger className='delete-icon-btn' onClick={() => { remove(field.name) }} />
                            </Col>
                        </Row>
                    }) 
                }
            <Button icon={<PlusOutlined />} type='dashed' block onClick={() => { add() }}>
                {t('增加消费参数配置')}
            </Button>
            
        </>}
    </Form.List>
        
    </div>
}
