import  './index.scss'
import { Tag, type TagProps } from 'antd'
import cn from 'classnames'

export enum StatusType {
    RUNNING,
    SUCCESS,
    FAILED = -1,
    PARTIAL_SUCCESS = 2
}


interface IProps extends TagProps {
    /** 状态 */
    status: StatusType
}


export function StatusTag (props: IProps) {
    
    const { status, ...others } = props
    
    return <Tag 
        {...others} 
        bordered={false}
        className={cn({
            tag: true,
            'success-tag': status === StatusType.SUCCESS,
            'error-tag': status === StatusType.FAILED,
            'processing-tag': status === StatusType.RUNNING,
            'partial-success-tag': status === StatusType.PARTIAL_SUCCESS
        })}
    />
}


export function DDBTag (props: TagProps) {
    return <Tag {...props} className='tag ddb-tag' bordered={false}/>
}
