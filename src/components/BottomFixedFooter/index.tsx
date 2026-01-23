import './index.scss'
import type { HTMLAttributes } from 'react'

import { model } from '@model'
import { sider_collapsed_width, sider_uncollapsed_width } from '@utils'

/** 页面里底部固定按钮，比如页面表单很长，然后表单滚动，按钮固定 */
export function BottomFixedFooter (props: HTMLAttributes<HTMLDivElement>) {
    const { collapsed } = model.use(['collapsed'])
    
    const sider_width =  `${collapsed ? sider_collapsed_width : sider_uncollapsed_width}px`
    return <>
        <div className='bottom-fixed-placeholder'/>
        <div 
            className='bottom-fixed-footer' {...props} 
            style={{ 
                width: `calc(100% - ${sider_width}`, 
                left: sider_width 
            }}
        />
    </>
}
