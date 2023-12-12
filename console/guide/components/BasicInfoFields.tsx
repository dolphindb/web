import './index.scss'

import { Form, Input, InputNumber, Radio, Select, type SelectProps } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { SchemaList } from './SchemaList.js'
import { GuideType } from '../iot-guide/type.js'
import { check_tb_valid, request } from '../utils.js'
import { ENUM_TYPES, TIME_TYPES } from '../constant.js'
import { useMemo } from 'react'

const CUSTOM_VALUE = -1

const DAILY_INCREASE_NUM_OPTIONS: SelectProps['options'] = [
    { label: '0-10万', value: 0 },
    { label: '10万-100万', value: 1 },
    { label: '100万-1000万', value: 2 },
    { label: '1000万-1亿', value: 3 },
    { label: '1亿-10亿', value: 4 },
    { label: '10亿-100亿', value: 5 },
    { label: '100亿以上', value: 6 },
    { label: '自定义', value: CUSTOM_VALUE }
]

interface IProps { 
    type: GuideType
}


export function BasicInfoFields (props: IProps) {
    const { type = GuideType.SIMPLE } = props
    /** 简易版：
          非时序数据，无测点数和常用筛选列
          常用筛选列最大选四个，无推荐 */
    const form = Form.useFormInstance()
    const is_freq_increase = Form.useWatch('isFreqIncrease', form)
    const total_num = Form.useWatch('totalNum', form) 
    
    const need_time_col = useMemo(() => { 
        // 时序数据或者非时序数据但是数据量大于2000000
        return is_freq_increase || total_num?.gap === 1 || total_num?.custom > 2000000
    }, [ is_freq_increase, total_num ])
    
    return <>
        <Form.Item
            label='库名'
            name='dbName'
            rules={[
                { required: true, message: '请输入库名' },
                {
                    validator: async (_, val) => { 
                        const res = await request<{ isExist: 0 | 1 }>('DBMSIOT_checkDatabase', { dbName: val })
                        if (res.isExist)  
                            return Promise.reject('已有同名库，请修改')
                        else
                            return Promise.resolve()
                    }
                }
            ]}>
            <Input addonBefore='dfs://' placeholder='请输入库名'/>
        </Form.Item>
        
        <Form.Item
            label='表名'
            name='tbName'
            rules={[
                { required: true, message: '请输入表名' },
                {
                    validator: async (_, value) => { 
                        if (value && !check_tb_valid(value))
                            return Promise.reject('表名首字母为数字、"."、"/"和"*"，且不能包含空格')
                        else
                            return Promise.resolve()
                    }
                }
            ]}>
            <Input placeholder='请输入表名'/>
        </Form.Item>
        
        <Form.Item label='是否为时序数据' required name='isFreqIncrease' initialValue={1} tooltip='按时间顺序记录的数据'>
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
                            {({ dailyTotalNum }) => 
                                dailyTotalNum?.gap === CUSTOM_VALUE ? 
                                    <Form.Item name={['dailyTotalNum', 'custom']} label='自定义日增数据量' rules={[{ required: true, message: '请输入自定义日增数据量' }]}>
                                        <InputNumber placeholder='请输入自定义日增数据量'/>
                                    </Form.Item> : null
                             }
                        </FormDependencies>
                    </>
                return <>
                    <Form.Item label='总数据量' name={['totalNum', 'gap']} initialValue={1} rules={[{ required: true, message: '请选择总数据量' }]}>
                        <Radio.Group>
                            <Radio value={0}> 0-200万 </Radio>
                            <Radio value={1}> 200万以上 </Radio>
                            <Radio value={CUSTOM_VALUE}>自定义</Radio>
                        </Radio.Group>
                    </Form.Item>
                    
                    <FormDependencies dependencies={[['totalNum', 'gap']]}>
                        {({ totalNum }) =>  
                            (totalNum?.gap === CUSTOM_VALUE) ? <Form.Item label='自定义数据总量' name={['totalNum', 'custom']} rules={[{ required: true, message: '请输入自定义数据总量' }]}>
                                    <InputNumber placeholder='请输入自定义数据总量'/>
                                </Form.Item> : null
                        }
                    </FormDependencies>
                
                </>
            } }
        </FormDependencies>
        
        {/* 测点数 简易版与进阶版下，只有时序数据才需要测点数 */}
        <FormDependencies dependencies={['isFreqIncrease']}>
            {({ isFreqIncrease }) => 
                // 时序数据情况下，或者数据总量大于100w 展示测点数
                isFreqIncrease ? <Form.Item
                        tooltip='以车联网数据采集场景为例说明测点含义。一辆车有发动机、轮胎、油箱等传感器，需要采集发动机、轮胎、油箱等数据，在这个场景中，测点是车辆，而不是传感器。'
                        label='测点数'
                        name='pointNum'
                        rules={[{ required: true, message: '请输入测点数' }]}
                    >
                        <InputNumber placeholder='请输入测点数'/>
                    </Form.Item>
                : null
            }
        </FormDependencies>
        
        <SchemaList engine='TSDB' mode='ito' need_time_col={need_time_col} />
        
        {
            type === GuideType.SIMPLE && <FormDependencies dependencies={['isFreqIncrease', 'totalNum', 'schema']}>
                {({ isFreqIncrease, totalNum, schema = [ ] }) => 
                    // 时序数据，或者非时序数据，但是数据总量大于200w需要选常用筛选列
                    isFreqIncrease || totalNum.gap === 1 || totalNum.custom > 2000000 ? <Form.Item
                            extra='请选择两个常用筛选列，时序数据或者数据总量大于200万的非时序第一列需为时间列，第二列需为设备编号列，其余情况第一列需为设备编号列'
                            tooltip='常用筛选列是查询时常作为常选条件的列，越重要的过滤条件，在筛选列中的位置越靠前。'
                            name='sortColumn'
                            label='常用筛选列'
                            required
                            rules={[
                                {
                                    validator: async (_, value = [ ]) => {
                                        if (!value.length)
                                            return Promise.reject('请选择常用筛选列')
                                        
                                        let types = [ ]
                                        for (let i = 0;  i < value.length;  i++) { 
                                            const col = schema.find(item => item.colName === value[i])
                                            if (!col && value[i])
                                                return Promise.reject(`表结构中无 ${value[i]} 列，请修改`)
                                            else
                                                types.push(col.dataType)
                                        }                                  
                                        
                                        if (types?.[0] && !TIME_TYPES.includes(types[0]))
                                            return Promise.reject('第一个常用筛选列必须为时间类型（DATE、DATETIME、TIMESTAMP、NANOTIMESTAMP）')
                                        
                                        if (types.length !== 2)
                                            return Promise.reject('请选择两个常用筛选列')
                                        
                                        if (types?.[1] && !ENUM_TYPES.includes(types?.[1]))
                                            return Promise.reject('第二个常用筛选列必须为枚举类型（CHAR、SYMBOL、STRING）')    
                                    }
                                }
                            ]}
                        >
                            <Select 
                                showSearch 
                                placeholder='请选择常用筛选列' 
                                mode='multiple' 
                                options={schema.filter(
                                    item => item?.colName && 
                                        [...TIME_TYPES, ...ENUM_TYPES].
                                            includes(item.dataType)).
                                                map(item => ({ label: item.colName, value: item.colName }))} />
                        </Form.Item> : null
                 }
                
            </FormDependencies>
        }
    </>
}
