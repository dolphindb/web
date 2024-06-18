import React, { useContext, useEffect, useRef, useState } from 'react'
import { Form, Input, Popconfirm, Table, type  InputRef, Typography, Button, Popover } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { genid } from 'xshell/utils.browser.js'

import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'
import { VariableMode } from '../type.js'

import { dashboard } from '../model.js'

import { type Variable, type VariablePropertyType, type OptionType } from './variable'

type EditableTableProps = Parameters<typeof Table>[0]

type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>

const EditableContext = React.createContext<FormInstance<any> | null>(null)

export function OptionList ({ 
    current_variable, 
    variable_map,
    update_variable_map,
    change_current_variable_property,
}: {
    current_variable: Variable
    variable_map: Map<string, number>
    update_variable_map: (options?: OptionType[]) => void
    change_current_variable_property: (key: string[], value: VariablePropertyType[], save_confirm?: boolean) => void
})  
{   
    function is_disabled (record) {
        return (current_variable.mode === VariableMode.SELECT && current_variable.select_key === record.key)
            || (current_variable.mode === VariableMode.MULTI_SELECT && current_variable.select_key?.includes?.(record.key))
    }    
    
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean, dataIndex: string })[] = [
        {
            title: <div> 
                    {t('标签')}                  
                    <Popover 
                        content={(
                            <div>
                                {t('标签不可重复，重复会自动覆盖')}
                            </div>
                        )} 
                    >
                        <ExclamationCircleOutlined className='title-icon'/>
                    </Popover>
            </div>,
            dataIndex: 'label',
            editable: true,
            width: 300,
        },
        {
            title: t('值'),
            dataIndex: 'value',
            editable: true,
            width: 300
        },
        {
            title: t('操作'),
            width: 50,
            dataIndex: 'operation',
            render: (_, record) => { 
                return current_variable.options.length >= 1 ? (
                        <Popconfirm title={t('确定要删除该选项吗？')} onConfirm={() => { handleDelete(record as OptionType) }}>
                            <Typography.Link
                                disabled={is_disabled(record)}
                                type='danger'
                            >
                                {t('删除')}
                            </Typography.Link>
                        </Popconfirm>
                ) : null 
            }
                   
        },
    ]
    
    const components = {
        body: {
            row: EditableRow,
            cell: EditableCell,
        },
    }
    
    const columns = defaultColumns.map(col => {
        if (!col.editable)
            return col
        
        return {
        ...col,
            onCell: (record: OptionType) => {     
                return {
                    record,
                    editable: col.editable && !is_disabled(record),
                    dataIndex: col.dataIndex,
                    title: col.title,
                    handleSave,
                }
            },
        }
    })
    
    function handleDelete (record: OptionType) {
        const new_options = current_variable.options.filter(item => item.key !== record.key)
        change_current_variable_property(['options'], [new_options])
        update_variable_map(new_options)
    } 
    
    function handleAdd () {
        const id = String(genid())
        const suffix = id.slice(0, 4)
        
        const label = `label ${suffix}`
        
        if (variable_map.has(label)) 
            dashboard.message.error(t('标签已存在，选项添加失败，请重试，必要时请修改现有标签'))
        else {
            change_current_variable_property(['options'], [[...current_variable.options, {
                label,
                value: `value ${suffix}`,
                key: id
            }]])
            variable_map.set(label, variable_map.size - 1)
        }
    } 
    
    function handleSave (row: OptionType) {
        const new_options = [...current_variable.options]
        const { label, value, key } = row
        const index = new_options.findIndex(item => key === item.key)
        const map_index = variable_map.get(label)
        
        if (variable_map.has(label) && map_index !== index) {
            new_options[map_index].value = value
            new_options.splice(index, 1)
        }
        else
            new_options.splice(index, 1, { ...row })
        change_current_variable_property(['options'], [new_options])
        update_variable_map(new_options)
    }
    
    function EditableRow ({ index, ...props }) {
        const [form] = Form.useForm()
        return <Form form={form} component={false}>
                <EditableContext.Provider value={form}>
                    <tr {...props} />
                </EditableContext.Provider>
            </Form>
    }
    
    function EditableCell ({
        title,
        editable,
        children,
        dataIndex,
        record,
        handleSave,
        ...restProps
    }) {
        const [editing, setEditing] = useState(false)
        const inputRef = useRef<InputRef>(null)
        const form = useContext(EditableContext)
        
        useEffect(() => {
            if (editing)
                inputRef.current!.focus()
            
        }, [editing])
        
        function toggleEdit () {
            setEditing(!editing)
            form.setFieldsValue({ [dataIndex]: record[dataIndex] })
        }
        
        async function save () {
            try {
                const values = await form.validateFields()
                
                toggleEdit()
                handleSave({ ...record, ...values })
            } catch (errInfo) {
                console.log('Save failed:', errInfo)
            }
        }
        
        let childNode = children
        
        if (editable)
            childNode = editing ? (
            <Form.Item
                style={{ margin: 0 }}
                name={dataIndex}
                rules={[
                    {
                        required: true,
                        message: t('不能为空'),
                    },
                ]}
            >
                <Input ref={inputRef} onPressEnter={save} onBlur={save} size='small'/>
            </Form.Item>
            ) : (
            <div className='editable-cell-value-wrap' style={{ paddingRight: 24 }} onClick={toggleEdit}>
                {children}
            </div>
            )
            
        return <td {...restProps}>{childNode}</td>
    }
    
    return <div className='main-select'>
                <div className='main-select-top'>
                    {t('可选项（共{{length}}项）：', { length: current_variable.options.length })}
                    <div>
                        <Popconfirm 
                            title={t('确定要清空所有选项吗？')} 
                            onConfirm={() => { 
                                change_current_variable_property(['options', 'value'], [[ ], ''])
                                variable_map.clear()
                            }}
                        >
                            <Button 
                                type='link' 
                                size='small' 
                                className='main-select-top-btn' 
                                danger
                                icon={<DeleteOutlined />}
                            >
                                {t('清空')}
                            </Button>
                        </Popconfirm>
                        <Button type='link' onClick={handleAdd} size='small' icon={<PlusOutlined />}>{t('新增')}</Button>
                    </div>
                </div>
                <Table
                    components={components}
                    rowClassName={() => 'editable-row'}
                    bordered
                    size='small'
                    dataSource={current_variable.options}
                    pagination={{ pageSize: 5, position: ['bottomCenter'], showSizeChanger: false }}
                    columns={columns as ColumnTypes}
                />
            </div>
}
