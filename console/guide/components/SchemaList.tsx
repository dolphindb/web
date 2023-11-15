import './index.scss'

import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space } from 'antd'

const DATA_TYP_LIST = ['BOOL', 'CHAR', 'SHORT', 'INT', 'FLOAT', 'DOUBLE', 'LONG',
'TIME', 'MINUTE', 'SECOND', 'DATE', 'DATEHOUR', 'DATETIME', 'TIMESTAMP',
'NANOTIMESTAMP', 'SYMBOL', 'STRING', 'BLOB', 'DECIMAL32(S)', 'DECIMAL64(S)', 'DECIMAL128(S)']

export function SchemaList () { 
    return <div className='schema-wrapper'>
        <h3>列配置</h3>
        <Form.List name='schema' initialValue={[{ }]}>
            {(fields, { add, remove }) => <>
                {fields.map(field => <div className='schema-item' key={field.name}>
                    <Form.Item label='列名' name={[field.name, 'colName']} rules={[{ required: true, message: '请输入列名' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='数据类型' name={[field.name, 'dataType']} rules={[{ required: true, message: '请选择数据类型' }]}>
                        <Select options={DATA_TYP_LIST.map(item => ({ label: item, value: item }))} />
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined className='delete-icon' onClick={() => { remove(field.name) }}/> }
                </div>)}
                <Button onClick={() => { add() }} type='dashed' block icon={<PlusCircleOutlined />}>增加列配置</Button>
            
            </>}
        </Form.List>
        
    </div>
}
