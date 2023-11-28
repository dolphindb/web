import { useState, useCallback, useEffect, useMemo } from 'react'
import { type ITableInfo, type IFinanceInfo } from '../type.js'
import { request } from '../../utils.js'
import { Form, Select } from 'antd'

interface IProps { 
    info: IFinanceInfo
    schema: ITableInfo['schema']
}

export function PartitionColSelect (props: IProps) {
    
    const { info: { database, table }, schema = [ ] } = props
    
    const [partition_info, set_partition_info] = useState<string[][]>([ ])
    const form = Form.useFormInstance()
    
    const get_partition_info = useCallback(async () => {
        if (database.isExist) {
            const { cols = [ ] } = await request<{ cols: string[] }>('getPartitionColumns', { dbName: database.name })
            set_partition_info(cols?.map(item => item.split(',')))
        }
    }, [database])
    
    useEffect(() => {
        get_partition_info()
    }, [ ])
    
    const filter_col_options = useCallback((col_types: string[]) => {
        return schema
            .filter(item => col_types?.includes(item?.dataType))
            .map(col => ({
                label: col.colName,
                value: col.colName
            }))
    }, [schema])
    
    const show_time_col = useMemo(() => { 
        return !(database.dailyTotalNum?.gap === 8)
    }, [database])
    
    const show_hash_col = useMemo(() => { 
        // 日增量选择【总数据量为小于200万且不新增】【0-1w】【1-10w】【10-100w】的时候不展示标的列
        return [3, 4, 5, 6, 7].includes(database.dailyTotalNum?.gap) || (database.dailyTotalNum?.gap === 9 && database.dailyTotalNum?.custom > 1000000)
    }, [database])
    
    useEffect(() => { 
        if (partition_info.length && !table?.partitionCols)
            form.setFieldValue('partitionCols', partition_info.map(item => ({ })) )
    }, [partition_info, database])
    
    return database?.isExist ? <Form.List name='partitionCols'>
        {fields => {
            return fields.map(field => {
                const data_types = partition_info[field.name]
                const options = filter_col_options(data_types)
                return <Form.Item key={field.name} extra={`数据类型为${data_types?.join('/')}`} label={`分区列${field.name + 1}`} name={[field.name, 'colName']}>
                    <Select options={options} />
                </Form.Item>
            })
        }}
    </Form.List>
    : <>
        {
            show_time_col && <Form.Item tooltip='严格按时序增长排列的时间类型列，将按该列对数据进行分区' label='时间列' name='timeCol' rules={[{ required: true, message: '请选择时间列' }]}>
                <Select placeholder='请选择时间列' options={filter_col_options(['DATE', 'DATETIME', 'TIMESTAMP'])}/>
            </Form.Item>
        }
        {
            show_hash_col && <Form.Item tooltip='如股票ID、期货品种这样的枚举类型列，将按该列对数据进行分区' label='标的列' name='hashCol' rules={[{ required: true, message: '请选择标的列' }]}>
                <Select options={filter_col_options(['SYMBOL', 'STRING'])} placeholder='请选择标的列'/>
            </Form.Item>
        }
    </>
}
