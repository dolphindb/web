import React, { useEffect, useState } from 'react'

import { Button, ButtonProps, Tooltip } from 'antd'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import copy from 'copy-to-clipboard'

import { t } from '../../../i18n/index.js'


interface CopyIconButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
    text: string
    onCopy?: () => void
    copyOptions?: Parameters<typeof copy>[1]
    copyTooltips?: [React.ReactNode, React.ReactNode]
}

const COPY_TOOLTIPS = [t('复制'), t('复制成功')]

export function CopyIconButton (props: CopyIconButtonProps) {
    const { onCopy: on_copy_props, text, copyOptions: copy_options, copyTooltips = COPY_TOOLTIPS, ...button_props } = props
    const [copied, set_copied] = useState(false)

    const onCopy = () => {
        copy(text, copy_options)
        set_copied(true)
        on_copy_props?.()
    }

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => {
                set_copied(false)
            }, 2000)
            return () => clearTimeout(timeout)
        }
    }, [copied])

    return (
        <Tooltip title={copied ? copyTooltips[1] : copyTooltips[0]}>
            <Button
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={onCopy}
                {...button_props}
            />
        </Tooltip>
    )
}
