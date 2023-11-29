import { Button, Col, Form, Input, Radio, Row, Select, type SelectProps, Space } from 'antd'
import { useCallback, useEffect } from 'react'

import { type Variable, variables, update_variable_value } from '../Variable/variable.js'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'
import { SearchOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { safe_json_parse } from '../utils.js'
import { t } from '../../../i18n/index.js'

interface IProps { 
    ids: string[]
    cols: number
    with_search_btn: boolean
    className?: string
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
        mode='multiple'
        options={options}
        value={safe_json_parse(value)}
        onChange={on_change} />
}


function ControlField ({ variable }: { variable: Variable }) {
    const { id, mode, options, display_name } = variable
    
    const variable_obj = variables.use()
    const form = Form.useFormInstance()
    
    useEffect(() => { 
        form.setFieldValue(id, variable_obj[id].value)
    }, [variable_obj[id].value, id])
    
    switch (mode) {
        case 'date':
            return <Form.Item name={id} label={display_name}>
                <StringDatePicker />
            </Form.Item>
        case 'multi_select':
            return <Form.Item name={id} label={display_name}>
               <StringMultiSelect options={options}/>
            </Form.Item>
        case 'select':
            return <Form.Item name={id} label={display_name}>
                <Radio.Group>
                    {options.map(opt => <Radio.Button value={opt.value} key={opt.value}>{opt.label}</Radio.Button>)}
                </Radio.Group>
            </Form.Item>
        case 'text':
            return <Form.Item name={id} label={display_name}>
                <Input />
            </Form.Item>
        default:
            return null
    }
}


export function VariableForm (props: IProps) {
    const { ids = [ ], cols = 3, with_search_btn, className } = props
    
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
        <Form form={form} className='variable-form' onValuesChange={!with_search_btn && on_variables_change} labelCol={{ span: 6 }} labelAlign='left'>
            <Row gutter={[24, 16]}>
                {ids.map(id => variables_obj[id]).filter(Boolean).map(item => <Col span={24 / cols} key={item?.id}><ControlField variable={item} key={item?.id} /></Col>) }
            </Row>
        </Form>
        {
            with_search_btn && <Button type='primary' icon={<SearchOutlined />} onClick={on_search} className='search-btn'>
                {t('查询')}
            </Button> 
        }
    </div>
    
}
