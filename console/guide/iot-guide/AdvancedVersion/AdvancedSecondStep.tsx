import './index.scss'
import { Button, Form, Radio, Select, Space, Typography } from 'antd'
import { type RecommendInfo, type SecondStepInfo, type AdvancedInfos, type ExecuteResult } from '../type.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { CommonSortCols } from './CommonSortCols.js'
import { request } from '../../utils.js'
import { ENUM_TYPES, TIME_TYPES } from '../../constant.js'

interface IProps { 
    info: AdvancedInfos
    recommend_info: RecommendInfo
    back: () => void
    go: (infos: AdvancedInfos & { result?: ExecuteResult }) => void
    update_info: (info: AdvancedInfos) => void
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
    const { info, recommend_info, go, back, update_info } = props
    const [form] = Form.useForm<SecondStepInfo>()
    const [loading, set_loading] = useState(false)
    
    const partition_col_options = useMemo(() => {
        // 时序数据只能选时间类型和枚举类型，非时序数据只能选枚举类型
        const filter_types = info?.first?.isFreqIncrease ? [...TIME_TYPES, ...ENUM_TYPES] : ENUM_TYPES
        return info.first.schema
            .filter(item => filter_types.includes(item.dataType))
            .map(({ colName }) => ({ label: colName, value: colName }))    
     }, [info.first?.schema, info?.first?.isFreqIncrease])
    
    // 高阶 常用筛选列只能选择枚举类型
    const common_sort_options = useMemo(() => { 
        return info.first.schema
            .filter(item => ENUM_TYPES.includes(item.dataType))
            .map(item => ({ label: item.colName, value: item.colName }))
    }, [info.first.schema])
    
    // 数据时间列选项
    const time_options = useMemo(() => { 
        return info.first.schema
        .filter(item => TIME_TYPES.includes(item.dataType))
        .map(item => ({ label: item.colName, value: item.colName }))
    }, [ info.first.schema ])
    
    const on_submit = useCallback(async values => { 
        set_loading(true)
        const code = await request<string>('DBMSIOT_createDB2', { ...info.first, ...values })
        go({ code,  second: values })
        set_loading(false)
    }, [go])
    
    return <Form
        form={form}
        onFinish={on_submit}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={info?.second}
        onValuesChange={(_, values) => {
            update_info({ second: values })
        }}
    >
        <Form.Item
            label='存储引擎'
            name='engine'
            initialValue='TSDB'
            tooltip={<>
                存储引擎的选择与业务有关，若您的计算需求常以一定的时间跨度进行，推荐使用 TSDB 存储引擎；若您的查询常用于全量数据的密集计算，推荐使用 OLAP 存储引擎
                <br />
                建议使用 TSDB 存储引擎
            </>}>
            <Radio.Group>
                <Radio value='TSDB'>TSDB</Radio>
                <Radio value='OLAP'>OLAP</Radio>
            </Radio.Group>
        </Form.Item>
        
        
        <Form.Item
            label='是否允许并发写入同一分区'
            name='atomic'
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
                    validator: async (_, cols = [ ]) => {
                        console.log(recommend_info, cols, 'info')
                        if (cols?.length !== recommend_info.partitionInfo.partitionNum)  
                            return Promise.reject(new Error('您选择的分区列个数与推荐个数不一致，请修改'))
                        
                        const types = [ ]
                        for (let i = 0;  i < cols.length;  i++) { 
                            const col = info.first.schema.find(item => item.colName === cols[i])
                            if (col)
                                types.push(col.dataType)
                            else
                                return Promise.reject(`表结构中无 ${cols[i]} 列，请修改`)
                        }
                        
                        if (info.first.isFreqIncrease) {
                            // 时序数据 第一列需为时间类型，其余列需为枚举类型
                            if (types?.[0] && !TIME_TYPES.includes(types?.[0]))
                                return Promise.reject(`第一个分区列需为时间类型（${TIME_TYPES.join('、')}）`)
                            if (!types.slice(1).every(type => ENUM_TYPES.includes(type)))
                                return Promise.reject(`除第一列外，其余分区列的数据类型需为 ${ENUM_TYPES.join('、')}`)
                        } else  
                            // 非时序数据，分区列必须为枚举类型
                            if (types.some(type => !ENUM_TYPES.includes(type)))
                                return Promise.reject(`分区列的数据类型需为 ${ENUM_TYPES.join('、')}`)
                        return Promise.resolve()
                    },
                    validateTrigger: 'onChange'
                }
            ]}
        >
            <Select mode='multiple' options={partition_col_options} placeholder='请选择分区列'/>
        </Form.Item>
        
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => { 
                if (engine === 'TSDB' && (info?.first?.totalNum?.gap === 1 || info?.first?.totalNum?.custom > 2000000))
                    return <Form.Item name='dataTimeCol' label='数据时间列' >
                        <Select options={time_options} placeholder='请选择数据时间列'/>
                    </Form.Item>
                else
                    return null
            } }
        </FormDependencies>
        
                           
        {/* 常用筛选列 */}
        <CommonSortCols options={common_sort_options ?? [ ]} max={recommend_info?.sortColumnInfo?.maxOtherSortKeyNum} />
        <Typography.Text className='other-sortkey-tip' type='secondary'>
            {recommend_info.sortColumnInfo?.context}
        </Typography.Text>
        
       
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => {
                if (engine === 'TSDB')
                    return <> 
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
