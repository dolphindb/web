import './index.scss'
import { Button, Form, Radio, Select, Space, Typography } from 'antd'
import { type RecommendInfo, type SecondStepInfo, type AdvancedInfos, type ExecuteResult } from '../type.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { CommonSortCols } from './CommonSortCols.js'
import { request } from '../../utils.js'
import { ENUM_TYPES, TIME_TYPES } from '../../constant.js'
import { t } from '../../../../i18n/index.js'

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
            .filter(item => filter_types?.includes(item.dataType))
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
            label={t('存储引擎')}
            name='engine'
            initialValue='TSDB'
            tooltip={t('存储引擎的选择与业务有关，若您的计算需求常以一定的时间跨度进行，推荐使用 TSDB 存储引擎；若您的查询常用于全量数据的密集计算，推荐使用 OLAP 存储引擎')}>
            <Radio.Group>
                <Radio value='TSDB'>TSDB</Radio>
                <Radio value='OLAP'>OLAP</Radio>
            </Radio.Group>
        </Form.Item>
        
        
        <Form.Item
            label={t('是否允许并发写入同一分区')}
            name='atomic'
            initialValue={0}
            tooltip={<>
                {t('允许并发写入同一分区，会降低写入速度，且有极小概率导致数据不一致')}
                <br />
                {t('建议不允许并发写入同一分区')}
            </>}
        >
            <Radio.Group>
                <Radio value={1}>{t('是')}</Radio>
                <Radio value={0}>{t('否')}</Radio>
            </Radio.Group>
        </Form.Item>
        
        
        <Form.Item
            label={t('分区列')}
            name='partitionColumn'
            help={t(recommend_info.partitionInfo?.context)}
            rules={[
                { required: true, message: t('请选择分区列') },
                {
                    validator: async (_, cols = [ ]) => {
                        if (cols?.length !== recommend_info.partitionInfo.partitionNum)  
                            return Promise.reject()
                        
                        const types = [ ]
                        for (let i = 0;  i < cols.length;  i++) { 
                            const col = info.first.schema.find(item => item.colName === cols[i])
                            if (col)
                                types.push(col.dataType)
                            else
                                return Promise.reject(t('表结构中无 {{name}} 列，请修改', { name: cols[i] }))
                        }
                        
                        if (info.first.isFreqIncrease) {
                            // 时序数据 第一列需为时间类型，其余列需为枚举类型
                            if (types?.[0] && !TIME_TYPES.includes(types?.[0]))
                                return Promise.reject(t('第一个分区列需为时间类型 DATE、DATETIME、TIMESTAMP 或 NANOTIMESTAMP'))
                            if (!types.slice(1).every(type => ENUM_TYPES.includes(type)))
                                return Promise.reject(t('除第一列外，其余分区列的数据类型需为 STRING、SYMBOL 或 CHAR'))
                        } else  
                            // 非时序数据，分区列必须为枚举类型
                            if (types.some(type => !ENUM_TYPES.includes(type)))
                                return Promise.reject(t('分区列的数据类型需为 STRING、SYMBOL 或 CHAR'))
                        return Promise.resolve()
                    },
                    validateTrigger: 'onChange'
                }
            ]}
        >
            <Select mode='multiple' options={partition_col_options} placeholder={t('请选择分区列')} />
        </Form.Item>
        
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => { 
                if (engine === 'TSDB' && (info?.first?.totalNum?.gap === 1 || info?.first?.totalNum?.custom > 2000000))
                    return <Form.Item name='dataTimeCol' label={t('数据时间列')} >
                        <Select options={time_options} placeholder={t('请选择数据时间列')} />
                    </Form.Item>
                else
                    return null
            } }
        </FormDependencies>
        
                           
        {/* 常用筛选列 */}
        <CommonSortCols options={common_sort_options ?? [ ]} max={recommend_info?.sortColumnInfo?.maxOtherSortKeyNum} />
        <Typography.Text className='other-sortkey-tip' type='secondary'>
            {t(recommend_info.sortColumnInfo?.context)}
        </Typography.Text>
        
       
        <FormDependencies dependencies={['engine']}>
            {({ engine }) => {
                return engine === 'TSDB' ? <> 
                    <Form.Item
                        name='keepDuplicates'
                        label={t('重复数据保留策略')}
                        rules={[{ required: true, message: t('请选择重复数据保留策略') }]}
                        initialValue={0}
                        tooltip={<>
                            {t('在同一个分区内，常用筛选列与时间列值相同的数据的处理策略，DolphinDB提供了三种策略') }
                            <br />
                            {t('ALL：保留所有数据')}
                            <br />
                            {t('LAST：仅保留最新数据')}
                            <br />
                            {t('FIRST：仅保留第一条数据')}
                        </>}
                    >
                        <Select options={keep_duplicates_options} />
                    </Form.Item>
                </>
            : null
                
        } }
        </FormDependencies>
            
        
        <Form.Item className='btn-group'>
            <Space>
                <Button onClick={back}>{t('上一步')}</Button>
                <Button loading={loading} type='primary' htmlType='submit'>{t('生成脚本')}</Button>
            </Space>
        </Form.Item>
    </Form>
}
