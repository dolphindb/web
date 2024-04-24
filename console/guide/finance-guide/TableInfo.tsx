import { Button, Form, Input, Space } from 'antd'

import { useCallback, useEffect, useState } from 'react'

import useSWR from 'swr'

import { SchemaList } from '../components/SchemaList.js'

import { check_tb_valid, request } from '../utils.js'

import { model } from '../../model.js'

import { t } from '../../../i18n/index.js'

import { type IFinanceInfo } from './type.js'


import { PartitionColSelect } from './components/PartitionColSelect.js'
import { CommonFilterCols } from './components/CommonFilterCols.js'




interface IProps { 
    info: IFinanceInfo
    go: (info: IFinanceInfo) => void
    back: () => void
}
export function TableInfo (props: IProps) {
    const { info, go, back } = props
    const [engine, set_engine] = useState(info.database?.engine)
    
    const [form] = Form.useForm()
    
    const schema = Form.useWatch('schema', form)
    
    useSWR(
        info.database?.isExist ? 'database_engine' : null,
        async () => model.ddb.eval(`database("dfs://${info.database.name}").schema().engineType`),
        { onSuccess: data => { set_engine(data?.value as ('OLAP' | 'TSDB')) } }
    )
    
    const on_submit = useCallback(async () => {
        try {
            await form.validateFields()
        } catch {
            return
        }
        const values = await form.getFieldsValue()
        let table_params = { }
        if (values.partitionCols)
            table_params = { ...values, partitionCols: values?.partitionCols?.map(item => item.colName) }
        else
            table_params = values
        const { code } = await request<{ code: string }>('autoCreateDBTB', {
            database: info.database,
            table: table_params
        })
        go({ table: values, code })
    }, [info, go])
    
    useEffect(() => {
        form.setFieldsValue(info.table)
    }, [info.table])
    
    
    const validate_table = useCallback(async (_, value) => { 
        if (value && !check_tb_valid(value))
            return Promise.reject(t('仅支持数字、大小写字母、中文以及下划线，且必须以中文或英文字母开头'))
        if (!info.database.isExist)
            return Promise.resolve()
        const res = await model.ddb.eval(`existsTable("dfs://${info.database?.name}", \`${value})`)
        if (res.value)
            return Promise.reject(t('库 {{name}} 下已有该表，请修改表名', { name: info.database.name }))
    }, [info.database])
    
    return <Form
        form={form}
        labelAlign='left'
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        onFinish={on_submit}
    >
        <Form.Item
            label={t('表名')}
            name='name'
            rules={[
                { required: true, message: t('请输入表名') },
                { validator: validate_table }
            ]}
        >
            <Input placeholder={t('请输入表名')} />
        </Form.Item>
        <SchemaList engine={engine} mode='finance'/>
        <PartitionColSelect info={info} schema={schema} />
        
        { info.database.engine === 'TSDB' && <CommonFilterCols schema={schema}/> }
        
        <Form.Item className='btn-group'>
            <Space>
                <Button onClick={back}>{t('上一步')}</Button>
                <Button type='primary' onClick={on_submit}>{t('生成脚本') }</Button>
            </Space>
        </Form.Item>
        
    </Form>
 }
