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
    const {
        background,
        text_mappings: text_mappings_config,
        color_mappings: color_mappings_config
    } = widget.config as IConfigurationConfig
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let rstreaming = useRef(true)
    
    let rsvg = useRef<SVGSVGElement>(undefined)
    
    
    useEffect(() => {
        if (!background)
            return
        
        let { current: $div } = rdiv
        
        $div.innerHTML = background
        
        let $svg = rsvg.current = $div.firstElementChild as SVGSVGElement
        
        if (!$svg)
            return
        
        if ($svg.tagName !== 'svg')
            throw new Error('非 svg 背景图')
    }, [background])
    
    useEffect(() => {
        let { current: $svg } = rsvg
        
        if (!$svg)
            return
        
        const $texts: SVGElement[] = Array.prototype.filter.call(
            $svg.children, 
            ($e: SVGElement) => $e.tagName === 'text' && $e.id)
        
        if (!data_source || !rstreaming.current)
            return
        
        const data = data_source.reduce((acc, { id, value }) =>
            ((acc[id] = value), acc)
        , { })
        
        const text_mappings = parse_mappings_config(text_mappings_config)
        
        const color_mappings = parse_mappings_config(color_mappings_config)
        
        // dump ids
        // console.log($texts.map(({ id }) => id))
        
        $texts.forEach($text => {
            const { id } = $text
            const value = data[text_mappings[id] || id]
            
            if (value !== undefined)
                $text.textContent = value
        })
        
        for (const selector in color_mappings)
            $svg.querySelectorAll(selector)
                .forEach(($element: SVGElement) =>
                    $element.style.fill = data[color_mappings[selector]])
    }, [background, data_source, text_mappings_config, color_mappings_config])
    
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


function parse_mappings_config (config?: string): Record<string, string> {
    return config?.split_lines()
        .reduce((acc, line) => {
            line = line.trim()
            if (!line)
                return acc
            
            const [key, data_id] = line.split2(':', { optional: true })
                .map(x => x.trim())
            if (!data_id)
                return acc
            
            acc[key] = data_id
            return acc
        }, { }) || { }
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
                    <Form.Item name='text_mappings' label={t('文本映射')} tooltip={t('一行一个映射，用英文冒号分隔，左边是背景中的文本 id，右边是数据 id，如:\ntext_id_0: data_id_0')}>
                        <Input.TextArea autoSize={{ minRows: 4 }} placeholder={'text_id_0: data_id_0\ntext_id_1: data_id_1'} />
                    </Form.Item>
                    <Form.Item name='color_mappings' label={t('颜色映射')} tooltip={t('一行一个映射，用英文冒号分隔，左边是背景中的元素选择器，右边是数据 id，如:\nselector_0: data_id_0')}>
                        <Input.TextArea autoSize={{ minRows: 4 }} placeholder={'selector_0: data_id_0\selector_1: data_id_1'} />
                    </Form.Item>
                </div>
            }
        ]}
    />
}


export interface IConfigurationConfig {
    background: string
    text_mappings: string
    color_mappings: string
}
