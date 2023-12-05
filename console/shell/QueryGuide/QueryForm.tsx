import { Card, Form, Input, InputNumber, Select, Spin, Typography } from 'antd'
import useSWR from 'swr'
import { shell } from '../model.js'
import { NodeType, model } from '../../model.js'
import {  DdbFunctionType } from 'dolphindb'
import { isNumber } from 'lodash'
import { useState } from 'react'
import { ColSelectTransfer } from './ColSelectTransfer.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'
import { StringTimePicker } from '../../components/StringTimePicker.js'
import { STRING_OPERATIONS, VALUE_OPERATIONS, VALUE_TYPES } from './constant.js'
import { PlusOutlined } from '@ant-design/icons'
import { t } from '../../../i18n/index.js'

interface IProps { 
    database: string
    table: string
}

interface IColumn { 
    name: string
    data_type: string
}

export const TIME_COMPONENT = {
    DATE: <StringDatePicker />,
    MONTH: <StringDatePicker submitFormat='YYYY.MM' />,
    TIME: <StringTimePicker format='HH:mm:ss' />,
    MINUTE: <StringTimePicker format='HH:mm' />,
    SECOND: <StringTimePicker format='HH:mm:ss' />,
    DATETIME: <StringDatePicker format='YYYY.MM.DD HH:mm:ss' />,
    TIMESTAMP: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' showTime />,
    NANOTIME: <StringTimePicker format='HH:mm:ss' />,
    NANOTIMESTAMP: <StringDatePicker format='YYYY.MM.DD HH:mm:ss' />,
} 

export function QueryCard (props: { title: string, name: string, cols: IColumn[] }) { 
    
    const { name, cols, title } = props
    
    return <Form.List name={name} initialValue={[{ }]}>
        {(fields, { add, remove }) => { 
            return <Card size='small'title={title}>
                {fields.map(field => <div className='query-item' key={field.name}>
                    <Form.Item name={[field.name, 'col']} rules={[{ required: true, message: '请选择列名' }]}>
                        <Select options={cols.map(item => ({ label: item.name, value: item.name }))} placeholder='请选择列名'/>
                    </Form.Item>
                    <FormDependencies dependencies={[[name, field.name, 'col']]}>
                        {value => { 
                            const col_name = value?.[name]?.[field.name]?.col
                            const data_type = cols.find(col => col.name === col_name)?.data_type
                            if (VALUE_TYPES.includes(data_type))
                                return <>
                                    <Form.Item name={[field.name, 'opt']} rules={[{ required: true, message: '请选择运算符' }]}>
                                        <Select options={VALUE_OPERATIONS} placeholder='请选择运算符' />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <InputNumber placeholder='请输入对比值'/>
                                    </Form.Item>
                                </>
                            else if (Object.keys(TIME_COMPONENT).includes(data_type))  
                                return <>
                                    <Form.Item
                                        name={[field.name, 'opt']}
                                        rules={[{ required: true, message: '请选择运算符' }]}
                                    >
                                        <Select options={VALUE_OPERATIONS} placeholder='请选择运算符' />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请选择对比值' }]}>
                                        {TIME_COMPONENT[data_type]}
                                    </Form.Item>
                                </>
                            else
                                return <>
                                    <Form.Item
                                        name={[field.name, 'opt']}
                                        rules={[{ required: true, message: '请选择运算符' }]}
                                    >
                                        <Select options={STRING_OPERATIONS} placeholder='请选择运算符' />
                                    </Form.Item>
                                    <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <Input placeholder='请输入对比值'/>
                                    </Form.Item>
                                </>
                        } }
                    </FormDependencies>
                    
                    <Typography.Link onClick={() => { remove(field.name) }} type='danger'>
                        {t('删除')}
                    </Typography.Link>
                </div>)}
                <div className='add-btn-wrapper'>
                    <Typography.Link onClick={() => { add() }}>
                        <PlusOutlined />添加条件
                    </Typography.Link>
                </div>
            </Card>
        } }
    </Form.List>
}

export function QueryForm (props: IProps) { 
    const { database, table } = props
    const [cols, set_cols] = useState<IColumn[]>([ ])
    const [partition_cols, set_partition_cols] = useState<string[]>([ ])
    
    const [form] = Form.useForm()
    
    const { isLoading } = useSWR(`get_table_schema_${database}_${table}`, async () => { 
        await shell.define_load_table_schema()
        const { value } = await model.ddb.call(
            // 这个函数在 define_load_schema 中已定义
            'load_table_schema',
            // 调用该函数时，数据库路径不能以 / 结尾
            [database, table],
            model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
        )
        const col_idx = value[0].value.findIndex(item => item === 'colDefs')
        const partition_idx =  value[0].value.findIndex(item => item === 'partitionColumnName')
        if (isNumber(col_idx)) { 
            const cols = value[1]?.value?.[col_idx]?.value[0].value
            const data_types = value[1]?.value?.[col_idx]?.value[1].value
            set_cols(cols.map((item, index) => ({ name: item, data_type: data_types[index] })))
        }
        if (isNumber(partition_idx)) {
            const partition_col = value[1]?.value?.[partition_idx]?.value
            if (Array.isArray(partition_col))
                set_partition_cols(partition_col)
            else
                set_partition_cols([partition_col])
        }
    })
    
    
    window.form = form
    
    return <Spin spinning={isLoading}>
        <Form form={form}>
            <h4>{t('查询列')}</h4>
            <Form.Item name='queryCols'>
                <ColSelectTransfer cols={cols}/>
            </Form.Item>
            {
                partition_cols?.length && <QueryCard
                    cols={cols.filter(item => partition_cols.includes(item.name)) ?? [ ]}
                    title='分区列查询条件'
                    name='partitionColQuery'
                />
            }
        </Form>
    </Spin>
}
