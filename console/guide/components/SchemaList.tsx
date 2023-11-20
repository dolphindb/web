import './index.scss'

import { CloudUploadOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Radio, Select, Typography, message } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { useCallback } from 'react'
import { useBoolean } from 'ahooks'
import { UploadFileField } from './UploadFileField.js'
import { model } from '../../model.js'

const DATA_TYP_LIST = ['BOOL', 'CHAR', 'SHORT', 'INT', 'FLOAT', 'DOUBLE', 'LONG',
'TIME', 'MINUTE', 'SECOND', 'DATE', 'DATEHOUR', 'DATETIME', 'TIMESTAMP',
'NANOTIMESTAMP', 'SYMBOL', 'STRING', 'BLOB', 'DECIMAL32(S)', 'DECIMAL64(S)', 'DECIMAL128(S)']

interface ISchemaUploadModal { 
    open: boolean
    on_apply: (values) => void
    on_cancel: () => void
}

export function SchemaUploadModal (props: ISchemaUploadModal) {
    
    const { open, on_apply, on_cancel } = props
    const [form] = Form.useForm()
    
    const on_submit = useCallback(async () => { 
        try {
            await form.validateFields()
            const { delimiter, file_path, file: { file }, upload_type } = form.getFieldsValue()
            if (upload_type === 0) {
                // 本地上传
                const { value } = await model.ddb.eval('getHomeDir()')
                console.log(file, 'file')
                const content = file.text()
                const path = value + '/' + file.name
                await model.ddb.eval(`saveTextFile(${content}, ${path})`)
                const { value: schema } = await model.ddb.call('getSchema', [JSON.stringify({ delimiter, filePath: path })])
                on_apply(schema)
            } else { 
                // 服务器上传
                const { value: schema } = await model.ddb.call('getSchema', [JSON.stringify({ delimiter, filePath: file_path })])
                on_apply(schema)
            }
        } catch (e) {
            message.error(e)
         }
    }, [ ])
    
    return <Modal onCancel={on_cancel} open={open} title='导入文件' onOk={on_submit}>
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} labelAlign='left'>
            <Form.Item label='导入方式' name='upload_type' initialValue={0}>
                <Radio.Group>
                    <Radio value={0}>本地导入</Radio>
                    <Radio value={1}>服务器导入</Radio>
               </Radio.Group>
            </Form.Item>
            <Form.Item label='自定义分隔符' name='delimiter'>
                <Input placeholder={'默认分隔符为\',\' ,可自定义分隔符'}/>
            </Form.Item>
            
            <FormDependencies dependencies={['upload_type']}>
                {({ upload_type }) => { 
                    // 本地导入
                    if (upload_type === 0)
                        return <UploadFileField accept='text/*' tip='仅支持上传带固定分隔符文本文件，如 csv文件、txt文件，默认分隔符为“,”' />
                    else
                        // 服务器导入
                        return <Form.Item name='file_path' label='文件地址' rules={[{ required: true, message: '请输入文件在服务器的地址' }]}>
                            <Input placeholder='请输入文件在服务器的地址'/>
                        </Form.Item>
                } }
                
            </FormDependencies>
        </Form>
    </Modal>
    
}

export function SchemaList () { 
    
    const [open, { setTrue, setFalse }] = useBoolean() 
    const form = Form.useFormInstance()
    
    const on_apply = useCallback(schema => {
        form.setFieldValue('schema', schema)
     }, [ ])
    
    return <div className='schema-wrapper'>
        <h4>列配置</h4>
        <Form.List name='schema' initialValue={[{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field => <div className='schema-item' key={field.name}>
                    <Form.Item label='列名' name={[field.name, 'colName']} rules={[{ required: true, message: '请输入列名' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='数据类型' name={[field.name, 'dataType']} rules={[{ required: true, message: '请选择数据类型' }]}>
                        <Select options={DATA_TYP_LIST.map(item => ({ label: item, value: item }))} />
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }}/> }
                </div>)}
                <Button onClick={() => { add() }} type='dashed' block icon={<PlusCircleOutlined />}>增加列配置</Button>
            
            </>}
        </Form.List>
    
        <div className='upload-schema-wrapper'>
            <Typography.Link onClick={setTrue}>
                <CloudUploadOutlined className='upload-schema-icon'/>
                导入文件
            </Typography.Link>
        </div>
        
        <SchemaUploadModal open={open} on_cancel={setFalse} on_apply={ on_apply } />
        
    </div>
}
