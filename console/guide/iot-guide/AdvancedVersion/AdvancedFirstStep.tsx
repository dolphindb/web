import { Button, Form } from 'antd'
import { BasicInfoFields } from '../../components/BasicInfoFields.js'
import { type RecommendInfo, type BasicInfoFormValues, type SecondStepInfo, type AdvancedInfos, GuideType, type ExecuteResult, type ServerRecommendInfo } from '../type.js'
import { useCallback, useEffect, useState } from 'react'
import { request } from '../../utils.js'

interface IProps { 
    info: AdvancedInfos
    set_recommend_info: any
    go: (infos: AdvancedInfos & { result?: ExecuteResult }) => void
    recommend_info: RecommendInfo
}

export function AdvancedFirstStep (props: IProps) { 
    const { info, set_recommend_info, go, recommend_info } = props
    const [form] = Form.useForm<BasicInfoFormValues>()
    const [loading, set_loading] = useState(false)
    
    const isFreqIncrease = Form.useWatch('isFreqIncrease', form)
    const totalNum = Form.useWatch('totalNum', form)
    
    
    useEffect(() => {
        // 非时序数据，数据量小于100万
        if (!isFreqIncrease && (totalNum?.gap === 0 || totalNum?.custom < 1000000))
            set_recommend_info?.({ hasAdvancedInfo: false })
        else
            set_recommend_info?.({ hasAdvancedInfo: true })
    }, [isFreqIncrease, totalNum, set_recommend_info])
    
    useEffect(() => { 
        if (info?.first)
            form.setFieldsValue(info.first)
    }, [info?.first])
    
    
    const on_submit = useCallback(async form_values => { 
        set_loading(true)
        if (!recommend_info.hasAdvancedInfo) {
            const code = await request<string>('DBMSIOT_createDB2', form_values)
            go({ first: form_values, code })
        } else {
            const res = await request<ServerRecommendInfo>('DBMSIOT_recommendInfo', form_values)
            set_recommend_info(prev => ({ ...prev, ...res }))
            go({  first: form_values })
        }
        set_loading(false)
    }, [go, recommend_info.hasAdvancedInfo])
    
    return <Form
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={on_submit}
    >
        <BasicInfoFields type={GuideType.ADVANCED} />
        <Form.Item className='btn-group'>
            <Button loading={loading} htmlType='submit' type='primary'>{ recommend_info.hasAdvancedInfo ? '下一步' : '生成脚本'}</Button>
        </Form.Item>
    </Form>
}
