import './index.scss'

import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, InputNumber, Select } from 'antd'
import { type SelectProps } from 'antd/lib'

interface IProps {
    mode?: 'common' | 'readonly'
    initial_value?: any
    col_options: SelectProps['options']
}

export function CommonSortCols (props: IProps) {
    const { col_options } = props
    
    return <div className='sort-cols-wrapper'>
        <h4>常用筛选列</h4>
        <Form.List name='otherSortKeys' initialValue={[{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field =>
                    <div key={field.name} className='sort-col-item'>
                        <Form.Item
                            label='列名'
                            name={[field.name, 'colName']}
                            rules={[{ required: true, message: '请选择列名' }]}
                            labelCol={{ span: 10 }}
                            wrapperCol={{ span: 14 }}
                        >
                            <Select options={col_options} placeholder='请选择列名'/>
                        </Form.Item>
                        <Form.Item
                            label='唯一值数量'
                            name={[field.name, 'uniqueValueNum']}
                            rules={[{ required: true, message: '请填入唯一值数量' }]}
                            labelCol={{ span: 10 }}
                            wrapperCol={{ span: 14 }}
                        >
                            <InputNumber placeholder='请填入唯一值数量'/>
                        </Form.Item>
                        {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }} />}
                    </div>)}
                <Button onClick={() => { add() } } block type='dashed' icon={<PlusCircleOutlined />}>增加筛选列</Button>
            </>}
        </Form.List>
    </div>
}
