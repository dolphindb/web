import './index.scss'

import { Button, Popconfirm, Space, Tooltip, message } from 'antd'
import { Editor } from '../../shell/Editor/index.js'
import { useBoolean } from 'ahooks'
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
    const [open, { setTrue, setFalse } ] = useBoolean(false)
    
    const execute_code = useCallback(async () => { 
        await model.ddb.eval(code)
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
                <Popconfirm open={open} title='确认要执行当前建库脚本吗？' onCancel={setFalse} onConfirm={execute_code}>
                    <Button type='primary' onClick={setTrue}>立即执行</Button>
                </Popconfirm>
            </Space>
        </div>
    </div>
 }
