import { Button, Form, Input, InputNumber, Radio, Select } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { ExistDBSelect } from './components/ExistedDBSelect.js'
import { DAILY_INCREASE_DATA_OPTIONS } from './constant.js'
import { type IDatabaseInfo, type IFinanceInfo } from './type.js'
import { useCallback, useEffect } from 'react'

const CUSTOM = 9

interface IProps { 
    info: IFinanceInfo
    go: (info: IFinanceInfo) => void
}


export function DatabaseInfo (props: IProps) {
    
    const { info, go } = props
    
    const [form] = Form.useForm()
    
    const on_submit = useCallback((values: IDatabaseInfo) => {
        go({ database: values })
    }, [ ])
    
    useEffect(() => { 
        if (info?.database)
            form.setFieldsValue(info?.database)
    }, [info?.database])
    
    return <Form
        onFinish={on_submit}
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
    >
        <Form.Item label='是否使用现有库' name='isExist' initialValue={1} rules={[{ required: true, message: '请选择是否使用现有库' }]}>
            <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
            </Radio.Group>
        </Form.Item>
        
        <FormDependencies dependencies={['isExist']}>
            {value => { 
                if (value.isExist)
                    return <Form.Item label='现有库' name='name' rules={[{ required: true, message: '请选择现有库' }]}>
                        <ExistDBSelect placeholder='请选择现有库'/>
                    </Form.Item>
                else
                    return <>
                        <Form.Item label='新建库名' name='name' rules={[{ required: true, message: '请输入新建库名' }]}>
                            <Input addonBefore='dfs://' placeholder='请输入库名'/>
                        </Form.Item>
                        <Form.Item label='日增量' name={['dailyTotalNum', 'gap']} rules={[{ required: true, message: '请选择日增量' }]}>
                            <Select options={DAILY_INCREASE_DATA_OPTIONS} placeholder='请选择日增量'/>
                        </Form.Item>
                        <FormDependencies dependencies={[['dailyTotalNum', 'gap']]}>
                            {value => { 
                                if (value?.dailyTotalNum?.gap === CUSTOM)
                                    return <Form.Item
                                        label='自定义日增数据量'
                                        name={['dailyTotalNum', 'custom']}
                                        rules={[{ required: true, message: '请输入日增数据量' }]}>
                                        <InputNumber placeholder='请输入日增数据量'/>
                                    </Form.Item>
                            } }
                        </FormDependencies>
                        
                        <FormDependencies dependencies={['dailyTotalNum']}>
                            {value => {
                                const { dailyTotalNum } = value
                                console.log(dailyTotalNum, 'dailyTotalNum')
                                // 日增量小于1w不展示引擎选项
                                if (dailyTotalNum?.gap === 0 || (dailyTotalNum?.gap === CUSTOM && dailyTotalNum.custom <= 10000)) 
                                    return null
                                 else 
                                    return <Form.Item name='engine' label='引擎类型' initialValue='TSDB' rules={[{ required: true, message: '请选择引擎类型' }] }>
                                        <Radio.Group>
                                            <Radio value='TSDB'>TSDB</Radio>
                                            <Radio value='OLAP'>OLAP</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                
                                }
                            }  
                        </FormDependencies>
                    </>
            } }
        </FormDependencies>
        
        <Form.Item className='btn-group'>
            <Button type='primary' htmlType='submit'>下一步</Button>
        </Form.Item>
        
        
    </Form>
}
