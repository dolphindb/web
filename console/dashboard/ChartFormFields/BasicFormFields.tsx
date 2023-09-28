import './index.scss'

import { Collapse, Form, Input, InputNumber, Select } from 'antd'

import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'

export function BasicFormFields ({ type }: { type: 'chart' | 'table' | 'description' }) { 
    
    const { variable_names } = variables.use(['variable_names'])
    
    console.log(variable_names)
    
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            
            <Form.Item name='title_size' label='标题字号'>
                <InputNumber addonAfter='px'/>
            </Form.Item>
            
            <Form.Item name='variable_names' label={t('关联变量')}>
                <Select mode='multiple' options={variable_names.map(item => ({
                    label: item,
                    value: item
                }))} />
            </Form.Item>
            
            {type === 'chart' && <>
                <Form.Item name='with_legend' label={t('图例')} initialValue>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='with_tooltip' label={t('提示框')} initialValue>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='x_datazoom' label={t('X 轴缩略轴')} initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='y_datazoom' label={t('Y 轴缩略轴')} initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='with_split_line' label='展示网格线' initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
            </>}
            
            {type === 'table' && <>
                <Form.Item initialValue={false} name='bordered' label={t('展示边框')}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item initialValue name='need_select_cols' label={t('展示列选择')}>
                    <BoolRadioGroup />
                </Form.Item>
            </>}
        </div>
    }, [ type, variable_names ])
    
    return <Collapse items={[{
        key: 'basic',
        label: t('基本属性'),
        children: FormFields,
        forceRender: true
     }]} />
}




