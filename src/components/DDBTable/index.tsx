import './index.sass'

import { QuestionCircleOutlined } from '@ant-design/icons'
import { Space, Table, Tooltip, type TableProps } from 'antd'
import { type ReactNode } from 'react'


export interface DDBTableProps<T> extends Omit<TableProps<T>, 'title'> {
    title?: ReactNode
    
    /** 页面模块只有一个表格，表格标题作为模块大标题的情况 */
    big_title?: boolean
    
    /** 选传，对于表格的解释说明 */
    help?: string
    
    /** 表格操作 */
    buttons?: ReactNode
    
    filter_form?: ReactNode
}


export function DDBTable<T> ({ title, help, buttons, filter_form, pagination, big_title, ...others }: DDBTableProps<T>) {
    return <Table
            className='ddb-title'
            
            title={title || buttons || filter_form ?
                () => <>
                    <div className='ddb-table-header'>
                        {title ? 
                            <div className={`ddb-table-title ${big_title ? 'bigtitle' : ''}`}>
                                <div className='text'>{title}</div>
                                { help && <Tooltip title={help}>
                                    <QuestionCircleOutlined className='help-icon' />
                                </Tooltip> }
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
