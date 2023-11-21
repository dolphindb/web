import './index.scss'
import { Button, Form, Radio, Select, Space, Typography } from 'antd'
import { type RecommendInfo, type SecondStepInfo, type AdvancedInfos, type ExecuteResult, type IAdvancedCreateDBResp } from '../type.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { CommonSortCols } from './CommonSortCols.js'
import NiceModal from '@ebay/nice-modal-react'
import { RecommendModal } from './RecommendModal.js'
import { request } from '../utils.js'

interface IProps { 
    info: AdvancedInfos
    recommend_info: RecommendInfo
    back: () => void
    go:  (infos: { info: AdvancedInfos, code?: string, result?: ExecuteResult }) => void
}

const keep_duplicates_options = [
    {
        label: 'ALL',
        value: 0,
    },
    {
        label: 'FIRST',
        value: 1,
    },
    {
        label: 'LAST',
        value: 2
    }
]

export function AdvancedSecondStep (props: IProps) { 
    const { info, recommend_info, go, back } = props
    const [form] = Form.useForm<SecondStepInfo>()
    const [loading, set_loading] = useState(false)
    
    const col_options = useMemo(() =>
        info.first?.schema?.map(item => ({ label: item.colName, value: item.colName })),
        [info])
    
    useEffect(() => { 
        if (info?.second)
            form.setFieldsValue(info.second)
    }, [info?.second])
    
    const on_submit = useCallback(async () => { 
        set_loading(true)
        const form_values = form.getFieldsValue()
        const { isValid, recommendOtherSortKey, code } = await request<IAdvancedCreateDBResp>('createDB2', { ...info.first, ...form_values })
    
        if (isValid) 
            go({ info: { second: form_values }, code })
         else
            NiceModal.show(RecommendModal, {
                col_options,
                recommended_sort_keys: recommendOtherSortKey,
                on_apply_recommend: () => {
                    form.setFieldValue('otherSortKeys', recommendOtherSortKey)
                },
                on_apply_mine: () => { 
                    go({ info: { second: form_values }, code })
                }
            })
        set_loading(false)
    }, [col_options])
    
    
    return <Form
        form={form}
        onFinish={on_submit}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
    >
        <Form.Item
            label='存储引擎'
            name='engine'
            initialValue='TSDB'
            tooltip={<>
                存储引擎的选择与业务有关，若您的计算需求常以一定的时间跨度进行，推荐使用TSDB存储引擎；若您的查询常用于全量数据的密集计算，推荐使用OLAP存储引擎
                <br />
                建议使用TSDB存储引擎
            </>}>
            <Radio.Group>
                <Radio value='TSDB'>TSDB</Radio>
                <Radio value='OLAP'>OLAP</Radio>
            </Radio.Group>
        </Form.Item>
        
        
        <Form.Item
            label='是否允许并发写入同一分区'
            name='actomic'
            initialValue={0}
            tooltip={<>
                允许并发写入同一分区，会降低写入速度，且有极小概率导致数据不一致
                <br />
                建议不允许并发写入同一分区
            </>}
        >
            <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
            </Radio.Group>
        </Form.Item>
        
        <Form.Item
            label='常用查询时间跨度'
            name='commQueryDuration'
            initialValue='daily'
            tooltip='在您的范围查询、分组过滤查询中，您最常用的时间跨度以什么为单位？'
        >
            <Radio.Group>
                <Radio value='hour'>小时</Radio>
                <Radio value='daily'>天</Radio>
                <Radio value='month'>月</Radio>
            </Radio.Group>
        </Form.Item>
        
        <Form.Item label='分区列' name='partitionColumn' rules={[{ required: true, message: '请选择分区列' }]}>
            <Select mode='multiple' options={col_options} placeholder='请选择分区列'/>
        </Form.Item>
       
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => {
                if (engine === 'TSDB')
                    return <> 
                        <CommonSortCols col_options={col_options ?? [ ]} mode='common'/>
                        <Typography.Text className='other-sortkey-tip' type='secondary'>
                            除时间列和设备id列外，请选择查询时常用于过滤筛选的列，结合您上述提供的信息
                        </Typography.Text>
                
                        <Form.Item name='keepDuplicates' label='重复数据保留策略' rules={[{ required: true, message: '请选择重复数据保留策略' }]} initialValue={0}>
                            <Select options={keep_duplicates_options} />
                        </Form.Item>
                    </>
                else
                    return null
            } }
            
        </FormDependencies>
            
        
        <Form.Item className='btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button loading={loading} type='primary' htmlType='submit'>生成脚本</Button>
            </Space>
        </Form.Item>
    </Form>
}
