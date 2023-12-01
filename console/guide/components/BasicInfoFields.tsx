import './index.scss'

import { Form, Input, InputNumber, Radio, Select, type SelectProps } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { SchemaList } from './SchemaList.js'
import { GuideType } from '../iot-guide/type.js'
import { request } from '../utils.js'
import { ENUM_TYPES, TIME_TYPES } from '../constant.js'

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
        
        <Form.Item label='表名' name='tbName' rules={[{ required: true, message: '请输入表名' }]}>
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
                            {value => { 
                                const { dailyTotalNum } = value
                                if (dailyTotalNum?.gap === CUSTOM_VALUE)
                                    return <Form.Item name={['dailyTotalNum', 'custom']} label='自定义日增数据量' rules={[{ required: true, message: '请输入自定义日增数据量' }]}>
                                        <InputNumber placeholder='请输入自定义日增数据量'/>
                                    </Form.Item>
                                else
                                    return null
                            } }
                        </FormDependencies>
                    </>
                return <>
                    <Form.Item label='总数据量' name={['totalNum', 'gap']} initialValue={1} rules={[{ required: true, message: '请选择总数据量' }]}>
                        <Radio.Group>
                            <Radio value={0}> 0-100万 </Radio>
                            <Radio value={1}> 100万以上 </Radio>
                            <Radio value={CUSTOM_VALUE}>自定义</Radio>
                        </Radio.Group>
                    </Form.Item>
                    
                    <FormDependencies dependencies={[['totalNum', 'gap']]}>
                        {value => { 
                            const { totalNum } = value
                            if (totalNum?.gap === CUSTOM_VALUE)  
                                return <Form.Item label='自定义数据总量' name={['totalNum', 'custom']} rules={[{ required: true, message: '请输入自定义数据总量' }]}>
                                    <InputNumber placeholder='请输入自定义数据总量'/>
                                </Form.Item>
                        } }
                    </FormDependencies>
                
                </>
            } }
        </FormDependencies>
        
        {/* 测点数 简易版与进阶版下，只有时序数据才需要测点数 */}
        <FormDependencies dependencies={['isFreqIncrease']}>
            {({ isFreqIncrease }) => {
                // 时序数据情况下，或者数据总量大于100w 展示测点数
                if (isFreqIncrease)
                    return <Form.Item
                        tooltip='以车联网数据采集场景为例说明测点含义。一辆车有发动机、轮胎、油箱等传感器，需要采集发动机、轮胎、油箱等数据，在这个场景中，测点是车辆，而不是传感器。'
                        label='测点数'
                        name='pointNum'
                        rules={[{ required: true, message: '请输入测点数' }]}
                    >
                        <InputNumber placeholder='请输入测点数'/>
                    </Form.Item>
                else
                    return null
            }}
        </FormDependencies>
        
        <SchemaList engine='TSDB' mode='ito' is_freq_increase={is_freq_increase}/>
        
        {
            type === GuideType.SIMPLE && <FormDependencies dependencies={['isFreqIncrease', 'totalNum', 'schema']}>
                {({ isFreqIncrease, totalNum, schema = [ ] }) => {
                    // 时序数据，或者非时序数据，但是数据总量大于100w需要选常用筛选列
                    if (isFreqIncrease || totalNum.gap === 1 || totalNum.custom > 1000000) { 
                        const options = schema.filter(item => item?.colName && [...TIME_TYPES, ...ENUM_TYPES].includes(item.dataType)).map(item => ({ label: item.colName, value: item.colName }))
                        return <Form.Item
                            extra='请选择2-4个常用筛选列，时序数据第一列需为时间列，第二列需为设备编号列，非时序数据第一列需为设备编号列'
                            tooltip='常用筛选列是查询时常作为常选条件的列，越重要的过滤条件，在筛选列中的位置越靠前。'
                            name='sortColumn'
                            label='常用筛选列'
                            required
                            rules={[
                                {
                                    validator: async (_, value = [ ]) => {
                                        if (!value.length)
                                            return Promise.reject('请选择常用筛选列')
                                        
                                        const types = value.map(item => schema.find(col => col?.colName === item)?.dataType)                                    
                                        
                                        if (is_freq_increase)
                                            if (types[0] && !['DATE', 'MONTH', 'TIME', 'MINUTE', 'SECOND', 'DATETIME', 'TIMESTAMP', 'NANOTIMESTAMP'].includes(types[0]))
                                                return Promise.reject('第一个常用筛选列需为时间列')
                                            
                                        if (value?.length < 2)
                                            return Promise.reject('至少选择 2 个常用筛选列')
                                        
                                        if (value?.length > 4)
                                            return Promise.reject('最多只能选择 4 个常用筛选列')
                                            
                                    }
                                }
                            ]}
                        >
                            <Select showSearch placeholder='请选择常用筛选列' mode='multiple' options={options} />
                        </Form.Item>
                    }
                    
                } }
                
            </FormDependencies>
        }
    </>
}
