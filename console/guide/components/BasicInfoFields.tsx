import './index.scss'
import { Button, Form, Input, InputNumber, Radio, Select, type SelectProps } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { SchemaList } from './SchemaList.js'
import { useCallback, useEffect } from 'react'
import { type BasicInfoFormValues, type SecondStepInfo } from '../type.js'
import { model } from '../../model.js'
import { throttle } from 'lodash'


interface IProps { 
    set_second_step_info: (val: SecondStepInfo) => void
    to_next_step: (value: BasicInfoFormValues) => void
    values: BasicInfoFormValues | undefined
}



const DAILY_INCREASE_NUM_OPTIONS: SelectProps['options'] = [
    { label: '0-10万', value: 0, key: 0 },
    { label: '10万-100万', value: 1, key: 1 },
    { label: '100万-1000万', value: 2, key: 2 },
    { label: '1000万-1亿', value: 3, key: 3 },
    { label: '1亿-10亿', value: 4, key: 4 },
    { label: '10亿-100亿', value: 5, key: 5 },
    { label: '100亿以上', value: 6, key: 6 },
    { label: '自定义', value: 7, key: 7 }
]

export function BasicInfoFields (props: IProps) { 
    const { set_second_step_info, to_next_step, values } = props
    const [form] = Form.useForm<BasicInfoFormValues>()
    
    const isFreqIncrease = Form.useWatch('isFreqIncrease', form)
    const totalNum = Form.useWatch('totalNum', form)
    
    useEffect(() => {
        if (!isFreqIncrease && (totalNum?.gap === 0 || totalNum?.custom < 1000000))
            set_second_step_info?.({ otherSortKeys: { show: false } })
        else
            set_second_step_info?.({ otherSortKeys: { show: true } })
     }, [isFreqIncrease, totalNum, set_second_step_info])
    
    useEffect(() => { 
        if (values)
            form.setFieldsValue(values)
    }, [values])
    
    
 
    
    const on_click = useCallback(async () => { 
        const values = form.getFieldsValue()
        // 非时序数据，且数据总量小于100w, 直接调用脚本生成接口
        if (!values.isFreqIncrease && (values.totalNum?.gap === 0 || values.totalNum?.custom < 1000000))
            set_second_step_info?.({ otherSortKeys: { show: false } })
        else {
            // 时序数据或者数据总量大于100w的数据，需要选筛选列，需要获取最大筛选列限制数
            const data = await model.ddb.call('recommendSortKeyNum', [JSON.stringify(values)])
            // @ts-ignore
            set_second_step_info({ otherSortKeys: { show: false, max: data?.sortKeyNum } })
        }
        
        to_next_step(values)
       
    }, [ ])
    
    
    
    return <Form onFinish={to_next_step} form={form} labelAlign='left' className='simple-version-form' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Form.Item
            label='库名'
            name='dbName'
            rules={[
                { required: true, message: '请输入库名' },
                // {
                //     validator: throttle(async (_, value) => { 
                //         const data = await model.ddb.call('checkDatabase', [JSON.stringify({ dbName: value })])
                //         // @ts-ignore
                //         if (data.isExist)  
                //             throw new Error('已有同名库，请修改库名')
                //     }, 500)
                // }
            ]}>
            <Input placeholder='请输入库名'/>
        </Form.Item>
        
        <Form.Item label='表名' name='tbName' rules={[{ required: true, message: '请输入表名' }]}>
            <Input placeholder='请输入表名'/>
        </Form.Item>
        
        <Form.Item label='是否为时序数据' name='isFreqIncrease' initialValue={1} tooltip='按时间顺序记录的数据'>
            <Radio.Group>
                <Radio value={1} > 是 </Radio>
                <Radio value={0} > 否 </Radio>
            </Radio.Group>
        </Form.Item>
        
        {/* 数据量 */}
        <FormDependencies dependencies={['isFreqIncrease']}>
            {({ isFreqIncrease }) => { 
                if (isFreqIncrease)
                    return <>
                        <Form.Item label='日增数据量' name={['dailyTotalNum', 'gap']} initialValue={0} rules={[{ required: true, message: '请选择日增数据量' }]}>
                            <Select options={DAILY_INCREASE_NUM_OPTIONS} />
                        </Form.Item>
                        <FormDependencies dependencies={[['dailyTotalNum', 'gap']]}>
                            {value => { 
                                const { dailyTotalNum } = value
                                if (dailyTotalNum.gap === 7)
                                    return <Form.Item name={['dailyTotalNum', 'custom']} label='自定义日增数据量' rules={[{ required: true, message: '请输入自定义日增数据量' }]}>
                                        <InputNumber placeholder='请输入自定义日增数据量'/>
                                    </Form.Item>
                                else
                                    return null
                            } }
                        </FormDependencies>
                    </>
                return <>
                    <Form.Item label='总数据量' name={['totalDataNum', 'gap']} initialValue={1} rules={[{ required: true, message: '请选择总数据量' }]}>
                        <Radio.Group>
                            <Radio value={0}> 0-100万 </Radio>
                            <Radio value={1}> 100万以上 </Radio>
                            <Radio value={7}>自定义</Radio>
                        </Radio.Group>
                    </Form.Item>
                    
                    <FormDependencies dependencies={[['totalDataNum', 'gap']]}>
                        {value => { 
                            const { totalDataNum } = value
                            if (totalDataNum.gap === 7)  
                                return <Form.Item label='自定义数据总量' name={['totalDataNum', 'custom']} rules={[{ required: true, message: '请输入自定义数据总量' }]}>
                                    <InputNumber placeholder='请输入自定义数据总量'/>
                                </Form.Item>
                        } }
                    </FormDependencies>
                
                </>
            } }
        </FormDependencies>
        
        {/* 测点数 */}
        <FormDependencies dependencies={['isFreqIncrease', 'totalDataNum']}>
            {({ totalDataNum, isFreqIncrease }) => {
                // 时序数据情况下，或者数据总量大于100w 展示测点数
                if (totalDataNum?.gap === 1 || totalDataNum?.custom > 1000000 || isFreqIncrease)
                    return <Form.Item label='测点数' name='pointNum' rules={[{ required: true, message: '请输入测点数' }]}>
                        <InputNumber placeholder='请输入测点数'/>
                    </Form.Item>
                else
                    return null
            }}
        </FormDependencies>
        
        <SchemaList />
        
        
        <Form.Item className='button-group'>
            <Button type='primary' htmlType='submit' onClick={on_click}>下一步</Button>
        </Form.Item>
        
    
    </Form>
}
