import './index.scss'

import { CheckCircleFilled } from '@ant-design/icons'
import { Space, Button } from 'antd'


interface IProps { 
    back: () => void
    on_create_again: () => void
    name: string
}


export function GuideSuccessResultPage (props: IProps) { 
    const { back, on_create_again, name } = props
    
    return <div className='guide-result-page'>
        <CheckCircleFilled className='success-icon'/>
        <div className='result-title'>您的库表 {name} 已创建成功！</div>
        <div className='success-btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' onClick={on_create_again}>再次创建</Button>
            </Space>
        </div>
    </div>
}
