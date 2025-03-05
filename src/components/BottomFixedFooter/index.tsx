import { useSize } from 'ahooks'
import './index.scss'
import { useLayoutEffect, useState, type HTMLAttributes } from 'react'

/** 页面里底部固定按钮，比如页面表单很长，然后表单滚动，按钮固定 */
export function BottomFixedFooter (props: HTMLAttributes<HTMLDivElement>) {
    
    const [sider, setSider] = useState<Element>()
    
    // 监听 sider 宽度变更
    useLayoutEffect(() => { setSider(document.querySelector('.sider')) })
    const size = useSize(sider) ?? { width: 0 }
    
    return <>
        <div className='bottom-fixed-placeholder'/>
        <div 
            className='bottom-fixed-footer' {...props} 
            style={{ width: `calc(100% - ${size.width}px)`, left: size.width + 'px' }}
        />
    </>
}
