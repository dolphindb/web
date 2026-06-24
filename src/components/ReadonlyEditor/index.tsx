import './index.scss'

import { CopyOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useCallback } from 'react'
import cn from 'classnames'

import { t } from '@i18n'
import { model } from '@model'
import { copy } from '@utils'
import { Editor } from '@components/Editor/index.tsx'


export function ReadonlyEditor ({
    code,
    className
}: {
    code: string
    className?: string
}) {
    const copy_code = useCallback(async () => {
        await copy(code)
        model.message.success(t('复制成功'))
    }, [code])
    
    return <div className={cn('readonly-editor', className)}>
        <Tooltip title={t('复制代码')}>
            <Button className='copy-btn' icon={<CopyOutlined />} onClick={copy_code} />
        </Tooltip>
        <Editor default_value={code} readonly />
    </div>
}
