import './index.scss'

import { CloseCircleFilled } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'
import { useCallback } from 'react'
import { model } from '../../model.js'

interface IProps { 
    back: () => void
}

export function GuideFailResultPage (props: IProps) { 
    const { back } = props
    
    const error_msg = sessionStorage.getItem('create_error')
    
    const on_create_again = useCallback(() => { 
        model.set({ view: 'iot-guide' })
        model.set_query('view', 'guide')
    }, [ ])
    
    return <div className='guide-result-page'>
        <CloseCircleFilled className='error-icon' />
        <div className='result-title'>创建失败</div>
        {error_msg && <Typography.Text type='secondary'>错误信息：{error_msg}</Typography.Text>}
        <div className='success-btn-group'>
            <Space>
                <Button onClick={back}>上一步</Button>
                <Button type='primary' onClick={on_create_again}>再次创建</Button>
            </Space>
        </div>
    </div>
}

