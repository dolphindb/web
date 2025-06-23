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
            'ddb-tag': true,
            'ddb-success-tag': status === StatusType.SUCCESS,
            'ddb-error-tag': status === StatusType.FAILED,
            'ddb-processing-tag': status === StatusType.RUNNING,
            'ddb-partial-success-tag': status === StatusType.PARTIAL_SUCCESS
        })}
    />
}


export function DDBTag (props: TagProps) {
    return <Tag {...props} className='tag ddb-tag' bordered={false}/>
}
