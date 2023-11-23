import './index.scss'

import { CloudUploadOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Radio, Select, Typography, message } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { useCallback, useState } from 'react'
import { UploadFileField } from './UploadFileField.js'
import { request } from '../utils.js'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { type BasicInfoFormValues } from '../iot-guide/type.js'

const DATA_TYPE_LIST = ['BOOL', 'CHAR', 'SHORT', 'INT', 'FLOAT', 'DOUBLE', 'LONG',
'TIME', 'MINUTE', 'SECOND', 'DATE', 'DATEHOUR', 'DATETIME', 'TIMESTAMP',
'NANOTIMESTAMP', 'SYMBOL', 'STRING', 'BLOB', 'DECIMAL32(S)', 'DECIMAL64(S)', 'DECIMAL128(S)']

interface ISchemaUploadModal { 
    on_apply: (values) => void
}

export const SchemaUploadModal = NiceModal.create((props: ISchemaUploadModal) => {
    
    const { on_apply } = props
    const [form] = Form.useForm()
    
    const modal = useModal()
    const [loading, set_loading] = useState(false)
    
    const on_submit = useCallback(async () => { 
        set_loading(true)
        try {
            await form.validateFields()
            const { delimiter, file_path, file, upload_type } = form.getFieldsValue()
            let params = { 
                type: upload_type,
                content: { }
            }
            if (upload_type === 0) {
                // 本地上传
                const content = (await file.file.text())?.split('\n')?.slice(0, 100)?.join('\n')
                params.content = {
                    fileName: file.file.name,
                    fileContent: content,
                    delimiter,
                }
            } else  
                // 服务器上传
                params.content = {
                    filePath: file_path,
                    delimiter
                }
            const schema = await request<BasicInfoFormValues['schema']>('DBMSIOT_getSchema', params)
            on_apply(schema)
            modal.resolve()
            modal.hide()
        } catch (e) {
            console.error(e)
            message.error(JSON.stringify(e))
        }
        set_loading(false)
    }, [ on_apply ])
    
    return <Modal
        width={640}
        onCancel={modal.hide}
        open={modal.visible}
        title='导入文件'
        onOk={on_submit}
        okButtonProps={{ loading }}
        destroyOnClose
        afterClose={modal.remove}
    >
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
    
})

export function SchemaList () { 
    
    const form = Form.useFormInstance()
    
    const on_apply = useCallback(schema => {
        if (schema)
            form.setFieldValue('schema', schema)
    }, [ ])
    
    const on_upload = useCallback(() => { 
        NiceModal.show(SchemaUploadModal, { on_apply })
    }, [on_apply])
    
    return <div className='schema-wrapper'>
        <h4>列配置</h4>
        <Form.List name='schema' initialValue={[{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field => <div className='schema-item' key={field.name}>
                    <Form.Item label='列名' name={[field.name, 'colName']} rules={[{ required: true, message: '请输入列名' }]}>
                        <Input placeholder='请输入列名'/>
                    </Form.Item>
                    <Form.Item label='数据类型' name={[field.name, 'dataType']} rules={[{ required: true, message: '请选择数据类型' }]}>
                        <Select options={DATA_TYPE_LIST.map(item => ({ label: item, value: item }))} placeholder='请选择数据类型'/>
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }}/> }
                </div>)}
                <Button onClick={() => { add() }} type='dashed' block icon={<PlusCircleOutlined />}>增加列配置</Button>
            
            </>}
        </Form.List>
    
        <div className='upload-schema-wrapper'>
            <Typography.Link onClick={on_upload}>
                <CloudUploadOutlined className='upload-schema-icon'/>
                导入文件
            </Typography.Link>
        </div>
        
    </div>
}
