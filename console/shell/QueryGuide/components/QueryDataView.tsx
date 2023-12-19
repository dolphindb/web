import { Alert, Spin } from 'antd'
import { useCallback, useEffect, useState } from 'react'
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
    const [loading, set_loading] = useState(true)
    const [data, set_data] = useState<any>()
    
    const get_query_data = useCallback(async (page, pageSize) => { 
        set_loading(true)
        const data = await request('dbms_executeQueryByPage', { code, page, pageSize, total })
        if (typeof data === 'string')
            set_error(data)
        else { 
            set_error(undefined)
            set_data(data)
            set_total(data[0].value)
            set_disable_export(data[0].value > 500000 || data[0].value === 0)
        }
        set_loading(false)
    }, [code, total])
    
    useEffect(() => { 
        get_query_data(1, 10)
    }, [ get_query_data ])
    
    return !loading ?
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
                        pageSize: pagination.page_size,
                        showSizeChanger: true,
                        current: pagination.page,
                        defaultCurrent: 1,
                        onChange: (page, pageSize) => {
                            set_pagination({ page, page_size: pageSize })
                            get_query_data(page, pageSize)
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
