import { Button, Form, Input, InputNumber, Radio, Select } from 'antd'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { ExistDBSelect } from './components/ExistedDBSelect.js'
import { CUSTOM, DAILY_INCREASE_DATA_OPTIONS } from './constant.js'
import { type IDatabaseInfo, type IFinanceInfo } from './type.js'
import { useCallback, useEffect } from 'react'
import { request } from '../utils.js'
import { t } from '../../../i18n/index.js'

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
        <Form.Item label={t('是否使用现有库')} name='isExist' initialValue={1} rules={[{ required: true, message: t('请选择是否使用现有库') }]}>
            <Radio.Group>
                <Radio value={1} onClick={() => { form.setFieldValue('name', undefined) }}>{t('是')}</Radio>
                <Radio value={0} onClick={() => { form.setFieldValue('name', undefined) }}>{t('否')}</Radio>
            </Radio.Group>
        </Form.Item>
        
        <FormDependencies dependencies={['isExist']}>
            {({ isExist }) => 
                isExist ? <Form.Item label={t('现有库')} name='name' rules={[{ required: true, message: t('请选择现有库') }]}>
                        <ExistDBSelect />
                    </Form.Item>
                :
                    <>
                        <Form.Item
                            label={t('新建库名')}
                            name='name'
                            rules={[
                                { required: true, message: t('请输入新建库名') },
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
                        <Form.Item label={t('日增量')} name={['dailyTotalNum', 'gap']} rules={[{ required: true, message: t('请选择日增量') }]}>
                            <Select options={DAILY_INCREASE_DATA_OPTIONS} placeholder={t('请选择日增量')} />
                        </Form.Item>
                        <FormDependencies dependencies={[['dailyTotalNum', 'gap']]}>
                            {value => { 
                                if (value?.dailyTotalNum?.gap === CUSTOM)
                                    return <Form.Item
                                        label={t('自定义日增数据量')}
                                        name={['dailyTotalNum', 'custom']}
                                        rules={[{ required: true, message: t('请输入日增数据量') }]}>
                                        <InputNumber placeholder={t('请输入日增数据量')} min={1} precision={0}/>
                                    </Form.Item>
                            } }
                        </FormDependencies>
                        
                        <FormDependencies dependencies={['dailyTotalNum']}>
                            {value => {
                                const { dailyTotalNum } = value
                                // 日增量小于1w不展示引擎选项
                                if (dailyTotalNum?.gap === 0 || (dailyTotalNum?.gap === CUSTOM && dailyTotalNum.custom <= 10000)) 
                                    return null
                                 else 
                                    return <Form.Item
                                        name='engine'
                                        label={t('存储引擎')}
                                        initialValue='TSDB'
                                        tooltip={t('存储引擎的选择与业务有关，若您的计算需求常以一定的时间跨度进行，推荐使用 TSDB 存储引擎；若您的查询常用于全量数据的密集计算，推荐使用 OLAP 存储引擎')}
                                        rules={[{ required: true, message: t('请选择引擎类型') }]}
                                    >
                                        <Radio.Group>
                                            <Radio value='TSDB'>TSDB</Radio>
                                            <Radio value='OLAP'>OLAP</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                }
                            }  
                        </FormDependencies>
                    </>
             }
        </FormDependencies>
        
        <Form.Item className='btn-group'>
            <Button type='primary' htmlType='submit'>{t('下一步')}</Button>
        </Form.Item>
        
        
    </Form>
}
