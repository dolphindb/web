import { QuestionCircleOutlined } from '@ant-design/icons'
import './index.scss'
import { Space, Table, Tooltip, type TableProps } from 'antd'
import { type ReactElement } from 'react'

export interface DDBTableProps<T> extends Omit<TableProps<T>, 'title'> {
    title: string
    /** 选传，对于表格的解释说明 */
    help?: string
    /** 表格操作 */
    buttons?: ReactElement
}

export function DDBTable<T> (props: DDBTableProps<T>) {
    const { title, help, buttons, ...others } = props
    
    return <Table title={(title || buttons) ?  () => <div className='ddb-table-header'>
        {title && <div className='ddb-table-title'>
            <h2>{title}</h2>
            {help && <Tooltip title={help}>
                <QuestionCircleOutlined className='help-icon' /> 
            </Tooltip>}
        </div>}
        {
            buttons && <Space size='middle'>
                {buttons}
            </Space>
        }
    </div> : undefined} 
    {...others} />
}
