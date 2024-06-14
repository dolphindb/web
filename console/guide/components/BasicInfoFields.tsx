import './index.scss'

import { Form, Input, InputNumber, Radio, Select, type SelectProps } from 'antd'

import { useMemo } from 'react'

import { FormDependencies } from '../../components/formily/FormDependcies/index.js'

import { GuideType } from '../iot-guide/type.js'
import { check_tb_valid, request } from '../utils.js'
import { ENUM_TYPES, TIME_TYPES } from '../constant.js'
import { t } from '../../../i18n/index.js'

import { SchemaList } from './SchemaList.js'

const CUSTOM_VALUE = -1

const DAILY_INCREASE_NUM_OPTIONS: SelectProps['options'] = [
    { label: t('0 - 10 万'), value: 0 },
    { label: t('10 万 - 100 万'), value: 1 },
    { label: t('100 万 - 1000 万'), value: 2 },
    { label: t('1000 万 - 1 亿'), value: 3 },
    { label: t('1 亿 - 10 亿'), value: 4 },
    { label: t('10 亿 - 100 亿'), value: 5 },
    { label: t('100 亿以上'), value: 6 },
    { label: t('自定义'), value: CUSTOM_VALUE }
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
        // 时序数据或者非时序数据但是数据量大于 2000000
        return is_freq_increase || total_num?.gap === 1 || total_num?.custom > 2000000
    }, [is_freq_increase, total_num])
    
    
    return <>
        <Form.Item
            label={t('库名')}
            name='dbName'
            rules={[
                { required: true, message: t('请输入库名') },
                {
                    validator: async (_, val) => { 
                        const res = await request<{ isExist: 0 | 1 }>('DBMSIOT_checkDatabase', { dbName: val })
                        if (res.isExist)  
                            return Promise.reject(t('已有同名库，请修改'))
                        else
                            return Promise.resolve()
                    }
                }
            ]}>
            <Input addonBefore='dfs://' placeholder={t('请输入库名')} />
        </Form.Item>
        
        <Form.Item
            label={t('表名')}
            name='tbName'
            rules={[
                { required: true, message: t('请输入表名') },
                {
                    validator: async (_, value) => { 
                        if (value && !check_tb_valid(value))
                            return Promise.reject(t('仅支持数字、大小写字母、中文以及下划线，且必须以中文或英文字母开头'))
                        else
                            return Promise.resolve()
                    }
                }
            ]}>
            <Input placeholder={t('请输入表名')} />
        </Form.Item>
        
        <Form.Item label={t('是否为时序数据')} required name='isFreqIncrease' initialValue={1} tooltip={t('按时间顺序记录的数据')}>
            <Radio.Group>
                <Radio value={1} > {t('是')} </Radio>
                <Radio value={0} > {t('否')} </Radio>
            </Radio.Group>
        </Form.Item>
        
        {/* 数据量 */}
        <FormDependencies dependencies={['isFreqIncrease']}>
            {({ isFreqIncrease }) => { 
                if (isFreqIncrease)
                    return <>
                        <Form.Item label={t('日增数据量')} name={['dailyTotalNum', 'gap']} initialValue={0} rules={[{ required: true, message: t('请选择日增数据量') }]}>
                            <Select options={DAILY_INCREASE_NUM_OPTIONS} />
                        </Form.Item>
                        <FormDependencies dependencies={[['dailyTotalNum', 'gap']]}>
                            {({ dailyTotalNum }) => 
                                dailyTotalNum?.gap === CUSTOM_VALUE ? 
                                    <Form.Item name={['dailyTotalNum', 'custom']} label={t('自定义日增数据量')} rules={[{ required: true, message: t('请输入自定义日增数据量') }]}>
                                        <InputNumber placeholder={t('请输入自定义日增数据量')} min={1} precision={0}/>
                                    </Form.Item> : null
                             }
                        </FormDependencies>
                    </>
                return <>
                    <Form.Item label={t('总数据量')} name={['totalNum', 'gap']} initialValue={1} rules={[{ required: true, message: '请选择总数据量' }]}>
                        <Radio.Group>
                            <Radio value={0}> {t('0 - 200 万')} </Radio>
                            <Radio value={1}> {t('200 万以上')} </Radio>
                            <Radio value={CUSTOM_VALUE}>{t('自定义')}</Radio>
                        </Radio.Group>
                    </Form.Item>
                    
                    <FormDependencies dependencies={[['totalNum', 'gap']]}>
                        {({ totalNum }) =>  
                            (totalNum?.gap === CUSTOM_VALUE) ? <Form.Item label={t('自定义数据总量')} name={['totalNum', 'custom']} rules={[{ required: true, message: t('请输入自定义数据总量') }]}>
                                <InputNumber placeholder={t('请输入自定义数据总量')} min={1} precision={0}/>
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
                isFreqIncrease
                    ? <Form.Item
                        tooltip={t('以车联网数据采集场景为例说明测点含义。一辆车有发动机、轮胎、油箱等传感器，需要采集发动机、轮胎、油箱等数据，在这个场景中，测点是车辆，而不是传感器。') }
                        label={t('测点数') }
                        name='pointNum'
                        rules={[{ required: true, message: t('请输入测点数') }]}
                    >
                        <InputNumber placeholder={t('请输入测点数')} min={1} precision={0}/>
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
                            help={t('请选择两个常用筛选列，时序数据或者数据总量大于 200 万的非时序第一列需为时间列，第二列需为设备编号列')}
                            tooltip={t('常用筛选列是查询时常作为常选条件的列，越重要的过滤条件，在筛选列中的位置越靠前。')}
                            name='sortColumn'
                            label={t('常用筛选列')}
                            required
                            rules={[
                                {
                                    validator: async (_, value = [ ]) => {
                                        if (!value.length)
                                            return Promise.reject()
                                        
                                        let types = [ ]
                                        for (let i = 0;  i < value.length;  i++) { 
                                            const col = schema.find(item => item.colName === value[i])
                                            if (!col && value[i])
                                                return Promise.reject(t('表结构中无 {{name}} 列，请修改', { name: value[i] }))
                                            else
                                                types.push(col.dataType)
                                        }                                  
                                        
                                        if (types?.[0] && !TIME_TYPES.includes(types[0]))
                                            return Promise.reject(t('第一个常用筛选列必须为时间类型（DATE、DATETIME、TIMESTAMP、NANOTIMESTAMP）'))
                                        
                                        if (types.length !== 2)
                                            return Promise.reject(t('请选择两个常用筛选列'))
                                        
                                        if (types?.[1] && !ENUM_TYPES.includes(types?.[1]))
                                            return Promise.reject()    
                                    }
                                }
                            ]}
                        >
                            <Select 
                                showSearch 
                                placeholder={t('请选择常用筛选列')}
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
