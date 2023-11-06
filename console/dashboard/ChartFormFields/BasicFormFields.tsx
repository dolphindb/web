import './index.scss'

import { Collapse, Form, Input, InputNumber, Select } from 'antd'

import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { convert_list_to_options } from '../utils.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'

export function VariableSetting () { 
    const { variable_infos } = variables.use(['variable_infos'])
   
    return <div className='axis-wrapper'>
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
    </div>
}


export function PaddingSetting () { 
    return <>
        <Form.Item name={['padding', 'top']} label='上内边距' initialValue={12}>
                <InputNumber addonAfter='px'/>
            </Form.Item>
            
            <Form.Item name={['padding', 'bottom']} label='下内边距' initialValue={12}>
                <InputNumber addonAfter='px'/>
            </Form.Item>
            <Form.Item name={['padding', 'left']} label='左内边距' initialValue={12}>
                <InputNumber addonAfter='px'/>
            </Form.Item>
            
            <Form.Item name={['padding', 'right']} label='左内边距' initialValue={12}>
                <InputNumber addonAfter='px'/>
            </Form.Item>
    </>
}

export function BasicFormFields ({ type }: { type?: 'chart' | 'table' | 'description' }) { 
    const FormFields = useMemo(() => { 
        return  <div className='axis-wrapper'>
            <Form.Item name='title' label={t('标题')} initialValue={t('标题')}>
                <Input />
            </Form.Item>
            
            <Form.Item name='title_size' label='标题字号' initialValue={18}>
                <InputNumber addonAfter='px'/>
            </Form.Item>
            
            <PaddingSetting />
            
            
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
                <Form.Item name='is_reverse' label='倒序展示' tooltip='流数据开启此功能可将最新的数据插入到表格头部' initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
                
                <Form.Item tooltip='启用此选项之后，会在表格内层滚动' name='abandon_scroll' label='禁止滚动' initialValue={false} >
                    <BoolRadioGroup />
                </Form.Item>
            </>}
        </div>
    }, [type])
    
    return <Collapse items={[{
            key: 'basic',
            label: t('基本属性'),
            children: FormFields,
            forceRender: true
        },
        {
            key: 'variable',
            label: t('变量设置'),
            children: <VariableSetting />, 
            forceRender: true
        }
    ]} />
}




