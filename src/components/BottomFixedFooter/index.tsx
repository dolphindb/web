import './index.scss'
import type { HTMLAttributes } from 'react'

export function BottomFixedFooter (props: HTMLAttributes<HTMLDivElement>) {
    return <>
        <div className='bottom-fixed-placeholder' />
        <div className='bottom-fixed-footer' {...props} />
    </>
}
