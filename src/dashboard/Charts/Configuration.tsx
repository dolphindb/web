import { useEffect, useRef } from 'react'

import { Collapse, Form, Input } from 'antd'

import { delay } from 'xshell/utils.browser.js'

import { t } from '@i18n'
import { dashboard, type Widget } from '@/dashboard/model.ts'


interface Data {
    name: string
    value: number
}


export function Configuration ({ widget, data_source }: { widget: Widget, data_source: Data[] }) {
    const { background, mappings } = widget.config as IConfigurationConfig
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    useEffect(() => {
        if (!background)
            return
        
        let { current: $div } = rdiv
        
        $div.innerHTML = background
        
        let $svg = $div.firstElementChild as SVGSVGElement
        
        if (!$svg)
            return
        
        if ($svg.tagName !== 'svg')
            throw new Error('非 svg 背景图')
        
        widget.data = {
            $texts: Array.prototype.filter.call(
                $svg.children, 
                ($e: SVGElement) => $e.tagName === 'text' && $e.id)
        }
    }, [background])
    
    useEffect(() => {
        const $texts: SVGTextElement[] = widget.data?.$texts
        
        if (!$texts || !data_source)
            return
        
        const data = data_source.reduce((acc, { name, value }) =>
            ((acc[name] = value), acc)
        , { })
        
        $texts.forEach($text => {
            const value = data[$text.id]
            
            if (value !== undefined)
                $text.textContent = value
            
            // const name = mappings[$text.id]
            // if (name !== undefined) {
            //     const value = data_source[name]
            //     
            //     if (value !== undefined)
            //         $text.textContent = value
            // }
        })
    }, [background, mappings, data_source])
    
    return <div ref={rdiv} />
}


export function ConfigurationConfig () {
    const { widget } = dashboard.use(['widget'])
    
    // const $texts: SVGTextElement[] = widget.data?.$texts
    
    return <Collapse 
        items={[
            {
                key: 'basic',
                label: t('基本属性'),
                forceRender: true,
                children: <div className='axis-wrapper'>
                    <Form.Item name='background' label={t('svg 背景图')}>
                        <Input.TextArea placeholder={t('粘贴 svg 文件内容')} />
                    </Form.Item>
                </div>
            },
            // {
            //     key: 'mappings',
            //     label: t('文本映射'),
            //     forceRender: true,
            //     children: <div className='axis-wrapper'>
            //         { $texts?.slice(0, 20).map(({ id }) => 
            //             <Form.Item
            //                 key={id}
            //                 name={['mappings', id]}
            //                 label={id}
            //             >
            //                 <Input />
            //             </Form.Item>
            //         ) }
            //     </div>
            // }
        ]}
    />
}


export interface IConfigurationConfig {
    background: string
    mappings: Record<string, string>
}
