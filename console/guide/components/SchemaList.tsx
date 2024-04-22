import './index.scss'

import { CloudUploadOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, Input, InputNumber, Modal, Radio, Select, Tooltip, Typography } from 'antd'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { countBy, isNumber } from 'lodash'

import { check_tb_valid, request } from '../utils.js'
import { type BasicInfoFormValues } from '../iot-guide/type.js'
import { convert_list_to_options } from '../../dashboard/utils.js'


import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { model } from '../../model.js'
import { ARRAY_VECTOR_DATA_TYPES, BASIC_DATA_TYPES, ENUM_TYPES, LOW_VERSION_DATA_TYPES, TIME_TYPES } from '../constant.js'
import { t } from '../../../i18n/index.js'

import { UploadFileField } from './UploadFileField.js'

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
        } 
        catch { }
        
        const { delimiter, file_path, file, upload_type } = await form.getFieldsValue()
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
        
        set_loading(false)
    }, [ on_apply ])
    
    return <Modal
        width={800}
        onCancel={modal.hide}
        open={modal.visible}
        title={t('导入表文件')}
        onOk={on_submit}
        okButtonProps={{ loading }}
        destroyOnClose
        afterClose={modal.remove}
    >
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} labelAlign='left'>
            <Form.Item label={t('导入方式')} name='upload_type' initialValue={0}>
                <Radio.Group>
                    <Radio value={0}>{t('本地导入')}</Radio>
                    <Radio value={1}>{t('服务器导入')}</Radio>
               </Radio.Group>
            </Form.Item>
            <Form.Item label={t('自定义分隔符')} name='delimiter'>
                <Input placeholder={t('默认分隔符为 \',\'，可自定义分隔符')}/>
            </Form.Item>
            
            <FormDependencies dependencies={['upload_type']}>
                {({ upload_type }) => !upload_type
                    ? <UploadFileField accept='.csv,text/plain' tip={t('仅支持上传 csv 文件与 txt 文件')} /> 
                    : <Form.Item name='file_path' label={t('文件地址')} rules={[{ required: true, message: t('请输入文件在服务器的绝对路径地址') }]}>
                        <Input placeholder={t('请输入文件在服务器的绝对路径地址')} />
                    </Form.Item>
                }
                
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
                placeholder={t('请选择数据类型')}
            />
            <InputNumber
                min={limit.min}
                max={limit.max}
                value={decimal}
                onChange={val => { set_decimal(val) }}
                placeholder={t('DECIMAL 精度')}
                precision={0}
            />
        </div>
        : <Select
            value={data_type}
            onChange={val => { set_data_type(val) }}
            showSearch
            options={convert_list_to_options(data_types)}
            placeholder={t('请选择数据类型')}
        />
}

export function SchemaList (props: { mode: 'finance' | 'ito', engine: string, need_time_col?: boolean }) { 
    const { need_time_col = true, mode, engine } = props
    const form = Form.useFormInstance()
    const schema = Form.useWatch('schema', form)
    const init = useRef(false)
    
    // 自定义schema校验，首次不校验
    useEffect(() => {
        if (init.current)
            form.validateFields(['schema'])
        else if (schema)
            init.current = true
    }, [ schema ])
    
    const on_apply = useCallback(schema => {
        if (schema)
            form.setFieldValue('schema', schema)
    }, [ ])
    
    const on_upload = useCallback(async () => 
        NiceModal.show(SchemaUploadModal, { on_apply })
    , [on_apply])
    
    const validator = useCallback(async (_, value) => { 
        if (!check_tb_valid(value))  
            return Promise.reject(t('仅支持数字、大小写字母、中文以及下划线，且必须以中文或英文字母开头'))
        
        const name_list = schema.filter(item => !!item?.colName).map(item => item?.colName)
        
        if (countBy(name_list)?.[value] > 1)  
            return Promise.reject(t('已配置该列，请修改'))
        else
            return Promise.resolve()
    }, [schema])
    
    const validate_schema = useCallback(async (_, values) => {
        const types = values.filter(item => item?.dataType).map(item => item.dataType)
        // 物联网场景，且为时序数据或者数据总量大于200w的非时序数据
        if (mode === 'ito' 
                && need_time_col
                    && (!types.some(type => TIME_TYPES.includes(type)) 
                            || !types.some(type => ENUM_TYPES.includes(type))))  
            // 物联网场景
            return Promise.reject(new Error(t('时序数据或总数据量大于 200 万的非时序数据，表结构至少有一列时间列与枚举列')))
        // 金融场景必须有一列时间列
        else if (mode === 'finance' && !types.some(type => TIME_TYPES.includes(type)))
            return Promise.reject(t('表结构至少包含一列时间列'))
        return Promise.resolve()
    }, [need_time_col, mode])
    
    return <>
        <div className='schema-wrapper'>
            <h4>{t('列配置')}</h4>
            
            <Form.List
                name='schema'
                initialValue={[{ }, { }, { }]}
                rules={[{ validator: validate_schema }]}
            >
                {(fields, { add, remove }, { errors }) => <>
                    {fields.map(field => <div className='schema-item' key={field.name}>
                        <Form.Item
                            wrapperCol={{ span: 16 }}
                            labelCol={{ span: 8 }}
                            label={t('列名')}
                            name={[field.name, 'colName']}
                            rules={[
                                { required: true, message: t('请输入列名'), validateTrigger: 'onChange' },
                                { validator }
                            ]}>
                            <Input placeholder={t('请输入列名')}
                        />
                        </Form.Item>
                        <Form.Item
                            wrapperCol={{ span: 16 }}
                            tooltip={t('DECIMAL32 精度有效范围是[0, 9]，DECIMAL64 精度有效范围是[0, 18]，DECIMAL128 精度有效范围是[0,38]')}
                            labelCol={{ span: 8 }}
                            label={t('数据类型')}
                            name={[field.name, 'dataType']}
                            rules={[{ required: true, message: t('请选择数据类型'), validateTrigger: 'onChange' }]}>
                            <DataTypeSelect mode={mode} engine={engine} />
                        </Form.Item>
                        <Form.Item
                            wrapperCol={{ span: 16 }}
                            labelCol={{ span: 8 }}
                            label={t('备注')}
                            name={[field.name, 'comment']}
                        >
                            <Input placeholder={t('请输入备注')} />
                        </Form.Item>
                        {fields.length > 3 && <Tooltip title={t('删除')}><DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }}/></Tooltip> }
                    </div>)}
                    <Button onClick={() => { add({ }) }} type='dashed' block icon={<PlusCircleOutlined />}>{t('增加列配置')}</Button>
                    <Form.ErrorList className='schema-list-error' errors={errors} />
                </>}
            </Form.List>
            
    
            <div className='upload-schema-wrapper'>
                <Typography.Link onClick={on_upload}>
                    <CloudUploadOutlined className='upload-schema-icon'/>
                    {t('导入表文件')}
                </Typography.Link>
            </div>
        
        </div>
        
        <Typography.Text type='secondary' className='schema-tips'>
            {
                mode === 'finance'
                    ? t('请注意，表结构至少需要一列时间列，时间列类型包括 {{name}}', { name: TIME_TYPES.join(', ') })
                    : t('请注意，时序数据或总数据量大于200万的非时序数据的表结构至少需要一列时间列与枚举列，其余数据表结构至少需要一列枚举列，时间列类型包括DATE、DATETIME、TIMESTAMP、NANOTIMESTAMP，枚举列类型包括STRING、SYMBOL、CHAR。')
            }
        </Typography.Text>
        
    </>
}
