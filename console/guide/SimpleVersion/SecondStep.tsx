import './index.scss'

import { Button, Form, Select, Space } from 'antd'
import { type SimpleInfos, type BasicInfoFormValues } from '../type.js'
import { useCallback } from 'react'
import { model } from '../../model.js'
import NiceModal from '@ebay/nice-modal-react'
import { DownloadConfigModal } from '../components/DownloadConfigModal.js'

interface IProps { 
    max: number
    info: SimpleInfos
    set_code: (code: string) => void
    back: () => void
    go: (info: SimpleInfos) => void
}

export function SecondStep (props: IProps) {

    const { max = 3, info, back, set_code, go } = props
    const [form] = Form.useForm()
    
    const generate = useCallback(async () => { 
        const values = form.getFieldsValue()
        const params = { ...info.first, ...values }
        const data = await model.ddb.call('createDB', [JSON.stringify(params)])
        // @ts-ignore
        set_code(data.code)
        go({ second: values })
    }, [info, go])
    
    return <Form form={form} onFinish={generate} labelAlign='left' className='simple-version-form' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Form.Item
            help={<>
                请选择查询时常用于数据筛选过滤的列。
                <br />
                越重要的过滤条件，在过滤列中的位置越靠前。一般情况下第一个常用过滤列为时间列，第二个常用过滤列为设备id列。
                <br />
                {`结合您上述提供的信息，最多能选择 ${max} 列`}
            </>}
            label='常用筛选列'
            name='otherSortKeys'
            rules={[
                { required: true, message: '请选择常用筛选列' },
                {
                    required: true,
                    validator: async (_, value) => {
                        console.log(value, max)
                        if (value.length > max) { 
                            console.log(value.length > max)
                            throw new Error(`常用筛选列推荐最多选择 ${max} 个`)
                        }
                           
                    }
                }
            ]}
        >
            <Select mode='multiple' options={info?.first?.schema?.map(item => ({ label: item.colName, value: item.colName }))} />
        </Form.Item>
        
        <Form.Item className='btn-group'>
            <Space>
                <Button className='go-back-btn' onClick={back}>上一步</Button>
                <Button type='primary' htmlType='submit'>生成脚本</Button>
            </Space>
        </Form.Item>
        
    </Form>
}
