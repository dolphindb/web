import useSWR from 'swr'

import { AutoComplete, Button, Col, Form, Input, Row, Select, Space } from 'antd'

import { t } from 'xshell/i18n/instance.js'

import { DeleteOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'

import Link from 'antd/es/typography/Link.js'

import { get } from 'lodash'

import { request } from '../../utils.js'
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
            {t('kafka 消费参数配置')}
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
                                <Form.Item tooltip={t('设置偏移量与分区，group.id 参数会失效')} label={t('参数')} name={[field.name, 'key']} rules={[{ required: true, message: t('请选择参数') }]}>
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
                                            rules={[{ required: true, message: t('请输入参数值') }]}
                                            >
                                            {key?.includes('password') ? <Input.Password  placeholder={t('请输入参数值')}/> : <Input  placeholder={t('请输入参数值')}/>}
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
