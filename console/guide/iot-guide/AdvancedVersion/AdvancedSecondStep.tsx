import './index.scss'
import { Button, Form, Radio, Select, Space, Typography } from 'antd'
import { type RecommendInfo, type SecondStepInfo, type AdvancedInfos, type ExecuteResult, type IAdvancedCreateDBResp } from '../type.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { CommonSortCols } from './CommonSortCols.js'
import { request } from '../../utils.js'

interface IProps { 
    info: AdvancedInfos
    recommend_info: RecommendInfo
    back: () => void
    go:  (infos: AdvancedInfos & { result?: ExecuteResult }) => void
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
    [info?.first?.schema])
    
    useEffect(() => { 
        if (info?.second)
            form.setFieldsValue(info.second)
    }, [info?.second])
    
    const on_submit = useCallback(async values => { 
        set_loading(true)
        const code = await request<string>('DBMSIOT_createDB2', { ...info.first, ...values })
        go({ code,  second: values })
        set_loading(false)
    }, [col_options, go])
    
    
    return <Form
        form={form}
        onFinish={on_submit}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={info?.second}
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
            label='分区列'
            name='partitionColumn'
            extra={recommend_info.partitionInfo?.context}
            rules={[
                { required: true, message: '请选择分区列' },
                {
                    validator: async (_, cols) => { 
                        if (cols?.length !== recommend_info.partitionInfo.partitionNum)  
                            return Promise.reject('您选择的分区列个数与推荐个数不一致，请修改')
                        
                        const first_col_type = info?.first?.schema.find(item => item.colName === cols?.[0])?.dataType
                        const second_col_type = info?.first?.schema.find(item => item.colName === cols?.[1])?.dataType
                        
                        if (!['DATE', 'MONTH', 'TIME', 'MINUTE', 'SECOND', 'DATETIME', 'TIMESTAMP', 'NANOTIMESTAMP'].includes(first_col_type))
                            return Promise.reject('第一个分区列需为时间列')
                        if (!['CHAR', 'SHORT', 'INT', 'SYMBOL', 'STRING'].includes(second_col_type))
                            return Promise.reject('第二个分区列的数据类型需为以下 CHAR、SHORT、INT、SYMBOL、STRING 五种数据类型的一种')
                    }
                }
            ]}
        >
            <Select mode='multiple' options={col_options} placeholder='请选择分区列'/>
        </Form.Item>
       
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => {
                if (engine === 'TSDB')
                    return <> 
                        <CommonSortCols col_options={col_options ?? [ ]} max={recommend_info?.sortColumnInfo?.maxOtherSortKeyNum} />
                        <Typography.Text className='other-sortkey-tip' type='secondary'>
                            {recommend_info.sortColumnInfo?.context}
                        </Typography.Text>
                
                        <Form.Item
                            name='keepDuplicates'
                            label='重复数据保留策略'
                            rules={[{ required: true, message: '请选择重复数据保留策略' }]}
                            initialValue={0}
                            tooltip={<>
                                在同一个分区内，sortColumns值相同的数据的处理策略，DolphinDB提供了三种策略
                                <br />
                                ALL：保留所有数据
                                <br />
                                LAST：仅保留最新数据
                                <br />
                                FIRST：仅保留第一条数据
                                <br />
                                建议选择ALL
                            </>}
                        >
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
