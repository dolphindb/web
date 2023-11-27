import { Button, Form, Input, Space } from 'antd'
import { type IFinanceInfo } from './type.js'
import { SchemaList } from '../components/SchemaList.js'
import { useCallback, useEffect } from 'react'
import { request } from '../utils.js'
import { PartitionColSelect } from './components/PartitionColSelect.js'
import { CommonFilterCols } from './components/CommonFilterCols.js'

interface IProps { 
    info: IFinanceInfo
    go: (info: IFinanceInfo) => void
    back: () => void
}
export function TableInfo (props: IProps) {

    const { info, go, back } = props
    
    const [form] = Form.useForm()
    
    const schema = Form.useWatch('schema', form)
    
    const on_submit = useCallback(async values => {
        if (info.database?.isExist)  
            values = {
                ...values,
                partitionCols: values.partitionCols?.map(item => item.colName)
            }
        const params = {
            database: info.database,
            table: values
        } 
        const { code } = await request<{ code: string }>('autoCreateDBTB', params)
        go({ table: values, code })
    }, [info, go])
    
    useEffect(() => {
        form.setFieldsValue(info.table)
    }, [ info.table ])
    
    return <Form
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={on_submit}
    >
        <Form.Item label='表名' name='name' rules={[{ required: true, message: '请输入表名' }]}>
            <Input placeholder='请输入表名'/>
        </Form.Item>
        <SchemaList />
        <PartitionColSelect database={info?.database} schema={schema} />
        
        <CommonFilterCols schema={schema}/>
        
        <Form.Item className='btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' htmlType='submit'>生成脚本</Button>
            </Space>
        </Form.Item>
        
    </Form>
 }
