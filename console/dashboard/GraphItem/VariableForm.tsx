import './index.scss'
import { Button, Col, Form, Input, Row, Select, type SelectProps } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import classNames from 'classnames'

import { genid } from 'xshell/utils.browser'

import { type Variable, variables, update_variable_value } from '../Variable/variable.js'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'
import { safe_json_parse } from '../utils.js'


import { VariableMode } from '../type.js'

interface IProps { 
    ids: string[]
    cols: number
    with_search_btn: boolean
    search_btn_label: string
    className?: string
    label_col?: number
}

interface IStringMultiSelectProps { 
    value?: string
    onChange?: (val: string) => void
    options: SelectProps['options']
}

function StringMultiSelect (props: IStringMultiSelectProps) {
    const { options, onChange, value } = props
    
    const on_change = useCallback(val => { 
        onChange(JSON.stringify(val))
    }, [ ])
    
    return <Select
        allowClear
        mode='multiple'
        options={options}
        value={safe_json_parse(value)}
        onChange={on_change} />
}


function ControlField ({ variable }: { variable: Variable }) {
    const { id, mode, options, display_name } = variable
    
    const variable_obj = variables.use()
    const form = Form.useFormInstance()
    const [key, set_key] = useState(genid())
    
    useEffect(() => { 
        form.setFieldValue(id, variable_obj[id].mode === 'multiple' ? safe_json_parse(variable_obj[id].value) : variable_obj[id].value)
    }, [variable_obj[id].value, id])
    
    switch (mode) {
        case VariableMode.DATE:
            return <Form.Item name={id} label={display_name}>
                <StringDatePicker allowClear className='data-picker'/>
            </Form.Item>
        case VariableMode.MULTI_SELECT:
            return <Form.Item name={id} label={display_name}>
               <StringMultiSelect options={options}/>
            </Form.Item>
        case VariableMode.SELECT:
            return <Form.Item name={id} label={display_name}>
                {/* https://github.com/ant-design/ant-design/issues/38244 */}
                {/* 拖拽元素下， select 下拉列表会有闪烁问题，每次选择之后更新 key，强制重新渲染，可解决闪烁问题 */}
                <Select
                    key={key}
                    onSelect={() => { set_key(genid()) } }
                    options={options}
                    allowClear
                />
            </Form.Item>
        case VariableMode.TEXT:
            return <Form.Item name={id} label={display_name}>
                <Input />
            </Form.Item>
        default:
            return null
    }
}


export function VariableForm (props: IProps) {
    const { ids = [ ], cols = 3, with_search_btn, className, search_btn_label, label_col } = props
    
    const [form] = Form.useForm()
    
    const variables_obj =  variables.use()
    
    const on_variables_change = useCallback((changed_values: any) => { 
        update_variable_value(changed_values)
    }, [ ])
    
    const on_search = useCallback(() => { 
        const values = form.getFieldsValue()
        update_variable_value(values)
    }, [ ])
    
    return !!ids.length && <div className={classNames('variable-wrapper', { [className]: true })}>
        <Form form={form} className='variable-form' onValuesChange={!with_search_btn && on_variables_change} labelCol={{ span: label_col }} labelAlign='left'>
            <Row gutter={[24, 16]}>
                {ids.map(id => variables_obj[id]).filter(Boolean).map(item => <Col span={24 / cols} key={item?.id}><ControlField variable={item} key={item?.id} /></Col>) }
            </Row>
        </Form>
        {
            with_search_btn && <Button type='primary' onClick={on_search} className='search-btn'>
                {search_btn_label || '查询' }
            </Button> 
        }
    </div>
    
}
