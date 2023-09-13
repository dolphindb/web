import { Button, Collapse, Form, Input, Select, Switch } from 'antd'

export type PropsType = {
    setting_option: SettingOption[]
}
export type SettingOption = {
    key: string | number
    label: string
    children: OptionItem[]
}
type OptionItem = (InputOption | SelectOption | SwitchOption) & { type: string }

type InputOption = {
    title: string
    value: string | number
    name: string
}

type SelectOption = {
    title: string
    options: {
        lable: string
        value: string | number | boolean
    }[]
    value: string | number | boolean
    name: string
}

type SwitchOption = {
    title: string
    value: boolean
    name: string
}

const componetMap = {
    Input: InputComp,
    Select: SelectComp,
    Switch: SwitchComp
}

function InputComp ({ title, value, name }: InputOption) {
    return <Form.Item label={title} name={name}><Input /></Form.Item>
}

function SelectComp ({ title, value, options }: SelectOption) {
    return <Form.Item label={title}>
        <Select options={options} />
    </Form.Item>
}

function SwitchComp ({ title, value, name }: SwitchOption) {
    return <Form.Item label={title} name={name}>
        <Switch />
    </Form.Item>
}

function ComponentItem ({ type, ...config }: OptionItem) {
    const Component = componetMap[type]
    return <Component {...config} />
}


export function GraphSetting ({ setting_option }: PropsType) {
    const setting_collapsse = setting_option.map(item => {
        return {
            ...item,
            children: item.children.map(option => {
                return <ComponentItem {...option} key={option.name}/>
            })
        }
    })
    
    const onFinish = (values: any) => {
        console.log(values)
    }
    return <Form
        name='basic'
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 16 }}
        initialValues={{ remember: true }}
        autoComplete='off'
        size='small'
        onFinish={onFinish}
    >
        <Collapse ghost expandIconPosition='end' items={setting_collapsse} />
        
        <Form.Item>
            <Button type='primary' htmlType='submit'>
            Submit
            </Button>
            
        </Form.Item>
    </Form>
}
