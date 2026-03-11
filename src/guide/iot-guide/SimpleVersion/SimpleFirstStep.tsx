import './index.scss'

import { Button, Form } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { t } from '@i18n'
import { BottomFixedFooter } from '@components/BottomFixedFooter/index.tsx'
import { type SimpleInfos, type BasicInfoFormValues, GuideType, type ExecuteResult } from '@/guide/iot-guide/type.ts'
import { BasicInfoFields } from '@/guide/components/BasicInfoFields.tsx'
import { request } from '@/guide/utils.ts'



interface IProps { 
    go: (infos: { info?: SimpleInfos, result?: ExecuteResult }) => void
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
        go({ info: { first: values, code } })
        set_loading(false)
    }, [go])
    
    return <>
        <Form
            onFinish={on_submit}
            form={form}
            className='simple-version-form'
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
        >
            <BasicInfoFields type={GuideType.SIMPLE} />
        </Form>
        
        <BottomFixedFooter>
            <Button loading={loading} type='primary' onClick={form.submit}>{t('生成脚本')}</Button>
        </BottomFixedFooter>
    </>
}
