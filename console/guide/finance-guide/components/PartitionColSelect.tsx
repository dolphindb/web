import { useState, useCallback, useEffect, useMemo } from 'react'
import { type ITableInfo, type IFinanceInfo } from '../type.js'
import { request } from '../../utils.js'
import { Form, Select, Spin } from 'antd'
import useSWR from 'swr'
import { ENUM_TYPES, TIME_TYPES } from '../../constant.js'
import { CUSTOM } from '../constant.js'

interface IProps { 
    info: IFinanceInfo
    schema: ITableInfo['schema']
}

export function PartitionColSelect (props: IProps) {
    
    const { info: { database, table }, schema = [ ] } = props
    
    const [partition_info, set_partition_info] = useState<string[][]>([ ])
    const form = Form.useFormInstance()
    
    // 请求分区信息
    const { isLoading } = useSWR(database.isExist ? 'getPartitionColumns' : null,
        async () => request<{ cols: string[] }>('getPartitionColumns', { dbName: database.name }),
        { onSuccess: data =>  { set_partition_info(data?.cols?.map(item => item.split(','))) }
    })
    
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
        return [3, 4, 5, 6, 7].includes(database.dailyTotalNum?.gap) || (database.dailyTotalNum?.gap === CUSTOM && database.dailyTotalNum?.custom > 2000000)
    }, [database])
    
    useEffect(() => { 
        if (partition_info.length && !table?.partitionCols)
            form.setFieldValue('partitionCols', partition_info.map(item => ({ })) )
    }, [partition_info, database])
    
    const is_col_exist = useCallback(async (values: string[]) => { 
        for (let col_name of values)
            if (col_name && !schema.find(item => item.colName === col_name))
                return Promise.reject(`表结构中无 ${col_name} 列，请修改`)
    }, [schema])
    
    const validate_partition_col = useCallback(async (_, values) => { 
        return is_col_exist(values.map(item => item.colName))
    }, [schema])
    
    
    
    return database?.isExist ? <Spin spinning={isLoading}>
        <Form.List name='partitionCols' rules={[{ validator: validate_partition_col }] }>
        {fields => {
            return fields.map(field => {
                const data_types = partition_info[field.name]
                const options = filter_col_options(data_types)
                return <Form.Item
                    tooltip='根据已有数据库的分区信息，选择需要作为划分数据依据的列'
                    key={field.name}
                    extra={`数据类型为 ${data_types?.join('/')}`}
                    label={`分区列${field.name + 1}`} name={[field.name, 'colName']}
                    rules={[{ required: true, message: '请选择分区列' }]}
                >
                    <Select options={options} placeholder='请选择分区列'/>
                </Form.Item>
                    
            })
        }}
    </Form.List>
        
    </Spin>
    : <>
        {
                show_time_col && <Form.Item
                    tooltip='严格按时序增长排列的时间类型列，将按该列对数据进行分区'
                    label='时间列'
                    name='timeCol'
                    rules={[
                        { required: true, message: '请选择时间列' },
                        { validator: async (_, value) => is_col_exist([value]) }
                    ]}
                >
                <Select placeholder='请选择时间列' options={filter_col_options(TIME_TYPES)}/>
            </Form.Item>
        }
        {
                show_hash_col && <Form.Item
                    tooltip='如股票ID、期货品种这样的枚举类型列，将按该列对数据进行分区'
                    label='标的列' name='hashCol'
                    rules={[
                        { required: true, message: '请选择标的列' },
                        { validator: async (_, value) => is_col_exist([value]) }
                    ]}>
                <Select options={filter_col_options(ENUM_TYPES)} placeholder='请选择标的列'/>
            </Form.Item>
        }
    </>
}
