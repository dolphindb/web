import { Button, Card, Form, type FormInstance, Input, InputNumber, Select, Spin, Tag, Tooltip, Typography } from 'antd'
import useSWR from 'swr'
import { shell } from '../../model.js'
import { NodeType, model } from '../../../model.js'
import {  DdbFunctionType } from 'dolphindb'
import { isNumber } from 'lodash'
import { useEffect, useId, useState } from 'react'
import { ColSelectTransfer } from './ColSelectTransfer.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { StringDatePicker } from '../../../components/StringDatePicker/index.js'
import { StringTimePicker } from '../../../components/StringTimePicker.js'
import { IN, IN_OPERATIONS, LIKE, NOT_IN, NOT_LIKE, STRING_OPERATIONS, VALUE_OPERATIONS, VALUE_TYPES } from '../constant.js'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { t } from '../../../../i18n/index.js'
import { ENUM_TYPES, type IColumn, type IQueryInfos } from '../type.js'
import { concat_name_path, safe_json_parse } from '../../../dashboard/utils.js'

import { EnumSelect } from './EnumSelect.js'
import { EnumAutoComplete } from './EnumAutoComplete.js'

interface IProps { 
    form: FormInstance
    database: string
    table: string
    initial_values: IQueryInfos
}

interface IQueryCard {
    title?: React.ReactNode
    name: string | number
    name_path?: string
    cols: IColumn[]
    className?: string
    database: string
    table: string
}

export const TIME_COMPONENT = {
    DATE: <StringDatePicker allowClear/>,
    MONTH: <StringDatePicker submitFormat='YYYY.MM' submit_suffix='M' allowClear/>,
    TIME: <StringTimePicker format='HH:mm:ss' allowClear/>,
    MINUTE: <StringTimePicker format='HH:mm' submit_suffix='m' allowClear/>,
    SECOND: <StringTimePicker format='HH:mm:ss' allowClear/>,
    DATETIME: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' showTime allowClear/>,
    TIMESTAMP: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' showTime allowClear/>,
    NANOTIME: <StringTimePicker format='HH:mm:ss' allowClear/>,
    NANOTIMESTAMP: <StringDatePicker showTime submitFormat='YYYY.MM.DD HH:mm:ss' allowClear/>,
} 

export function QueryCard (props: IQueryCard) { 
    const { name, name_path, cols, className, title, table, database } = props
    
    return <Form.List name={name} initialValue={[{ }]}>
        {(fields, { add, remove }) => { 
            return <Card className={className} size='small' title={title}>
                {fields.map(field => <div key={field.name}>
                    {
                        field.name !== 0 && <Typography.Text className='condition-tip' type='secondary'>{t('且满足')}</Typography.Text>}
                        <div className='query-item' key={field.name}>
                            <Form.Item name={[field.name, 'col']} rules={[{ required: true, message: '请选择列名' }]}>
                                <Select
                                    showSearch
                                    options={cols
                                        .filter(item => !item.name.includes('[]'))
                                        .map(item => ({
                                            label: <div className='col-select-label'>
                                                <span className='table-name'>{item.name}</span>
                                                <Tag color='processing' bordered={false}>
                                                    {item.data_type}
                                                </Tag>
                                            </div>,
                                            value: JSON.stringify(item)
                                        }))}
                                    placeholder='请选择列名' />
                            </Form.Item>
                        
                        {/* 运算符选择 */}
                        <FormDependencies dependencies={[concat_name_path(name_path, name, field.name, 'col')]}>
                            {value => {
                                const val = name_path ? value?.[name_path]?.[name]?.[field.name]?.col : value?.[name]?.[field.name]?.col ?? '{}'
                                const { data_type } = safe_json_parse(val ?? '{}')
                                
                                let opt_options = [ ]
                                if (VALUE_TYPES.includes(data_type) || Object.keys(TIME_COMPONENT).includes(data_type)) 
                                    opt_options = VALUE_OPERATIONS
                                else  
                                    opt_options = STRING_OPERATIONS
                
                                if (['SYMBOL', 'STRING'].includes(data_type)) 
                                    opt_options = opt_options.concat(IN_OPERATIONS)
                                    
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
                                
                                // 枚举类型并且运算符不为匹配与包含需要获取枚举值
                                if (ENUM_TYPES.includes(data_type) && ![LIKE, NOT_LIKE, IN, NOT_IN].includes(opt))
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <EnumAutoComplete table={table} database={database} col={col} />
                                    </Form.Item>
                                
                                if (ENUM_TYPES.includes(data_type) && [IN, NOT_IN].includes(opt))
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <EnumSelect table={table} database={database} col={col}/>
                                    </Form.Item>
                
                                if (VALUE_TYPES.includes(data_type)) 
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                        <InputNumber placeholder='请输入对比值' />
                                    </Form.Item>
                                
                                if (Object.keys(TIME_COMPONENT).includes(data_type)) 
                                    return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请选择对比值' }]}>
                                        {TIME_COMPONENT[data_type]}
                                    </Form.Item>
                                
                                return <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: '请输入对比值' }]}>
                                    <Input placeholder='请输入对比值'/>
                                </Form.Item>
                            } }
                        </FormDependencies>
                            
                        <PlusCircleOutlined className='add-icon' onClick={() => { add() } } />
                        
                        {fields.length > 1 && <MinusCircleOutlined className='delete-icon' onClick={() => { remove(field.name) }} />}
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
    const page_id = useId()
    
    useEffect(() => { 
        if (initial_values)
            form.setFieldsValue(initial_values)
    }, [ initial_values ])
    
    const { isLoading } = useSWR(['get_table_schema', table, database, page_id],
        async () => { 
            await shell.define_load_table_schema()
            const { value } = await model.ddb.call(
                'load_table_schema',
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
                    else if (partition_col)
                        set_partition_cols([partition_col])
                }
            }
        }
    )
    
    return <Spin spinning={isLoading}>
        <Form form={form}>
            <h4>{t('查询列')}</h4>
            <Form.Item name='queryCols' rules={[{ required: true, message: '请选择查询列' }] }>
                <ColSelectTransfer cols={cols}/>
            </Form.Item>
            {
                !!partition_cols?.length && <>
                    <h4>{t('分区列查询条件')}</h4>
                    <QueryCard
                        table={table}
                        database={database}
                        cols={cols.filter(item => partition_cols.includes(item.name)) ?? [ ]}
                        className='partition-query-block'
                        name='partitionColQuerys'
                        name_path={null}
                    />
                </>
            }
            <h4>{t('查询条件')}</h4>
            <Form.List name='querys' initialValue={[ ]}>
                {(fields, { add, remove }) => { 
                    return <div className='querys-wrapper'>
                        {
                            fields.map(field => <div key={field.name}>
                            {
                                field.name !== 0 && 
                                <Typography.Text className='condition-tip' type='secondary'>{t('或满足')}</Typography.Text>}
                                <QueryCard
                                    table={table}
                                    database={database}
                                    className='query-block'
                                    key={field.name}
                                    cols={cols.filter(item => !partition_cols.includes(item.name)) ?? [ ]}
                                    title={
                                        <div className='query-block-title'>
                                            <span>{`查询条件 ${field.name + 1}`}</span>
                                            <Typography.Link
                                                className='delete-text'
                                                onClick={() => { remove(field.name) }}
                                                type='danger'
                                            >
                                                {t('删除')}
                                            </Typography.Link> 
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
