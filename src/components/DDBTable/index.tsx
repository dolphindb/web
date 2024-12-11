import { QuestionCircleOutlined } from '@ant-design/icons'
import './index.scss'
import { Button, Space, Table, Tooltip, type ButtonProps, type TableProps } from 'antd'

export interface DDBTableProps<T> extends Omit<TableProps<T>, 'title'> {
    title: string
    /** 选传，对于表格的解释说明 */
    help?: string
    /** 表格操作，传入数组，每项为按钮的 props， 例如 [{children: "新建", type: "primary"}] */
    buttons: ButtonProps[]
}

export function DDBTable<T> (props: DDBTableProps<T>) {
    const { title, help, buttons = [ ], ...others } = props
    
    return <>
        <div className='ddb-table-header'>
            {title && <div className='ddb-table-title'>
                <h2>{title}</h2>
                {help && <Tooltip title={help}>
                    <QuestionCircleOutlined className='help-icon' /> 
                </Tooltip>}
            </div>}
            
            <Space size='middle'>
                {buttons.filter(Boolean).map((btn, index) => <Button key={index} {...btn} />)}
            </Space>
        </div>
        
        <Table {...others} />
    
    </>
}
