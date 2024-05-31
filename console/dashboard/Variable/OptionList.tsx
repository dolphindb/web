import React, { useContext, useEffect, useRef, useState } from 'react'
import { Form, Input, Popconfirm, Table, type  InputRef, Typography, Button } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { genid } from 'xshell/utils.browser.js'

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'
import { VariableMode } from '../type.js'

import { type Variable, type VariablePropertyType, type OptionType } from './variable'

type EditableTableProps = Parameters<typeof Table>[0]

type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>

const EditableContext = React.createContext<FormInstance<any> | null>(null)

export function OptionList ({ 
    current_variable, 
    change_current_variable_property,
}: {
    current_variable: Variable
    change_current_variable_property: (key: string, value: VariablePropertyType, save_confirm?: boolean) => void
})  
{   
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean, dataIndex: string })[] = [
        {
            title: t('标签'),
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
                let disabled = false
                if (current_variable.mode === VariableMode.SELECT && current_variable.value === record.value)
                    disabled = true
                else if (current_variable.mode === VariableMode.MULTI_SELECT && JSON.parse(current_variable.value)?.includes?.(record.value))
                    disabled = true
                return current_variable.options.length >= 1 ? (
                        <Popconfirm title={t('确定要删除该选项吗？')} onConfirm={() => { handleDelete(record.key as string) }}>
                            <Typography.Link
                                disabled={disabled}
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
                // 当前选中变量值无法编辑
                let disable_editable = false
                if (current_variable.mode === VariableMode.SELECT && current_variable.value === record.value)
                    disable_editable = true
                else if (current_variable.mode === VariableMode.MULTI_SELECT && JSON.parse(current_variable.value)?.includes?.(record.value))
                    disable_editable = true
                return {
                    record,
                    editable: col.editable && !disable_editable,
                    dataIndex: col.dataIndex,
                    title: col.title,
                    handleSave,
                }
            },
        }
    })
    
    function handleDelete (key: string) {
        change_current_variable_property('options', current_variable.options.filter(item => item.key !== key))
    } 
    
    function handleAdd () {
        const id = String(genid())
        
        change_current_variable_property('options', [...current_variable.options, {
            label: `label ${id.slice(0, 4)}`,
            value: `value ${id.slice(0, 4)}`,
            key: id
        }])
    } 
    
    function handleSave (row: OptionType) {
        const new_options = [...current_variable.options]
        const index = new_options.findIndex(item => row.key === item.key)
        const item = new_options[index]
        new_options.splice(index, 1, {
            ...item,
            ...row,
        })
        change_current_variable_property('options', new_options)
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
                        message: `${title} is required.`,
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
                        <Popconfirm title={t('确定要清空所有选项吗？')} onConfirm={() => { change_current_variable_property('options', [ ]) }}>
                            <Button 
                                type='primary' 
                                size='small' 
                                className='main-select-top-btn' 
                                danger
                                icon={<DeleteOutlined />}
                            >
                                {t('清空')}
                            </Button>
                        </Popconfirm>
                        <Button type='primary' onClick={handleAdd} size='small' icon={<PlusOutlined />}>{t('新增')}</Button>
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
