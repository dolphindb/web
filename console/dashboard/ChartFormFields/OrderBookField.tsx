import './index.scss'

import { useMemo } from 'react'
import { Form, Select, Input, Collapse, Button, Space, Divider, InputNumber } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'

import { t } from '../../../i18n/index.js'

import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { convert_list_to_options } from '../utils.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' }) { 
    const { variable_infos } = variables.use(['variable_infos'])
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            <Form.Item name='title_size' label='标题字号' initialValue={18}>
                <InputNumber addonAfter='px' />
            </Form.Item>
            
            <Form.Item name='variable_ids' label={t('关联变量')}>
                <Select mode='multiple' options={variable_infos.map(variable_info => ({
                    label: variable_info.name,
                    value: variable_info.id
                }))} />
            </Form.Item>
            
            
            <FormDependencies dependencies={['variable_ids']}>
                {
                    ({ variable_ids }) => { 
                        if (!variable_ids?.length)
                            return null
                        return <>
                            <Form.Item  name='variable_cols' label='每行变量数' initialValue={3}>
                                <Select options={convert_list_to_options([1, 2, 3, 4, 6, 8, 12])} allowClear />
                            </Form.Item>
                            <Form.Item name='with_search_btn' label='查询按钮' initialValue={false} tooltip='不展示查询按钮的情况，表单更新即会进行查询，在变量设置较多的情况下，建议使用查询按钮，点击之后再运行数据源代码'>
                                <BoolRadioGroup />
                            </Form.Item>
                        
                        </>
                    }
                }
            </FormDependencies>
            
            
            <Form.Item name='with_legend' label={t('图例')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                <BoolRadioGroup />
            </Form.Item>
            <Form.Item name='with_split_line' label={t('Y 轴分割线')} initialValue={false}>
                <BoolRadioGroup />
            </Form.Item>
        </div>
    }, [ type, variable_infos ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}

export function OrderFormFields () {
    const FormFields = useMemo(() => { 
        return  <>
            <Form.Item label={t('倍率')} name='time_rate' initialValue={100}>
                <Input type='number'/>
            </Form.Item>
        </>
    }, [ ])
    return <Collapse items={[
        {
            key: 'series',
            label: t('订单图'),
            children: FormFields,
            forceRender: true,
        }
    ]} />
}


