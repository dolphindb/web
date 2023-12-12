import './index.scss'
import { CopyOutlined } from '@ant-design/icons'
import { Editor } from '../../shell/Editor/index.js'

import { Button, Tooltip, message } from 'antd'
import copy from 'copy-to-clipboard'
import { useCallback } from 'react'
import classNames from 'classnames'

interface IProps { 
    code: string
    className?: string
}

export function ReadonlyEditor (props: IProps) { 
    const { code, className } = props
        
    const copy_code = useCallback(() => {
        copy(code)
        message.success('复制成功')
    }, [code])
    
    return <div className={classNames('readonly-editor', { [className]: true })}>
        <Tooltip title='复制代码'>
            <Button className='copy-btn' icon={<CopyOutlined />} onClick={copy_code} />
        </Tooltip>
        <Editor value={code} readonly />
    </div>
}
