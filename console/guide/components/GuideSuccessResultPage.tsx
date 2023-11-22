import './index.scss'

import { CheckCircleFilled } from '@ant-design/icons'
import { Space, Button } from 'antd'
import { useCallback } from 'react'
import { model } from '../../model.js'

interface IProps { 
    back: () => void
}


export function GuideSuccessResultPage (props: IProps) { 
    const { back } = props
    
    const on_create_again = useCallback(() => { 
        model.set({ view: 'iot-guide' })
        model.set_query('view', 'guide')
    }, [ ])
    
    
    return <div className='guide-result-page'>
        <CheckCircleFilled className='success-icon'/>
        <div className='result-title'>您的库表已创建成功！</div>
        <div className='success-btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' onClick={on_create_again}>再次创建</Button>
            </Space>
        </div>
    </div>
}
