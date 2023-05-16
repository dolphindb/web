import './CopyIconButton.scss'

import React, { useEffect, useState } from 'react'
import cn from 'classnames'

import { Button, ButtonProps, Tooltip } from 'antd'
import copy from 'copy-to-clipboard'

import { t } from '../../../i18n/index.js'

import SVGCopyIcon from './copy.icon.svg'
import SVGCopiedIcon from './copied.icon.svg'


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

    return <Tooltip title={copied ? copyTooltips[1] : copyTooltips[0]}>
        <Button
            {...button_props}
            className={cn('copy-icon-button', button_props.className)}
            icon={copied ? <SVGCopiedIcon /> : <SVGCopyIcon />}
            onClick={onCopy}
        />
    </Tooltip>
}
