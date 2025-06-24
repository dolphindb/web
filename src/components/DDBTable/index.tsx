import './index.scss'

import { QuestionCircleOutlined } from '@ant-design/icons'
import { Space, Table, Tooltip, type TableProps } from 'antd'
import { type ReactNode } from 'react'

export interface DDBTableProps<T> extends Omit<TableProps<T>, 'title'> {
    title?: ReactNode
    /** 选传，对于表格的解释说明 */
    help?: string
    /** 表格操作 */
    buttons?: ReactNode
    filter_form?: ReactNode
}

export function DDBTable<T> (props: DDBTableProps<T>) {
    const { title, help, buttons, filter_form, pagination, ...others } = props
    
    return <Table
            className='ddb-title'
            title={title || buttons || filter_form ?
                () => <>
                    <div className='ddb-table-header'>
                        {title ? 
                            <div className='ddb-table-title'>
                                <h2>{title}</h2>
                                {help && (
                                    <Tooltip title={help}>
                                        <QuestionCircleOutlined className='help-icon' />
                                    </Tooltip>
                                )}
                            </div>
                        : 
                            null
                        }
                        {buttons && <Space size='middle'>{buttons}</Space>}
                    </div>
                    
                    {filter_form && <div className='ddb-table-filter-form'>{filter_form}</div>}
                </>
            :
                undefined
            }
            pagination={
                pagination
                    ? {
                          ...pagination,
                          size: 'small'
                      }
                    : false
            }
            {...others}
        />
}
