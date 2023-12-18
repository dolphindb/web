import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { request } from '../../../guide/utils.js'
import { Table } from '../../../obj.js'

interface IProps { 
    code: string
    set_disable_export: (val: boolean) => void
}

const DEFAULT_DATA = {
    items: [ ],
    total: 0
}

export function QueryDataView (props: IProps) { 
    const { code, set_disable_export } = props
    const [pagination, set_pagination] = useState({ page: 1, page_size: 10 })
    const [total, set_total] = useState(0)
    
    const { data = DEFAULT_DATA, isLoading } = useSWR(
        'dbms_executeQueryByPage' + code + pagination.page + pagination.page_size,
        async () => request<{ items: any[], total: number }>('dbms_executeQueryByPage', { code, page: pagination.page, pageSize: pagination.page_size }),
        {
            onSuccess: data => {
                set_total(data[0].value)
                set_disable_export(data[0].value > 500000 || data[0].value === 0)
            },
        }
    )
    
    return !isLoading ? <Table
        obj={data[1]}
        ctx='page'
        show_bottom_bar={false}
        pagination={{
            total: total,
            showTotal: total => `共 ${total} 条数据`,
            pageSizeOptions: [10, 20],
            defaultPageSize: pagination.page_size,
            showSizeChanger: true,
            current: pagination.page,
            onChange: (page, pageSize) => {
                set_pagination({ page, page_size: pageSize })
            }
        }}
    />
    :
    <Spin spinning />
}
