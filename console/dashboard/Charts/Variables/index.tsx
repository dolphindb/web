import './index.scss'

import { Collapse, Form, Input, InputNumber, Select } from 'antd'
import { VariableForm } from '../../GraphItem/VariableForm.js'
import { FormDependencies } from '../../../components/formily/FormDependcies/index.js'
import { variables } from '../../Variable/variable.js'
import { convert_list_to_options } from '../../utils.js'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { type Widget } from '../../model.js'
import { useMemo } from 'react'

interface IProps { 
    widget: Widget
    data_source: any
}

interface IVariableConfig { 
    title?: string
    title_size: number
    variable_ids?: string[]
    variable_cols: number
    with_search_btn: boolean
}
export function Variables (props: IProps) { 
    
    const { widget } = props
    
    const config = useMemo(() => widget.config as IVariableConfig, [widget.config])
    
    return <>
        {config.title && <div className='variable-title' style={{ fontSize: config.title_size ?? 18, fontWeight: 500 }}>{config.title}</div>}
        <VariableForm className='variable-chart-wrapper' ids={config.variable_ids} cols={config.variable_cols} with_search_btn={config.with_search_btn} />
    </>
    
}

export function VariablesConfigForm () { 
    
    const { variable_infos } = variables.use(['variable_infos'])
    
    return <div className='variable-config-form'>
        <Collapse items={[
            {
                key: 'basic',
                label: '基础配置',
                forceRender: true,
                children: <>
                    <Form.Item name='title' label='标题' initialValue='标题'>
                        <Input />
                    </Form.Item>
                    
                    <Form.Item name='title_size' label='标题字号' initialValue={18}>
                        <InputNumber addonAfter='px'/>
                    </Form.Item>
                </>
            },
            {
                key: 'variable',
                label: '变量配置',
                forceRender: true,
                children: <>
                    <Form.Item name='variable_ids' label='关联变量'>
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
                
                </>
            }]}
        />
    </div>
}
