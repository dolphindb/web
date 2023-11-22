import { useState, useCallback, useEffect, useMemo } from 'react'
import { info } from 'sass'
import { type ITableInfo, type IFinanceInfo } from '../type.js'
import { request } from '../../utils.js'
import { Form, Select, Typography } from 'antd'

interface IProps { 
    database: IFinanceInfo['database']
    schema: ITableInfo['schema']
}

export function ColSelect (props: IProps) {
    
    const { database, schema = [ ] } = props
    
    const [partition_info, set_partition_info] = useState<string[][]>([ ])
    
    const get_partition_info = useCallback(async () => {
        if (database.isExist) {
            const res = await request<string[]>('', { dbName: database.name })
            set_partition_info(res.map(item => item.split(',')))
        }
    }, [database])
    
    useEffect(() => {
        get_partition_info()
    }, [ ])
    
    const filter_col_options = useCallback((col_types: string[]) => {
        return schema
            .filter(item => col_types.includes(item.dataType))
            .map(col => ({
                label: col,
                value: col
            }))
    }, [schema])
    
    const show_time_col = useMemo(() => { 
        return !(database.dailyTotalNum?.gap === 8)
    }, [database])
    
    const show_hash_col = useMemo(() => { 
        // 日增量选择【总数据量为小于200万且不新增】【0-1w】【1-10w】【10-100w】的时候不展示标的列
        return [3, 4, 5, 6, 7].includes(database.dailyTotalNum?.gap) || (database.dailyTotalNum?.gap === 9 && database.dailyTotalNum?.custom > 1000000)
    }, [database])
    
    return database?.isExist ? <Form.List name='partitionCols' initialValue={partition_info.map(item => ({ }))}>
        {fields => {
            return fields.map(field => {
                const data_types = partition_info[field.name]
                const options = filter_col_options(data_types)
                return <>
                    <Form.Item label={`分区列${field.name + 1}`} name='colName'>
                        <Select options={options} />
                        <Typography.Text type='secondary'>
                            数据类型为{data_types.join('/')}
                        </Typography.Text>
                    </Form.Item>
                    
                </>
            })
        }}
    </Form.List>
    : <>
            {show_time_col && <Form.Item label='时间列' name='timeCol' rules={[{ required: true, message: '请选择时间列' }]}>
                <Select placeholder='请选择时间列' options={filter_col_options(['DATE', 'DATETIME', 'TIMESTAMP'])}/>
            </Form.Item>
        }
        {
            show_hash_col && <Form.Item label='标的列' name='hashCol'>
                <Select options={filter_col_options(['SYMBOL', 'STRING'])}/>
            </Form.Item>
        }
    </>
}
