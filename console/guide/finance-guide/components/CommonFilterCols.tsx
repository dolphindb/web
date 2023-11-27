import './index.scss'
import { type ITableInfo } from '../type'
import { Button, Form, InputNumber, Select } from 'antd'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { useMemo } from 'react'

interface IProps { 
    schema: ITableInfo['schema']
}

export function CommonFilterCols (props: IProps) {
    const { schema = [ ] } = props
    
    const form = Form.useFormInstance()
    
    const timeCol = Form.useWatch('timeCol', form)
    
    const filter_col_options = useMemo(() => {
        return schema
            .filter(item => !['INT', 'DOUBLE', 'LONG', 'SHORT', 'DECIMAL', 'FLOAT', 'DATETIME'].includes(item.colName) && item.colName !== timeCol)
            .map(item => ({ label: item.colName, value: item.colName }))
     }, [schema, timeCol])
    
    return <div className='common-filter-cols-wrapper'>
        <h4>常用筛选列</h4>
        <Form.List name='filterCols' initialValue={[{ }]}>
            {(fields, { remove, add }) => <>
                {fields.map(field => <div key={field.name} className='common-filter-col'>
                    <Form.Item name={[field.name, 'colName']} label='列名' rules={[{ required: true, message: '请选择列名' }]}>
                        <Select options={filter_col_options} placeholder='请选择列名'/>
                    </Form.Item>
                    <Form.Item name={[field.name, 'uniqueNum']} label='唯一值数量' rules={[{ required: true, message: '请输入唯一值数量' }]}>
                        <InputNumber placeholder='请输入唯一值数量'/>
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined onClick={() => { remove(field.name) }} className='delete-icon'/> }
                </div>)}
                { fields.length < 2 && <Button block type='dashed' onClick={() => { add() }} icon={<PlusCircleOutlined />}>增加筛选列</Button> }
            </>}
        </Form.List>
        
    </div>
}
