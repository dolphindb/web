import './index.scss'
import type { HTMLAttributes } from 'react'

/** 页面里底部固定按钮，比如页面表单很长，然后表单滚动，按钮固定 */
export function BottomFixedFooter (props: HTMLAttributes<HTMLDivElement>) {
    return <>
        <div className='bottom-fixed-placeholder' />
        <div className='bottom-fixed-footer' {...props} />
    </>
}
