import { DatePicker, Form, Input, Radio, Space } from 'antd'
import { useCallback, useMemo } from 'react'
import { dashboard } from '../model.js'
import { type Variable } from '../Variable/variable'

interface IProps { 
    ids: string[]
}


function ControlField ({ variable }: { variable: Variable }) {
    const { mode, name, options, display_name } = variable
    
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
    const { variables } = dashboard.use(['variables'])
    const { ids } = props
    
    const [form] = Form.useForm()
    
    const used_variables = useMemo<Variable[]>(() =>
        variables.filter(item => ids.includes(item.id))
        , [variables, ids])
    
    
    const on_variables_change = useCallback((_, values) => { 
        // TODO: 更新变量
        console.log(values, 'values')
    }, [ ])
    
    return <Form form={form} onValuesChange={on_variables_change}>
        <Space size='large'>
            {used_variables.map(item => <ControlField variable={item} key={item.id} />)}
        </Space>
    </Form>
}
