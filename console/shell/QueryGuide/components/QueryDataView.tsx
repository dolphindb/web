import { Alert, Spin } from 'antd'
import { useState } from 'react'
import useSWR from 'swr'
import { request } from '../../../guide/utils.js'
import { Table } from '../../../obj.js'
import { t } from '../../../../i18n/index.js'


interface IProps { 
    code: string
    set_disable_export: (val: boolean) => void
}

export function QueryDataView (props: IProps) { 
    const { code, set_disable_export } = props
    const [pagination, set_pagination] = useState({ page: 1, page_size: 10 })
    const [total, set_total] = useState()
    const [error, set_error] = useState<string>()
    
    const { data, isLoading = true } = useSWR(
        'dbms_executeQueryByPage' + code + pagination.page + pagination.page_size + total,
        async () => request('dbms_executeQueryByPage', { code, page: pagination.page, pageSize: pagination.page_size, total }),
        {
            onSuccess: (data: any) => {
                if (typeof data === 'string')  
                    set_error(data)
                else { 
                    set_error(undefined)
                    set_total(data[0].value)
                    set_disable_export(data[0].value > 500000 || data[0].value === 0)
                }
            },
        }
    )
    
    return !isLoading ?
        <>
            {
                !error ? 
                <Table
                    obj={data[1]}
                    ctx='page'
                    show_bottom_bar={false}
                    pagination={{
                        total: data[0].value,
                        showTotal: total => `共 ${total} 条数据`,
                        pageSizeOptions: [10, 20],
                        defaultPageSize: pagination.page_size,
                        showSizeChanger: true,
                        current: pagination.page,
                        onChange: (page, pageSize) => {
                            set_pagination({ page, page_size: pageSize })
                        }
                    }}
                    /> :
                    <Alert
                        message={t('查询语句执行错误')}
                        description={error}
                        type='error'
                        showIcon
                    />
            }
        </>
    :
        <Spin spinning className='query-guide-spin'/>
}
