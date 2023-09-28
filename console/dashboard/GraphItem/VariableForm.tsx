import { DatePicker, Form, Input, Radio, Space } from 'antd'
import { useCallback, useEffect, useMemo } from 'react'

import { type Variable, variables, update_variable_value, type Variables } from '../Variable/variable.js'

interface IProps { 
    names: string[]
}


function ControlField ({ variable }: { variable: Variable }) {
    const { mode, name, options, display_name } = variable
    
    const variable_obj = variables.use()
    const form = Form.useFormInstance()
    
    useEffect(() => { 
        form.setFieldValue(name, variable_obj[name].value)
    }, [variable_obj[name].value, name])
    
    switch (mode) {
        case 'time':
            return <Form.Item name={name} label={display_name}>
                <DatePicker />
            </Form.Item>
        case 'select':
            return <Form.Item name={name} label={display_name}>
                <Radio.Group>
                    {options.map(opt => <Radio.Button value={opt.value} key={opt.value}>{opt.label}</Radio.Button>)}
                </Radio.Group>
            </Form.Item>
        case 'text':
            return <Form.Item name={name} label={display_name}>
                <Input />
            </Form.Item>
        default:
            return null
    }
}


export function VariableForm (props: IProps) {
     
    const { names } = props
    
    const [form] = Form.useForm()
    
    const variables_obj =  variables.use()
    
    const used_variables = useMemo<Variable[]>(() =>
        // @ts-ignore
        names.map(name => variables_obj[name])
        , [names, variables_obj])
    
    
    const on_variables_change = useCallback((_, values) => { 
        Object.entries(values).forEach(([key, value]) => { 
            update_variable_value(key, value as string)
        })
    }, [ ])
    
    return <Form form={form} onValuesChange={on_variables_change}>
        <Space size='large'>
            {used_variables.map(item => <ControlField variable={item} key={item.id} />)}
        </Space>
    </Form>
}
