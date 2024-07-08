import { Alert, Spin, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { Table } from '../../../obj.js'
import { t } from '../../../../i18n/index.js'
import { model } from '../../../model.js'


interface IProps { 
    code: string
    set_total: (val: number) => void
}

export function QueryDataView (props: IProps) { 
    const { code, set_total: get_total } = props
    const [pagination, set_pagination] = useState({ page: 1, page_size: 10 })
    const [total, set_total] = useState<number>()
    const [error, set_error] = useState<string>()
    const [loading, set_loading] = useState(true)
    const [data, set_data] = useState<any>()
    
    const get_query_data = useCallback(async (page, pageSize) => { 
        set_loading(true)
        const { value: data } = await model.ddb.eval(`dbms_executeQueryByPage('${JSON.stringify({ code, page, pageSize, total })})')`)
        if (typeof data === 'string') { 
            set_error(data)
            set_total(0)
        }
        else { 
            set_data(data)
            set_total(data[0].value)
        }
        set_loading(false)
    }, [code, total])
    
    useEffect(() => { 
        get_total(total)
    }, [total])
    
    useEffect(() => { 
        get_query_data(1, 10)
    }, [ get_query_data ])
    
    return !loading ?
        <>
            {
                !error ? 
                <>
                    { total === 20000000 &&  <Typography.Text>{t('当前数据量已达 2000 万行的预览上限，此处仅显示部分截断数据。') }</Typography.Text>}
                    <Table
                    obj={data[1]}
                    ctx='page'
                    show_bottom_bar={false}
                    pagination={{
                        total: data[0].value,
                        showTotal: total => t('共 {{total}} 条数据', { total }),
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
                    />
                    </>
                    :
                    <Alert
                        message={t('错误信息')}
                        description={error}
                        type='error'
                        showIcon
                    />
            }
        </>
    :
        <Spin spinning className='query-guide-spin'/>
}
