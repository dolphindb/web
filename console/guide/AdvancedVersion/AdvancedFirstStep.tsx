import { Button, Form } from 'antd'
import { BasicInfoFields } from '../components/BasicInfoFields.js'
import { type RecommendInfo, type BasicInfoFormValues, type SecondStepInfo, type AdvancedInfos, GuideType } from '../type.js'
import { useCallback, useEffect } from 'react'
import { model } from '../../model.js'

interface IProps { 
    info: AdvancedInfos
    set_recommend_info: (val: RecommendInfo) => void
    go: (info: AdvancedInfos, code?: string) => void
}

export function AdvancedFirstStep (props: IProps) { 
    const { info, set_recommend_info, go } = props
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
    
    useEffect(() => { 
        if (info?.first)
            form.setFieldsValue(info.first)
    }, [info?.first])
    
    
    const on_submit = useCallback(async () => { 
        const form_values = form.getFieldsValue()
        // 请求高阶信息
        // @ts-ignore
        // const { partitionNum, partitionCols, sortKeyNum } = await model.ddb.call('', [JSON.stringify(form_values)])
        // 非时序数据，且数据总量小于100w, 不展示常用筛选列
        if (!form_values.isFreqIncrease && (form_values.totalNum?.gap === 0 || form_values.totalNum?.custom < 1000000))
            set_recommend_info({
                otherSortKeys: {
                    show: false
                },
                // partitionCols: {
                //     num: partitionNum,
                //     cols: partitionCols
                // }
            })
         
        else
            set_recommend_info({
                otherSortKeys: {
                    show: true,
                    // max: sortKeyNum
                },
                // partitionCols: {
                //     num: partitionNum,
                //     cols: partitionCols
                // }
            })
        go({ first: form_values })
    }, [go])
    
    return <Form
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={on_submit}
    >
        <BasicInfoFields type={GuideType.ADVANCED} />
        <Form.Item className='btn-group'>
            <Button htmlType='submit' type='primary'>下一步</Button>
        </Form.Item>
    </Form>
}
