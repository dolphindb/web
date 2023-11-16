import './index.scss'
import { Button, Form } from 'antd'
import { useCallback, useEffect } from 'react'
import { type SimpleInfos, type BasicInfoFormValues, type RecommendInfo } from '../type.js'
import { model } from '../../model.js'
import { BasicInfoFields } from '../components/BasicInfoFields.js'



interface IProps { 
    set_recommend_info: (val: RecommendInfo) => void
    go: (new_infos: SimpleInfos) => void
    info: SimpleInfos
}


export function SimpleFirstStep (props: IProps) { 
    const { set_recommend_info, go, info } = props
    const [form] = Form.useForm<BasicInfoFormValues>()
    
    const isFreqIncrease = Form.useWatch('isFreqIncrease', form)
    const totalNum = Form.useWatch('totalNum', form)
    
    useEffect(() => {
        // 非时序数据，数据量小于100万
        if (!isFreqIncrease && (totalNum?.gap === 0 || totalNum?.custom < 1000000))
            set_recommend_info?.({ otherSortKeys: { show: false } })
        else
            set_recommend_info?.({ otherSortKeys: { show: true } })
    }, [isFreqIncrease, totalNum, set_recommend_info])
    
    const on_submit = useCallback(async () => { 
        const values = form.getFieldsValue()
        // 非时序数据，且数据总量小于100w, 直接调用脚本生成接口
        if (!values.isFreqIncrease && (values.totalNum?.gap === 0 || values.totalNum?.custom < 1000000))
            set_recommend_info?.({ otherSortKeys: { show: false } })
        else {
            // 时序数据或者数据总量大于100w的数据，需要选筛选列，需要获取最大筛选列限制数
            const data = await model.ddb.call('recommendSortKeyNum', [JSON.stringify(values)])
            // @ts-ignore
            set_recommend_info({ otherSortKeys: { show: false, max: data?.sortKeyNum } })
        }
        
        go({ first: values })
       
    }, [go])
    
    
    
    return <Form initialValues={info?.first} onFinish={on_submit} form={form} labelAlign='left' className='simple-version-form' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <BasicInfoFields />
        <Form.Item className='button-group'>
            <Button type='primary' htmlType='submit'>下一步</Button>
        </Form.Item>
    </Form>
}
