import './index.scss'

import { Button, Popconfirm, Space, Tooltip, message } from 'antd'
import { Editor } from '../../shell/Editor/index.js'
import { useCallback } from 'react'
import { model } from '../../model.js'
import { CopyOutlined } from '@ant-design/icons'
import copy from 'copy-to-clipboard'
import NiceModal from '@ebay/nice-modal-react'
import { DownloadConfigModal } from './DownloadConfigModal.js'

interface IProps { 
    code: string
    back: () => void
    config: any
}

export function CodeViewStep (props: IProps) {
    const { code = 'xxxx', back, config } = props
   
    const execute_code = useCallback(async () => { 
        try {
            await model.ddb.eval(code)
            setTimeout(() => { 
                model.set_query('view', 'guide-result')
                model.set({ view: 'guide-result-success' })
            }, 1000)
        } catch (e) { 
            sessionStorage.setItem('create_error', e)
            model.set_query('view', 'guide-result-fail')
            model.set({ view: 'guide-result-fail' })            
        }
        
    }, [code])
    
    
    const copy_code = useCallback(() => {
        copy(code)
        message.success('复制成功')
    }, [code])
    
    const on_download = useCallback(() => { 
        NiceModal.show(DownloadConfigModal, { config })
    }, [config])
    
    
    return <div className='code-view-wrapper'>
        <div className='readonly-editor'>
            <Tooltip title='复制代码'>
                <Button className='copy-btn' icon={<CopyOutlined />} onClick={copy_code} />
            </Tooltip>
            <Editor value={code} readonly />
        </div>
        
        <div className='button-group'>
            <Space>
                <Button onClick={on_download}>导出表单配置</Button>
                <Button onClick={back}>上一步</Button>
                <Popconfirm title='确认要执行当前建库脚本吗？' onConfirm={execute_code}>
                    <Button type='primary'>立即执行</Button>
                </Popconfirm>
            </Space>
        </div>
    </div>
 }
