import { Form, Input, Radio, Space } from 'antd'
import { useCallback, useEffect } from 'react'

import { type Variable, variables, update_variable_value } from '../Variable/variable.js'
import { StringDatePicker } from '../../components/StringDatePicker/index.js'

interface IProps { 
    ids: string[]
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
    const { ids } = props
    
    const [form] = Form.useForm()
    
    const variables_obj =  variables.use()
    
       
    const on_variables_change = useCallback((changed_values: any) => { 
        Object.entries(changed_values).forEach(([key, value]) => { 
            update_variable_value(key, value as string)
        })
    }, [ ])
    
    
    return <Form form={form} onValuesChange={on_variables_change}>
        <Space size='large'>
            {ids.map(id => variables_obj[id]).filter(Boolean).map(item => <ControlField variable={item} key={item?.id} />)}
        </Space>
    </Form>
}
