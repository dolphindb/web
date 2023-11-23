import './index.scss'
import { Button, Form } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { type SimpleInfos, type BasicInfoFormValues, GuideType, type ExecuteResult } from '../type.js'
import { BasicInfoFields } from '../../components/BasicInfoFields.js'
import { request } from '../../utils.js'



interface IProps { 
    go: (infos: { info?: SimpleInfos, generate_code?: string, result?: ExecuteResult }) => void
    info: SimpleInfos
}


export function SimpleFirstStep (props: IProps) { 
    const { go, info } = props
    const [form] = Form.useForm<BasicInfoFormValues>()
    const [loading, set_loading] = useState(false)
    
    useEffect(() => {
        if (info?.first)
            form.setFieldsValue(info.first)
    }, [info?.first])
    
    const on_submit = useCallback(async (values: BasicInfoFormValues) => { 
        set_loading(true)
        const code = await request<string>('DBMSIOT_createDB', values) 
        go({ info: { first: values }, generate_code: code })
        set_loading(false)
    }, [go])
    
    
    
    return <Form onFinish={on_submit} form={form} labelAlign='left' className='simple-version-form' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <BasicInfoFields type={GuideType.SIMPLE} />
        <Form.Item className='button-group'>
            <Button loading={loading} type='primary' htmlType='submit'>生成脚本</Button>
        </Form.Item>
    </Form>
}
