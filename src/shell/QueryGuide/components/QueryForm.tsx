import { Button, Card, Form, type FormInstance, Input, InputNumber, Select, Spin, Tag, Tooltip, Typography, Row, Col, Space } from 'antd'
import useSWR from 'swr'

import { get, isNumber } from 'lodash'
import { useEffect, useId, useState } from 'react'

import { DeleteOutlined, MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'

import { FormDependencies } from '../../../components/FormDependcies/index.js'
import { StringDatePicker } from '../../../components/StringDatePicker/index.js'
import { StringTimePicker } from '../../../components/StringTimePicker.js'
import { IN, IS_NULL, LIKE, NOT_IN, NOT_LIKE, NOT_NULL, OTHER_OPERATIONS, STRING_OPERATIONS, STRING_TYPES, TIME_TYPES, VALID_DATA_TYPES, VALUE_OPERATIONS, VALUE_TYPES } from '../constant.js'
import { NodeType, model } from '../../../model.js'
import { shell } from '../../model.js'
import { t } from '../../../../i18n/index.js'
import { ENUM_TYPES, type IColumn } from '../type.js'
import { concat_name_path, safe_json_parse } from '../../../dashboard/utils.ts'

import { guide_query_model } from '../model.js'

import { ColSelectTransfer } from './ColSelectTransfer.js'
import { EnumAutoComplete } from './EnumAutoComplete.js'
import { EnumSelect } from './EnumSelect.js'

interface IProps { 
    form: FormInstance
    database: string
    table: string
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
    DATE: <StringDatePicker submitFormat='YYYY.MM.DD' format='YYYY-MM-DD' allowClear/>,
    MONTH: <StringDatePicker submitFormat='YYYY.MM' format='YYYY-MM' submitSuffix='M' allowClear/>,
    DATETIME: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' format='YYYY-MM-DD HH:mm:ss' showTime allowClear/>,
    TIMESTAMP: <StringDatePicker submitFormat='YYYY.MM.DD HH:mm:ss' format='YYYY-MM-DD HH:mm:ss' showTime allowClear />,
    NANOTIMESTAMP: <StringDatePicker showTime submitFormat='YYYY.MM.DD HH:mm:ss' format='YYYY-MM-DD HH:mm:ss' allowClear />,
    DATEHOUR: <StringDatePicker submitFormat='YYYY.MM.DD HH' format='YYYY-MM-DD HH' showTime />,
    
    TIME: <StringTimePicker format='HH:mm:ss' allowClear />,
    MINUTE: <StringTimePicker format='HH:mm' submitSuffix='m' allowClear/>,
    SECOND: <StringTimePicker format='HH:mm:ss' allowClear/>,
    
    NANOTIME: <StringTimePicker format='HH:mm:ss' allowClear/>,
    
} 

export function QueryCard (props: IQueryCard) { 
    const { name, name_path, cols, className, title, table, database } = props
    const form = Form.useFormInstance()
    
    return <Form.List name={name} initialValue={[{ }]}>
        {(fields, { add, remove }) => { 
            return <Card className={className} size='small' title={title}>
                {fields.map(field => <div key={field.name}>
                    {
                        field.name !== 0 && <Typography.Text className='condition-tip' type='secondary'>{t('且满足')}</Typography.Text>}
                        <Row className='query-item' key={field.name} gutter={8}>
                            <Col span={7}>
                                <Form.Item name={[field.name, 'col']} rules={[{ required: true, message: t('请选择列名') }]}>
                                    <Select
                                    showSearch
                                    options={cols
                                        .map(item => ({
                                            label: <div className='col-select-label'>
                                                <span className='table-name'>{item.name}</span>
                                                <Tag color='processing' bordered={false}>
                                                    {item.data_type}
                                                </Tag>
                                            </div>,
                                            value: JSON.stringify(item),
                                            disabled: (!VALID_DATA_TYPES.includes(item.data_type) && !item.data_type.includes('DECIMAL')) || item.data_type.includes('[]')
                                        }))}
                                        placeholder={t('请选择列名') }
                                    />
                                </Form.Item>
                            </Col>
                        
                            {/* 运算符选择 */}
                            <Col span={7}>
                                <FormDependencies dependencies={[concat_name_path(name_path, name, field.name, 'col')]}>
                                    {value => {
                                        const val = get(value, concat_name_path(name_path, name, field.name, 'col')) ?? '{}' 
                                        const { data_type } = safe_json_parse(val ?? '{}')
                                        
                                        let opt_options = [ ]
                                        // 数值类型时间类型运算符
                                        if ([...VALUE_TYPES, ...TIME_TYPES].includes(data_type) || data_type?.includes('DECIMAL'))
                                            opt_options = VALUE_OPERATIONS
                                        // string symbol类型运算符
                                        else if (STRING_TYPES.includes(data_type))
                                            opt_options = STRING_OPERATIONS
                                        // 其他运算符
                                        else
                                            opt_options = OTHER_OPERATIONS
                                        
                                        opt_options = opt_options.map(item => {
                                            if ([LIKE, NOT_LIKE].includes(item.value))
                                                return {
                                                    value: item.value,
                                                    label: <>
                                                        {item.label}
                                                        <Tooltip
                                                            overlayClassName='operator-help-tooltip'
                                                            placement='right'
                                                            title={<>
                                                                {t('输入对比值时须带有通配符 “%”。“%” 表示任意 0 个或者多个字符，可匹配任意类型和长度的字符。使用时请注意区分大小写。以下为使用示例：')}
                                                                <ul>
                                                                    <li>{t('688%（匹配以 “688” 开头的字符串，能够匹配例如 “688101.SH”、”688101”的字符串）')}</li>
                                                                    <li>{t('%SZ%（匹配包含 “SZ” 的字符串， 能够匹配例如 “300951.SZ”、 “SZ.300951”的字符串）')}</li>
                                                                    <li>{t('%6（匹配以 “6” 结尾的字符串，能够匹配例如 “abcd6” 的字符串）')}</li>
                                                                </ul>
                                                            </>}
                                                        >
                                                            <QuestionCircleOutlined className='operator-help-icon' />
                                                        </Tooltip>
                                                    </>
                                                }
                                            else if ([IN, NOT_IN].includes(item.value))
                                                return {
                                                    ...item,
                                                    label: <>
                                                    {item.label}
                                                    <Tooltip
                                                        overlayClassName='operator-help-tooltip'
                                                        placement='right'
                                                        title={<>
                                                            <ul>
                                                                <li>{t('在对比值的下拉框中选择一个或多个枚举值。注意，下拉框中仅展示部分枚举值，且存在响应延时。')}</li>
                                                                <li>{t('请手动输入未显示的枚举值，单击回车键以完成操作。')}</li>
                                                            </ul>
                                                        </>}
                                                    >
                                                        <QuestionCircleOutlined className='operator-help-icon' />
                                                    </Tooltip>
                                                </>
                                                }
                                            else
                                                return item
                                        })
                                
                                        return <Form.Item
                                            name={[field.name, 'opt']}
                                            rules={[{ required: true, message: t('请选择运算符') }]}
                                            shouldUpdate={(prev, cur) => { 
                                                
                                                // 列名更改的时候重置运算符 
                                                const prev_col = get(prev, concat_name_path(name_path, name, field.name, 'col')) ?? '{}' 
                                                const cur_col = get(cur, concat_name_path(name_path, name, field.name, 'col')) ?? '{}' 
                                                const get_data_type = col => JSON.parse(col)?.data_type
                                                const prev_data_type = get_data_type(prev_col)
                                                const cur_data_type = get_data_type(cur_col)
                                                if (prev_data_type && cur_data_type && prev_data_type !== cur_data_type) { 
                                                    form.setFieldValue(concat_name_path(name_path, name, field.name, 'opt'), undefined)
                                                    return true
                                                } 
                                                else
                                                    return false
                                            }}
                                        >
                                            <Select options={opt_options} placeholder={t('请选择运算符')} />
                                        </Form.Item>
                                    } }
                                </FormDependencies>
                            </Col>
                        
                            <Col span={7}>
                                <FormDependencies dependencies={[concat_name_path(name_path, name, field.name, 'col'), concat_name_path(name_path, name, field.name, 'opt')]}>
                                    {value => { 
                                        const item = name_path ? value?.[name_path]?.[name]?.[field.name] : value?.[name]?.[field.name]
                                        const { col, opt } = item
                                        const { data_type } = safe_json_parse(col ?? '{}')
                                        
                                        
                                        let component = null
                                        
                                        if ([IS_NULL, NOT_NULL].includes(opt)) 
                                            return null
                                        
                                        
                                        // 数值类型
                                        if ((VALUE_TYPES.includes(data_type) && !ENUM_TYPES.includes(data_type)) || data_type?.includes('DECIMAL'))
                                            component = <InputNumber placeholder={t('请输入对比值')} />
                                        // 时间类型
                                        else if (TIME_TYPES.includes(data_type))
                                            component = TIME_COMPONENT[data_type]
                                        else
                                            // 其余情况跟运算符相关
                                            // 包含跟不包含运算符，为选择器
                                            if (opt && [IN, NOT_IN].includes(opt))
                                                component = <EnumSelect table={table} database={database} col={col} />
                                            else if (opt && [LIKE, NOT_LIKE].includes(opt))
                                                component = <Input placeholder={t('请输入对比值')} />
                                            // 枚举类型，且不为 like not like
                                            else
                                                component = <EnumAutoComplete table={table} database={database} col={col} options={data_type === 'BOOL' ? [{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }] : [ ] } />
                                        return <Form.Item 
                                            shouldUpdate={
                                                (prev, cur) => { 
                                                    // 列名更改的时候重置值
                                                    const prev_col = get(prev, concat_name_path(name_path, name, field.name, 'col')) ?? '{}' 
                                                    const cur_col = get(cur, concat_name_path(name_path, name, field.name, 'col')) ?? '{}' 
                                                    const get_data_type = col => JSON.parse(col)?.data_type
                                                    const prev_data_type = get_data_type(prev_col)
                                                    const cur_data_type = get_data_type(cur_col)
                                                    if (cur_data_type && prev_data_type && prev_data_type !== cur_data_type) { 
                                                        form.setFieldValue(concat_name_path(name_path, name, field.name, 'value'), undefined)
                                                        return true
                                                    } else
                                                        return false
                                                }
                                            }
                                            name={[field.name, 'value']}
                                            rules={[{ required: true, message: t('请输入对比值') }]}
                                        >
                                            { component }
                                        </Form.Item>
                                            
                                            
                                    } }
                                </FormDependencies>
                            </Col>
                            
                            <Col span={3}>
                                <Space>
                                    <Tooltip title={t('增加且条件项')}>
                                        <PlusCircleOutlined className='add-icon' onClick={() => { add() } } />
                                    </Tooltip>
                            
                                    {fields.length > 1 && <Tooltip title={t('删除该条件项')}>
                                        <MinusCircleOutlined className='delete-icon' onClick={() => { remove(field.name) }} />
                                    </Tooltip>}
                                    
                                </Space>
                            </Col>
                        </Row>
                </div>)}
            </Card>
        } }
    </Form.List>
}

export function QueryForm (props: IProps) { 
    const { database, table, form } = props
    const [cols, set_cols] = useState<IColumn[]>([ ])
    const [partition_cols, set_partition_cols] = useState<string[]>([ ])
    const page_id = useId()
    
    const { query_values } = guide_query_model.use(['query_values'])
    
    const { isLoading } = useSWR(['get_table_schema', table, database, page_id],
        async () => { 
            await shell.define_load_table_schema()
            const { value } = await model.ddb.call(
                'load_table_schema',
                [database, table],
                model.node_type === NodeType.controller ? { node: model.datanode.name } : undefined
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
    
    useEffect(() => { 
        form.setFieldsValue(query_values)
    }, [ ])
    
    return <Spin spinning={isLoading}>
        <Form autoComplete='off' form={form} onValuesChange={(_, values) => { guide_query_model.set({ query_values: values }) }}>
            <h3 className='query-col-title'>{t('筛选查询列')}</h3>
            <Form.Item name='queryCols' rules={[{ required: true, message: t('查询列不可为空，请重新筛选！') }] }>
                <ColSelectTransfer cols={cols}/>
            </Form.Item>
            <h3>
                {t('添加查询条件')}
            </h3>
            <div className='query-conditions-wrapper'>
                
                {
                    !!partition_cols?.length && <>
                        <h4>
                            {t('分区列查询条件')}
                            <Tooltip title={t('必填项，仅支持【且满足】，与”其他查询条件”亦为【且满足】关系。')}>
                                <QuestionCircleOutlined className='help-icon' />
                            </Tooltip>
                        </h4>
                        <QueryCard
                            table={table}
                            database={database}
                            cols={cols.filter(item => partition_cols.includes(item.name)) ?? [ ]}
                            name='partitionColQuerys'
                            name_path={null}
                        />
                    </>
                }
                {!!partition_cols?.length && <h4>{t('其他查询条件')}</h4>}
                <Form.List name='querys' initialValue={[ ]}>
                    {(fields, { add, remove }) => { 
                        return <div className='querys-wrapper'>
                            {
                                fields.map(field =>
                                    <div key={field.name}>
                                        {
                                            field.name !== 0 && <Typography.Text className='condition-tip' type='secondary'>{t('或满足')}</Typography.Text>
                                        }
                                        <div className='query-block'>
                                            <QueryCard
                                                table={table}
                                                database={database}
                                                className='query-content'
                                                key={field.name}
                                                cols={cols.filter(item => !partition_cols.includes(item.name)) ?? [ ]}
                                                name={field.name}
                                                name_path='querys'
                                            />
                                            <Tooltip title={t('删除该条件块')}>
                                                <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} />
                                            </Tooltip>
                                        </div>
                                </div>
                                )
                            }
                            <Button
                                onClick={() => { add([{ }]) }}
                                type='dashed'
                                block
                                icon={<PlusCircleOutlined />}
                                className='add-query-block-btn'
                            >
                                {t('新增条件块')}
                            </Button>
                        </div>
                    }}
                </Form.List>
                
            </div>
        </Form>
    </Spin>
}
