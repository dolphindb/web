import { Table } from 'antd'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { request } from '../../../guide/utils.js'
import { genid } from 'xshell/utils.browser.js'

interface IProps { 
    code: string
}

const DEFAULT_DATA = {
    items: [ ],
    total: 0
}

export function QueryDataView (props: IProps) { 
    const { code } = props
    const [pagination, set_pagination] = useState({ page: 1, page_size: 10 })
    
    const { data = DEFAULT_DATA, isLoading } = useSWR(
        ['executeQueryByPage', code, pagination.page, pagination.page_size],
        async () => request<{ items: any[], total: number }>('executeQueryByPage', { code, page: pagination.page, pageSize: pagination.page_size })
    )
    
    const columns = useMemo(() => { 
        if (data.items[0])  
            return Object.keys(data.items[0]).map(key => ({
                title: key,
                dataIndex: key,
                key
            }))
    }, [data])
    
    return <Table
        scroll={{ x: '100%' }}
        rowKey={() => genid()}
        loading={isLoading}
        columns={columns}
        dataSource={data.items}
        pagination={{
            total: data.total,
            showTotal: total => `共 ${total} 条数据`,
            pageSizeOptions: [10, 20],
            defaultPageSize: pagination.page_size,
            showSizeChanger: true,
            onChange: (page, pageSize) => { set_pagination({ page, page_size: pageSize }) }
        }}
    />
}
