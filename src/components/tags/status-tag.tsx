import { Tag } from 'antd'

export enum StatusType {
    RUNNING,
    SUCCESS,
    FAILED = -1,
    PARTIAL_SUCCESS = 2
}

const COLOR_MAP = {
    [StatusType.FAILED]: '#AE2E24',
    [StatusType.PARTIAL_SUCCESS]: '#873800',
    [StatusType.RUNNING]: '#003A8C',
    [StatusType.SUCCESS]: '#216E4E'
}

interface IProps {
    /** 标签文案 */
    text: string
    /** 状态 */
    status: StatusType
}


export function StatusTag (props: IProps) {
    
    const { text, status } = props
    
    return <Tag color={COLOR_MAP[status]}>{text}</Tag>
}
