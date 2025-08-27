// 在 index.html 和 window.html 中共用的方法

import favicon_italic from './icons/favicon.italic.svg'
import favicon from './icons/favicon.png'

export function apply_favicon (shf: boolean) {
    let link = document.createElement('link')
    link.rel = 'icon'
    link.type = shf ? 'image/png' : 'image/svg+xml'
    link.href = shf ? favicon : favicon_italic
    
    document.head.appendChild(link)
    
    return link
}