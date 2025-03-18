import './index.scss'
import { CopyOutlined } from '@ant-design/icons'


import { Button, Tooltip } from 'antd'
import copy from 'copy-to-clipboard'
import { useCallback } from 'react'
import classNames from 'classnames'

import { Editor } from '../Editor/index.js'
import { t } from '../../../i18n/index.js'
import { model } from '@/model.js'

interface IProps { 
    code: string
    className?: string
}

export function ReadonlyEditor (props: IProps) { 
    const { code, className } = props
        
    const copy_code = useCallback(() => {
        copy(code)
        model.message.success(t('复制成功'))
    }, [code])
    
    return <div className={classNames('readonly-editor', { [className]: true })}>
        <Tooltip title={t('复制代码')}>
            <Button className='copy-btn' icon={<CopyOutlined />} onClick={copy_code} />
        </Tooltip>
        <Editor value={code} readonly />
    </div>
}
