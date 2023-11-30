import { Button, Form, Input, Space } from 'antd'
import { type IFinanceInfo } from './type.js'
import { SchemaList } from '../components/SchemaList.js'
import { useCallback, useEffect } from 'react'
import { request } from '../utils.js'
import { PartitionColSelect } from './components/PartitionColSelect.js'
import { CommonFilterCols } from './components/CommonFilterCols.js'
import { model } from '../../model.js'

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
        let table_params = { }
        if (values.partitionCols)
            table_params = { ...values, partitionCols: values.partitionCols?.map(item => item.colName) }
        else
            table_params = values
        const params = {
            database: info.database,
            table: table_params
        } 
        const { code } = await request<{ code: string }>('autoCreateDBTB', params)
        go({ table: values, code })
    }, [info, go])
    
    useEffect(() => {
        form.setFieldsValue(info.table)
    }, [info.table])
    
    
    const is_table_exist = useCallback(async (_, value) => { 
        if (!info.database.isExist)
            return Promise.resolve()
        const res = await model.ddb.eval(`existsTable("dfs://${info.database?.name}", \`${value})`)
        if (res.value)
            return Promise.reject(`库${info.database.name}下已有该表，请修改表名`)
    }, [info.database])
    
    return <Form
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={on_submit}
    >
        <Form.Item
            label='表名'
            name='name'
            rules={[
                { required: true, message: '请输入表名' },
                { validator: is_table_exist }]}
        >
            <Input placeholder='请输入表名'/>
        </Form.Item>
        <SchemaList with_array_vector={info.database.engine !== 'OLAP'} />
        <PartitionColSelect info={info} schema={schema} />
        
        <CommonFilterCols schema={schema}/>
        
        <Form.Item className='btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' htmlType='submit'>生成脚本</Button>
            </Space>
        </Form.Item>
        
    </Form>
 }
