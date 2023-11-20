import './index.scss'
import { Button, Form } from 'antd'
import { useCallback, useEffect } from 'react'
import { type SimpleInfos, type BasicInfoFormValues, type RecommendInfo, GuideType } from '../type.js'
import { model } from '../../model.js'
import { BasicInfoFields } from '../components/BasicInfoFields.js'



interface IProps { 
    go: (new_infos: SimpleInfos, code?: string) => void
    info: SimpleInfos
}


export function SimpleFirstStep (props: IProps) { 
    const { go, info } = props
    const [form] = Form.useForm<BasicInfoFormValues>()
    
    useEffect(() => {
        if (info?.first)
            form.setFieldsValue(info.first)
    }, [info?.first])
    
    const on_submit = useCallback(async () => { 
        const values = form.getFieldsValue()
        const { value } = await model.ddb.call('createDB', [JSON.stringify(values)]) 
        // @ts-ignore
        go({ first: values }, value)
    }, [go])
    
    
    
    return <Form onFinish={on_submit} form={form} labelAlign='left' className='simple-version-form' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <BasicInfoFields type={GuideType.SIMPLE} />
        <Form.Item className='button-group'>
            <Button type='primary' htmlType='submit'>下一步</Button>
        </Form.Item>
    </Form>
}
