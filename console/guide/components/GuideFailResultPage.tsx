import './index.scss'

import { CloseCircleFilled } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'

interface IProps { 
    back: () => void
    on_create_again: () => void
    error_msg?: string
}

export function GuideFailResultPage (props: IProps) { 
    const { back, on_create_again, error_msg } = props
    
    
    return <div className='guide-result-page'>
        <CloseCircleFilled className='error-icon' />
        <div className='result-title'>创建失败</div>
        {error_msg && <Typography.Text type='secondary' className='error-msg'>错误信息：{error_msg}</Typography.Text>}
        <div className='fail-btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' onClick={on_create_again}>再次创建</Button>
            </Space>
        </div>
    </div>
}

