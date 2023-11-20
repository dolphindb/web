import './index.scss'
import { Button, Form, Radio, Select, Space, Typography } from 'antd'
import { type RecommendInfo, type BasicInfoFormValues, type SecondStepInfo, type AdvancedInfos } from '../type.js'
import { useCallback, useEffect, useMemo } from 'react'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { model } from '../../model.js'
import { CommonSortCols } from './CommonSortCols.js'

interface IProps { 
    info: AdvancedInfos
    recommend_info: RecommendInfo
    back: () => void
    go:  (info: AdvancedInfos, code?: string) => void
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
    
    const col_options = useMemo(() =>
        info.first?.schema?.map(item => ({ label: item.colName, value: item.colName })),
        [info])
    
    useEffect(() => { 
        if (info?.second)
            form.setFieldsValue(info.second)
    }, [info?.second])
    
    
    const on_submit = useCallback(async () => { 
        const form_values = form.getFieldsValue()
        // TODO: 校验常用筛选列配置
        const data = await model.ddb.call('', [JSON.stringify({ otherSortKeys: form_values.otherSortKeys })])
        // @ts-ignore
        if (data.isValid) {
            // 校验通过，生成脚本，进入脚本预览
            const params = { ...info.first, ...form_values }
            // @ts-ignore
            const { code } = await model.ddb.call('createDB2', [JSON.stringify(params)])
            go({ second: form_values }, code)
        } else { 
            // 校验未通过，弹窗告知推荐配置
        }
    }, [ ])
    
    return <Form
        form={form}
        onFinish={on_submit}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
    >
        <Form.Item label='分区列' name='partitionColumn' initialValue={recommend_info?.partitionCols?.cols ?? [ ]} rules={[{ required: true, message: '请选择分区列' }]}>
            <Select mode='multiple' options={col_options} placeholder='请选择分区列'/>
        </Form.Item>
        
        <Form.Item label='是否允许并发写入同一分区' name='actomic' initialValue={0}>
            <Radio.Group>
                <Radio value={1}>是</Radio>
                <Radio value={0}>否</Radio>
            </Radio.Group>
        </Form.Item>
        
        <Form.Item label='常用查询时间跨度' name='commQueryDuration' initialValue='daily'>
            <Radio.Group>
                <Radio value='hour'>小时</Radio>
                <Radio value='daily'>天</Radio>
                <Radio value='month'>月</Radio>
            </Radio.Group>
        </Form.Item>
        
        <Form.Item label='存储引擎' name='engine' initialValue='TSDB'>
            <Radio.Group>
                <Radio value='TSDB'>TSDB</Radio>
                <Radio value='OLAP'>OLAP</Radio>
            </Radio.Group>
        </Form.Item>
        
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => {
                if (engine === 'TSDB')
                    return <>
                        {/* <div className='sort-cols-wrapper'>
                            <h3>常用筛选列</h3>
                            <Form.List name='otherSortKeys' initialValue={[{ }]}>
                                {(fields, { add, remove }) => <>
                                    {fields.map(field => <div key={field.name} className='sort-col-item'>
                                            <Form.Item label='列名' name='colName' rules={[{ required: true, message: '请选择列名' }]}  labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                                                <Select options={col_options}/>
                                            </Form.Item>
                                            <Form.Item label='唯一值数量' name='uniqueValueNum' rules={[{ required: true, message: '请填入唯一值数量' }] } labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                                                <InputNumber/>
                                            </Form.Item>
                                            <Form.Item label='降维桶数' name='hashMapNum' labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                                                <InputNumber />
                                            </Form.Item>
                                            { fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) } } /> }
                                    </div>)}
                                    {fields.length < recommend_info?.otherSortKeys?.max &&  <Button onClick={() => { add() } } block type='dashed' icon={<PlusCircleOutlined />}>增加筛选列</Button> }
                                </>}
                            </Form.List>
                        </div> */}
                        {
                            recommend_info?.otherSortKeys?.show && <>
                                <CommonSortCols col_options={col_options ?? [ ]} max={recommend_info.otherSortKeys?.max} mode='common'/>
                                <Typography.Text className='other-sortkey-tip' type='secondary'>
                                    除时间列和设备id列外，请选择查询时常用于过滤筛选的列，结合您上述提供的信息，最多能选择{recommend_info?.otherSortKeys?.max}列，
                                    常用的筛选列与sortKey相关，在每个分区内，系统会根据分区内的sortKey对数据进行排序
                                </Typography.Text>
                            </>
                        
                        }
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
                <Button type='primary' htmlType='submit'>生成脚本</Button>
            </Space>
        </Form.Item>
    </Form>
}
