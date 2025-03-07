import './index.sass'

import { useEffect, useRef } from 'react'

import { delay } from 'xshell/utils.browser.js'

import background_svg from './background.raw.svg'


export function Test () {
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    useEffect(() => {
        let { current: $div } = rdiv
        
        let $svg = $div.firstElementChild as SVGSVGElement
        
        let $texts: SVGTextElement[] = Array.prototype.filter.call(
            $svg.children, 
            ($e: SVGElement) => $e.tagName === 'text' && $e.id)
        
        ;(async () => {
            for (;;) {
                await delay(3000)
                
                $texts.forEach($text => 
                    $text.textContent = (Math.random() * 100).toFixed()
                )
            }
        })()
        
        
        // let $text = $svg.getElementById('r1_1')
        // $text.textContent = '啊啊啊啊啊啊啊啊啊啊啊啊'
    }, [ ])
    
    return <div ref={rdiv} dangerouslySetInnerHTML={{ __html: background_svg }} />
}
