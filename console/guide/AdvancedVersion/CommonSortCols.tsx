import './index.scss'

import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, InputNumber, Select } from 'antd'
import { type SelectProps } from 'antd/lib'

interface IProps {
    mode?: 'common' | 'readonly'
    max?: number
    initial_value?: any
    col_options: SelectProps['options']
}

export function CommonSortCols (props: IProps) {
    const { initial_value, col_options, mode = 'common' } = props
    
    return <div className='sort-cols-wrapper'>
        <h3>常用筛选列</h3>
        <Form.List name='otherSortKeys' initialValue={initial_value || [{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field =>
                    <div key={field.name} className='sort-col-item'>
                        <Form.Item label='列名' name='colName' rules={[{ required: true, message: '请选择列名' }]}  labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                            <Select options={col_options}/>
                        </Form.Item>
                        <Form.Item label='唯一值数量' name='uniqueValueNum' rules={[{ required: true, message: '请填入唯一值数量' }] } labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                            <InputNumber/>
                        </Form.Item>
                        <Form.Item label='降维桶数' name='hashMapNum' labelCol={{ span: 10 }} wrapperCol={{ span: 14 }} initialValue={0}>
                            <InputNumber />
                        </Form.Item>
                        { mode === 'common' && fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) } } /> }
                    </div>)}
                { mode === 'common' && <Button onClick={() => { add() } } block type='dashed' icon={<PlusCircleOutlined />}>增加筛选列</Button> }
            </>}
        </Form.List>
    </div>
}
