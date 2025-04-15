import './index.sass'

import { useEffect, useRef } from 'react'

import { Collapse, Form, Input, Slider } from 'antd'

import dayjs from 'dayjs'

import { delay, time_format } from 'xshell/utils.browser.js'

import { t } from '@i18n'
import { dashboard, type Widget } from '@/dashboard/model.ts'


interface Data {
    id: string
    value: number
}


export function Configuration ({ widget, data_source }: { widget: Widget, data_source: Data[] }) {
    const { background, mappings } = widget.config as IConfigurationConfig
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let rstreaming = useRef(true)
    
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
        
        if (!$texts || !data_source || !rstreaming.current)
            return
        
        const data = data_source.reduce((acc, { id, value }) =>
            ((acc[id] = value), acc)
        , { })
        
        const _mappings: Record<string, string> = mappings?.split_lines()
            .reduce((acc, line) => {
                line = line.trim()
                if (!line)
                    return acc
                
                const [svgid, dataid] = line.split2(',', { optional: true })
                    .map(x => x.trim())
                if (!dataid)
                    return acc
                
                acc[svgid] = dataid
                return acc
            }, { }) || { }
        
        // dump ids
        // console.log($texts.map(({ id }) => id))
        
        $texts.forEach($text => {
            const { id } = $text
            const value = data[_mappings[id] || id]
            
            if (value !== undefined)
                $text.textContent = Number(value).toFixed()
        })
    }, [background, mappings, data_source])
    
    const now = dayjs()
    const max = now.endOf('day').valueOf()
    
    return <div className='configuration-diagram'>
        <div className='diagram' ref={rdiv} />
        <Slider
            className='slider'
            min={now.startOf('day').valueOf()}
            max={max}
            tooltip={{ formatter: value => dayjs(value).format(time_format) }}
            onChangeComplete={value => {
                if (value === max)
                    rstreaming.current = true
                else {
                    rstreaming.current = false
                    
                    widget.data?.$texts.forEach($text => {
                        $text.textContent = (Math.random() * 100).toFixed()
                    })
                }
            }}
        />
    </div>
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
            {
                key: 'mappings',
                label: t('数据映射'),
                forceRender: true,
                children: <div className='axis-wrapper svg-mappings'>
                    <Form.Item name='mappings' label={t('文本映射')} tooltip={t('一行一个映射，用英文逗号分隔，如:\nsvgid0,dataid0')}>
                        <Input.TextArea autoSize={{ minRows: 4 }} placeholder={'svgid0,dataid0\nsvgid1,dataid1'} />
                    </Form.Item>
                </div>
            }
        ]}
    />
}


export interface IConfigurationConfig {
    background: string
    mappings: string
}
