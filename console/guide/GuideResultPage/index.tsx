import './index.scss'
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'
import { useCallback } from 'react'
import { model } from '../../model.js'

export function GuideFailResultPage () { 
    
    const error_msg = sessionStorage.getItem('create_error')
    
    return <div className='guide-result-page'>
        <CloseCircleFilled className='error-icon' />
        <div className='result-title'>创建失败</div>
        {error_msg && <Typography.Text type='secondary'>错误信息：{error_msg}</Typography.Text>}
    </div>
}



export function GuideSuccessResultPage () { 

    const on_create_again = useCallback(() => { 
        model.set({ view: 'guide' })
        model.set_query('view', 'guide')
    }, [ ])
    
    const on_to_home = useCallback(() => { 
        model.set({ view: 'shell' })
        model.set_query('view', 'shell')
    }, [ ])
    
    return <div className='guide-result-page'>
        <CheckCircleFilled className='success-icon'/>
        <div className='result-title'>您的库表已创建成功！</div>
        <div className='success-btn-group'>
            <Space>
                <Button type='primary' onClick={on_create_again}>再次创建</Button>
                <Button onClick={on_to_home}>前往交互编程</Button>
            </Space>
        </div>
    </div>
}
