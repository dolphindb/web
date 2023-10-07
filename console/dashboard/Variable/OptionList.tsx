import React, { useContext, useEffect, useRef, useState } from 'react'
import { Form, Input, Popconfirm, Table, type  InputRef } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { genid } from 'xshell/utils.browser.js'

import { type Variable, type VariablePropertyType, type OptionType } from './variable'

type EditableTableProps = Parameters<typeof Table>[0]

type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>

type PropsType = {
    current_variable: Variable
    change_current_variable_property: (key: string, value: VariablePropertyType, save_confirm?: boolean) => void
    change_no_save_flag: (value: boolean) => void
}

const EditableContext = React.createContext<FormInstance<any> | null>(null)

export function OptionList ({ 
    current_variable, 
    change_current_variable_property,
    change_no_save_flag
}: PropsType)  
{
    let first = useRef(true)
    
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
    
    const [current_options, set_current_options] = useState<OptionType[]>(current_variable.options)
    
    const [count, setCount] = useState(current_variable.options.length)
    
    useEffect(() => {
        first.current = true
        set_current_options(current_variable.options)
    }, [current_variable.id])
    
    useEffect(() => {
        change_current_variable_property('options', current_options)
        if (first.current) {
            change_no_save_flag(false)
            first.current = false
        }
    }, [current_options])
    
    function handleDelete (key: string) {
        const newData = current_options.filter(item => item.key !== key)
        set_current_options(newData)
    } 
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean, dataIndex: string })[] = [
        {
            title: '标签',
            dataIndex: 'label',
            editable: true,
        },
        {
            title: '值',
            dataIndex: 'value',
            editable: true,
        },
        {
            title: '操作',
            dataIndex: 'operation',
            render: (_, record: { key: React.Key }) => 
                current_options.length >= 1 ? (
                <Popconfirm title='你确定要删除改选项吗？' onConfirm={() => { handleDelete(record.key as string) }}>
                    <a>Delete</a>
                </Popconfirm>
                ) : null    
        },
    ]
    
    function handleAdd () {
        const id = String(genid())
        const newData: OptionType = {
            label: `label ${id.slice(0, 4)}`,
            value: `value ${id.slice(0, 4)}`,
            key: id
        }
        set_current_options([...current_options, newData])
        setCount(count + 1)
    } 
    
    function handleSave (row: OptionType) {
        const newData = [...current_options]
        const index = newData.findIndex(item => row.key === item.key)
        const item = newData[index]
        newData.splice(index, 1, {
            ...item,
            ...row,
        })
        set_current_options(newData)
    }
    
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
        onCell: (record: OptionType) => ({
            record,
            editable: col.editable,
            dataIndex: col.dataIndex,
            title: col.title,
            handleSave,
        }),
        }
    })
    
    return <div className='variable-editor-main-options'>
                <div className='variable-editor-main-options-top'>
                    <div className='variable-editor-main-options-top-lable'>
                        可选项：
                    </div>
                    <div className='variable-editor-main-options-top-add' onClick={handleAdd}>
                        + 新增
                    </div>
                </div>
                <Table
                    components={components}
                    rowClassName={() => 'editable-row'}
                    bordered
                    size='small'
                    dataSource={current_options}
                    pagination={{ pageSize: 6, position: ['bottomCenter'] }}
                    columns={columns as ColumnTypes}
                />
            </div>
}
