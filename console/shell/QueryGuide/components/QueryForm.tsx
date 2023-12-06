import { Button, Card, Form, type FormInstance, Input, InputNumber, Select, Spin, Tag, Tooltip, Typography } from 'antd'
import useSWR from 'swr'
import { shell } from '../../model.js'
import { NodeType, model } from '../../../model.js'
import {  DdbFunctionType } from 'dolphindb'
import { isNumber } from 'lodash'
import { useState } from 'react'
import { ColSelectTransfer } from './ColSelectTransfer.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { StringDatePicker } from '../../../components/StringDatePicker/index.js'
import { StringTimePicker } from '../../../components/StringTimePicker.js'
import { STRING_OPERATIONS, VALUE_OPERATIONS, VALUE_TYPES } from '../constant.js'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { t } from '../../../../i18n/index.js'
import { type IQueryInfos } from '../type.js'
import { concat_name_path, safe_json_parse } from '../../../dashboard/utils.js'

interface IProps { 
    form: FormInstance
    database: string
    table: string
    initial_values: IQueryInfos
}

interface IColumn { 
    name: string
    data_type: string
}

export const TIME_COMPONENT = {
    DATE: <StringDatePicker allowClear/>,
    MONTH: <StringDatePicker submitFormat='YYYY.MM' suffix='M' allowClear/>,
    TIME: <StringTimePicker format='HH:mm:ss' allowClear/>,
    MINUTE: <StringTimePicker format='HH:mm' suffix='m' allowClear/>,
    SECOND: <StringTimePicker format='HH:mm:ss' allowClear/>,
    DATETIME: <StringDatePicker format='YYYY.MM.DD HH:mm:ss' allowClear/>,
    TIMESTAMP: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' showTime />,
    NANOTIME: <StringTimePicker format='HH:mm:ss' allowClear/>,
    NANOTIMESTAMP: <StringDatePicker format='YYYY.MM.DD HH:mm:ss' allowClear/>,
} 

export function QueryCard (props: { title?: React.ReactNode, name: string | number, name_path?: string, cols: IColumn[], className?: string }) { 
    
    const { name, name_path, cols, className, title } = props
    
    
    return <Form.List name={name} initialValue={[{ }]}>
        {(fields, { add, remove }) => { 
            return <Card className={className} size='small' title={title}>
                {fields.map(field => <div key={field.name}>
                    {
                        field.name !== 0 && <Typography.Text className='condition-tip' type='secondary'>{t('且满足')}</Typography.Text>}
                        <div className='query-item' key={field.name}>
                            <Form.Item name={[field.name, 'col']} rules={[{ required: true, message: '请选择列名' }]}>
                                <Select
                                options={cols
                                    .filter(item => !item.name.includes('[]'))
                                    .map(item => ({
                                        label: <div className='col-select-label'>
                                            {item.name}
                                            <Tag color='processing' bordered={false}>
                                                {item.data_type}
                                            </Tag>
                                        </div>,
                                        value: JSON.stringify(item)
                                    }))}
                                    placeholder='请选择列名' />
                            </Form.Item>
                        
                            <Form.Item hidden name={[field.name, 'dataType']}>
                                <Select disabled/>
                            </Form.Item>
                            
                        <FormDependencies dependencies={[concat_name_path(name_path, name, field.name, 'col')]}>
                            {value => { 
                                const val = name_path ? value?.[name_path]?.[name]?.[field.name]?.col : value?.[name]?.[field.name]?.col ?? '{}'
                                const { data_type } = safe_json_parse(val ?? '{}')
                                
                                let value_component
                                let opt_options = [ ]
                                if (VALUE_TYPES.includes(data_type)) {
                                    opt_options = VALUE_OPERATIONS
                                    value_component = <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <InputNumber placeholder='请输入对比值' />
                                    </Form.Item>
                                }
                                   
                            
                                else if (Object.keys(TIME_COMPONENT).includes(data_type)) {
                                    opt_options = VALUE_OPERATIONS
                                    value_component = <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请选择对比值' }]}>
                                        {TIME_COMPONENT[data_type]}
                                    </Form.Item>
                                }
                                else { 
                                    opt_options = STRING_OPERATIONS
                                    value_component = <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <Input placeholder='请输入对比值'/>
                                    </Form.Item>
                                }
                                    
                                if (['SYMBOL', 'STRING'].includes(data_type)) 
                                    opt_options = opt_options.concat(
                                        [{
                                            label: '包含(in)',
                                            value: 9
                                        },
                                        {
                                            label: '不包含(not in)',
                                            value: 10
                                        }]
                                    )
                                    
                                return <Form.Item
                                    name={[field.name, 'opt']}
                                    rules={[{ required: true, message: '请选择运算符' }]}
                                >
                                    <Select options={opt_options} placeholder='请选择运算符' />
                                </Form.Item>
                            } }
                        </FormDependencies>
                        
                        <FormDependencies dependencies={[concat_name_path(name_path, name, field.name, 'col'), concat_name_path(name_path, name, field.name, 'opt')]}>
                            {value => { 
                                const item = name_path ? value?.[name_path]?.[name]?.[field.name] : value?.[name]?.[field.name]
                                const { col, opt } = item
                                const { data_type } = safe_json_parse(col ?? '{}')
                                
                                
                                // 包含运算符
                                if ([9, 10].includes(opt))
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <Select mode='tags' placeholder='输入值后按回车键，可输入多个值'/>
                                    </Form.Item>
                                
                                if (VALUE_TYPES.includes(data_type)) 
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <InputNumber placeholder='请输入对比值' />
                                    </Form.Item>
                                else if (Object.keys(TIME_COMPONENT).includes(data_type)) 
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请选择对比值' }]}>
                                        {TIME_COMPONENT[data_type]}
                                    </Form.Item>
                                
                                else  
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <Input placeholder='请输入对比值'/>
                                    </Form.Item>
                            } }
                        </FormDependencies>
                            
                        <PlusCircleOutlined className='add-icon' onClick={() => { add() } } />
                        
                        {fields.length > 1 && <MinusCircleOutlined onClick={() => { remove(field.name) }} />}
                    </div>
                </div>)}
            </Card>
        } }
    </Form.List>
}

export function QueryForm (props: IProps) { 
    const { database, table, form, initial_values } = props
    const [cols, set_cols] = useState<IColumn[]>([ ])
    const [partition_cols, set_partition_cols] = useState<string[]>([ ])
    
    
    const { isLoading } = useSWR(`get_table_schema_${database}_${table}`,
        async () => { 
            await shell.define_load_table_schema()
            const { value } = await model.ddb.call(
                // 这个函数在 define_load_schema 中已定义
                'load_table_schema',
                // 调用该函数时，数据库路径不能以 / 结尾
                [database, table],
                model.node_type === NodeType.controller ? { node: model.datanode.name, func_type: DdbFunctionType.UserDefinedFunc } : { }
            )
            return value
        },
        {
            onSuccess: value => { 
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
                    }
                }
    )
    
    return <Spin spinning={isLoading}>
        <Form form={form} initialValues={initial_values}>
            <h4>{t('查询列')}</h4>
            <Form.Item name='queryCols' rules={[{ required: true, message: '请选择查询列' }] }>
                <ColSelectTransfer cols={cols}/>
            </Form.Item>
            
            {
                !!partition_cols?.length && <>
                    <h4>{t('分区列查询条件')}</h4>
                    <QueryCard
                        cols={cols.filter(item => partition_cols.includes(item.name)) ?? [ ]}
                        className='partition-query-block'
                        name='partitionColQuerys'
                        name_path={null}
                    />
                </>
            }
            <h4>{t('查询条件')}</h4>
            <Form.List name='querys' initialValue={[[{ }]]}>
                {(fields, { add, remove }) => { 
                    return <div className='querys-wrapper'>
                        {
                            fields.map(field => <div key={field.name}>
                            {
                                field.name !== 0 && 
                                <Typography.Text className='condition-tip' type='secondary'>{t('或满足')}</Typography.Text>}
                                    <QueryCard
                                        className='query-block'
                                        key={field.name}
                                        cols={cols.filter(item => !partition_cols.includes(item.name)) ?? [ ]}
                                        title={
                                            <div className='query-block-title'>
                                                <span>{`查询条件 ${field.name + 1}`}</span>
                                                <Typography.Link onClick={() => { remove(field.name) }} type='danger'>{t('删除')}</Typography.Link>
                                            </div>
                                        }
                                        name={field.name}
                                        name_path='querys'
                                    />
                                </div>)
                        }
                        <Button
                            onClick={() => { add() }}
                            type='dashed'
                            block
                            icon={<PlusCircleOutlined />}
                            className='add-query-block-btn'
                        >
                            {t('增加查询条件块')}
                        </Button>
                    </div>
                }}
            </Form.List>
        </Form>
    </Spin>
}
