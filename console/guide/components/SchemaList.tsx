import './index.scss'

import { CloudUploadOutlined, DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input, InputNumber, Modal, Radio, Select, Space, Tooltip, Typography, message } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { UploadFileField } from './UploadFileField.js'
import { request } from '../utils.js'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { type BasicInfoFormValues } from '../iot-guide/type.js'
import { convert_list_to_options } from '../../dashboard/utils.js'
import { countBy, isNumber } from 'lodash'
import { model } from '../../model.js'
import { ARRAY_VECTOR_DATA_TYPES, BASIC_DATA_TYPES, ENUM_TYPES, LOW_VERSION_DATA_TYPES, TIME_TYPES } from '../constant.js'

interface ISchemaUploadModal { 
    on_apply: (values) => void
}

export const SchemaUploadModal = NiceModal.create((props: ISchemaUploadModal) => {
    
    const { on_apply } = props
    const [form] = Form.useForm<{
        delimiter: string
        file_path: string
        file: { file: File }
        upload_type: 0 | 1
    }>()
    
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
                // 本地上传，截取 100kb，避免文件内容过大传输失败
                const split_file = file.file.slice(0, 1024 * 100)
                const content = await split_file.text()
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
        } catch { }
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


interface IDataTypeSelect {
    value?: string
    onChange?: (val: string) => void
    mode: 'finance' | 'ito'
    engine: string
}

export function DataTypeSelect (props: IDataTypeSelect) {
    const { value, onChange, mode = 'ito', engine = 'TSDB' } = props
        
    const [data_type, set_data_type] = useState<string>()
    const [decimal, set_decimal] = useState<number>() 
    const [limit, set_limit] = useState({ min: 0, max: 9 })
    
    const data_types = useMemo(() => {        
        if (model.version) { 
            const [first_version, second_version] = model?.version?.split('.')
            if (Number(first_version) <= 1 && Number(second_version) <= 30)
                return LOW_VERSION_DATA_TYPES
        }
        // OLAP无 BLOB 和 array vector
        if (engine !== 'TSDB')
            return BASIC_DATA_TYPES
        // 物联网场景无 array vector
        else if (mode === 'ito')
            return BASIC_DATA_TYPES.concat(['BLOB'])
        else  
            return BASIC_DATA_TYPES.concat([...ARRAY_VECTOR_DATA_TYPES, 'BLOB'])
    }, [mode, engine, model.version])
    
    
    // 解析 value,回填
    useEffect(() => {
        if (value)
            if (value.includes('DECIMAL')) {
                // 带括号的decimal (1)
                const decimal_str = value.match(/\((.+?)\)/g)[0]
                set_decimal(Number(decimal_str.substring(1, decimal_str.length - 1)))
                set_data_type(value.replace(/\(.*?\)/g, ''))
            } else  
                set_data_type(value)
    }, [value])
    
    useEffect(() => {
        if (!data_type?.includes('DECIMAL'))
            return
        if (data_type.includes('DECIMAL32'))
            set_limit({ min: 0, max: 9 })
        else if (data_type.includes('DECIMAL64'))
            set_limit({ min: 0, max: 18 })
        else if (data_type.includes('DECIMAL128'))
            set_limit({ min: 0, max: 38 })
    }, [data_type])
    
    useEffect(() => { 
        // 首次渲染不校验
        if (data_type === undefined)
            return
        if (data_type?.includes('DECIMAL'))  
            if (isNumber(decimal)) 
                if (data_type.includes('[]'))
                    onChange(`${data_type.replace('[]', '')}(${decimal})[]`)
                else
                    onChange(`${data_type}(${decimal})`)
            else
                onChange(undefined)
        else
            onChange(data_type)
    }, [data_type, decimal])
    
    return data_type?.includes('DECIMAL')
        ? <div className='data-type-wrapper'>
            <Select
                value={data_type}
                onChange={val => { set_data_type(val) }}
                showSearch
                options={convert_list_to_options(data_types)}
                placeholder='请选择数据类型'
            />
            <InputNumber min={limit.min} max={limit.max} value={decimal} onChange={val => { set_decimal(val) }} placeholder='请输入 DECIMAL 精度'/>
        </div>
        : <Select
            value={data_type}
            onChange={val => { set_data_type(val) }}
            showSearch
            options={convert_list_to_options(data_types)}
            placeholder='请选择数据类型'
        />
}

export function SchemaList (props: { mode: 'finance' | 'ito', engine: string, is_freq_increase: 0 | 1 }) { 
    const { is_freq_increase, mode, engine } = props
    const form = Form.useFormInstance()
    
    const on_apply = useCallback(schema => {
        if (schema)
            form.setFieldValue('schema', schema)
    }, [ ])
    
    const on_upload = useCallback(() => { 
        NiceModal.show(SchemaUploadModal, { on_apply })
    }, [on_apply])
    
    const validator = useCallback(async (_, value) => { 
        const schema = form.getFieldValue('schema')
        const name_list = schema.filter(item => !!item?.colName).map(item => item?.colName)
        if (countBy(name_list)?.[value] > 1)  
            return Promise.reject('已配置该列，请修改')
        else
            return Promise.resolve()
    }, [ ])
    
    const validate_schema = useCallback(async (_, schema) => {
        // 时序数据校验规则：必须包含3列以上，至少有1个时间类型和1个枚举类型（STRING、SYMBOL、INT、SHORT）
        const types = schema.filter(item => item?.dataType).map(item => item.dataType)
        if (is_freq_increase) {
            if (mode === 'ito')
                if (types.some(type => TIME_TYPES.includes(type)) && types.some(type => ENUM_TYPES.includes(type)))
                    return Promise.resolve()
                else  
                    return Promise.reject(new Error('时序数据的表结构至少有一列时间列与枚举列'))
            else if (!types.some(type => TIME_TYPES.includes(type)))
                return Promise.reject('表结构至少包含一列时间列')
         }
         else 
            if (types.some(type => ENUM_TYPES.includes(type)))
                return Promise.resolve()
            else
                return Promise.reject(new Error('非时序数据表结构至少有一列枚举列'))
     }, [ is_freq_increase ])
    
    return <>
        <div className='schema-wrapper'>
            <h4>列配置</h4>
            
            <Form.List name='schema' initialValue={[{ }, { }, { }]} rules={[{ validator: validate_schema }]}>
                {(fields, { add, remove }, { errors }) => <>
                    {fields.map(field => <div className='schema-item' key={field.name}>
                        <Form.Item
                            label='列名'
                            name={[field.name, 'colName']}
                            rules={[
                                { required: true, message: '请输入列名' },
                                { validator }
                            ]}>
                            <Input placeholder='请输入列名'/>
                        </Form.Item>
                        <Form.Item tooltip='DECIMAL32 精度有效范围是[0, 9]，DECIMAL64 精度有效范围是[0, 18]，DECIMAL128 精度有效范围是[0,38]' labelCol={{ span: 8 }} label='数据类型' name={[field.name, 'dataType']} rules={[{ required: true, message: '请选择数据类型' }]}>
                            <DataTypeSelect mode={mode} engine={engine} />
                        </Form.Item>
                        <Form.Item label='备注' name={[field.name, 'comment']}>
                            <Input placeholder='请输入备注'/>
                        </Form.Item>
                        {fields.length > 3 && <Tooltip title='删除'><DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }}/></Tooltip> }
                    </div>)}
                    <Button onClick={() => { add() }} type='dashed' block icon={<PlusCircleOutlined />}>增加列配置</Button>
                    <Form.ErrorList className='schema-list-error' errors={errors} />
                </>}
            </Form.List>
            
    
            <div className='upload-schema-wrapper'>
                <Typography.Link onClick={on_upload}>
                    <CloudUploadOutlined className='upload-schema-icon'/>
                    导入表文件
                </Typography.Link>
            </div>
        
        </div>
        
        <Typography.Text type='secondary' className='schema-tips'>
            {
                mode === 'finance'
                    ? '请注意，表结构至少需要一列时间列，时间列类型包括DATE、DATETIME、TIMESTAMP'
                    : '请注意，时序数据的表结构至少需要一列时间列与枚举列，非时序数据表结构至少需要一列枚举列，时间列类型包括DATE、DATETIME、TIMESTAMP，枚举列类型包括STRING、SYMBOL。'
                    
            }
        </Typography.Text>
        
    </>
}
