import './index.sass'

import { useEffect, useRef, useState } from 'react'

import { Button, Collapse, DatePicker, Form, Input, Slider, Tooltip, Select } from 'antd'

import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons'

import dayjs from 'dayjs'

import { check, datetime_format } from 'xshell/utils.browser.js'

import { t } from '@i18n'
import { model } from '@model'

import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'
import { DdbForm, type DdbTableData } from 'dolphindb/browser.js'
import { parse_code } from '@/dashboard/utils.ts'
import type { DataSource } from '@/dashboard/DataSource/date-source.ts'


export function Configuration ({ widget, data_source }: GraphComponentProps<Data>) {
    const {
        background,
        text_mappings: text_mappings_config,
        color_mappings: color_mappings_config,
        replay
    } = widget.config as IConfigurationConfig
    
    const { data } = data_source
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let rreplaying = useRef(false)
    
    let rsvg = useRef<SVGSVGElement>(undefined)
    
    const now = dayjs()
    
    let [min_time, set_min_time] = useState(now.startOf('day'))
    let [max_time, set_max_time] = useState(now.endOf('day'))
    
    let [playing, set_playing] = useState(false)
    
    let rplayer = useRef<number>(undefined)
    let rplayer_counter = useRef<number>(0)
    
    /** 存储 slider 时间值 */
    let rslider = useRef<number>(min_time.valueOf())
    
    let rrate = useRef<number>(1)
    
    async function update_svg_data (time: number) {
        update_svg(
            rsvg.current,
            await update_data(data_source, replay, time),
            text_mappings_config,
            color_mappings_config)
    }
    
    function switch_playing () {
        set_playing(!playing)
        rplayer_counter.current = 0
        
        if (playing) {
            clearInterval(rplayer.current)
            rplayer.current = null
        } else
            rplayer.current = setInterval(
                async () => {
                    await update_svg_data(rslider.current + rplayer_counter.current * rrate.current * 1000)
                    ++rplayer_counter.current
                },
                1000
            ) as any as number
    }
    
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
        if (!rreplaying.current)
            update_svg(rsvg.current, data, text_mappings_config, color_mappings_config)
    }, [background, data, text_mappings_config, color_mappings_config])
    
    
    // 组件卸载时清理 interval
    useEffect(() => {
        return () => {
            if (rplayer.current)
                clearInterval(rplayer.current)
        }
    }, [ ])
    
    
    return <div className='configuration-diagram'>
        <div className='diagram' ref={rdiv} />
        { replay && <div className='actions'>
            <DatePicker
                className='time'
                showTime
                size='small'
                format={datetime_format}
                value={min_time}
                onChange={value => {
                    set_min_time(value)
                }}
            />
            
            <Slider
                className='slider'
                min={min_time.valueOf()}
                max={max_time.valueOf()}
                tooltip={{ formatter: value => dayjs(value).format(datetime_format) }}
                onChangeComplete={async (time: number) => {
                    rslider.current = time
                    rplayer_counter.current = 0
                    
                    if (playing)
                        switch_playing()
                    
                    if (time === max_time.valueOf()) {
                        rreplaying.current = false
                    } else {
                        rreplaying.current = true
                        
                        update_svg_data(time)
                    }
                }}
            />
            
            <Tooltip title='从选定的时间开始回放'>
                <Button type='text' disabled={!rreplaying.current}>
                    { playing
                        ? <PauseOutlined className='player-icon' onClick={switch_playing} />
                        : <CaretRightOutlined className='player-icon' disabled={!rreplaying.current} onClick={switch_playing} />}
                </Button>
            </Tooltip>
            
            <Tooltip title='回放速率'>
                <Select
                    className='rate'
                    options={[1, 2, 3, 4, 6, 8, 10, 16, 30, 60, 300, 1800, 3600].map(rate => ({ value: rate, label: `x${rate}` }))}
                    defaultValue={1}
                    onSelect={rate => { rrate.current = rate }}
                />
            </Tooltip>
            
            <DatePicker
                className='time'
                showTime
                size='small'
                format={datetime_format}
                value={max_time}
                onChange={value => {
                    set_max_time(value)
                }}
            />
        </div> }
    </div>
}


async function update_data (data_source: DataSource, code: string, time: number) {
    const obj = await (data_source.ddb?.streaming ? model.ddb : data_source.ddb || model.ddb)
        .eval(
            parse_code(
                code.replaceAll(
                    '{{time}}', 
                    dayjs(time).format(datetime_format)))
        )
    
    check(obj.form === DdbForm.table, t('返回的结果需要是表格'))
    
    return obj.data<DdbTableData<Data>>().data
}


function update_svg ($svg: SVGSVGElement, data: Data[], text_mappings_config: string, color_mappings_config: string) {
    if (!data)
        return
    
    const $texts: SVGElement[] = Array.prototype.filter.call(
        $svg.children, 
        ($e: SVGElement) => $e.tagName === 'text' && $e.id)
    
    const data_ = data.reduce((acc, { id, value }) =>
        ((acc[id] = value), acc)
    , { })
    
    const text_mappings = parse_mappings_config(text_mappings_config)
    
    const color_mappings = parse_mappings_config(color_mappings_config)
    
    // dump ids
    // console.log($texts.map(({ id }) => id))
    
    $texts.forEach($text => {
        const { id } = $text
        const value = data_[text_mappings[id] || id]
        
        if (value !== undefined)
            $text.textContent = value
    })
    
    for (const selector in color_mappings)
        $svg.querySelectorAll(selector)
            .forEach(($element: SVGElement) => {
                const color = data_[color_mappings[selector]]
                if (color)
                    // local
                    // console.log($element, color)
                    $element.style.fill = color
            })
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


export function ConfigurationConfig ({ widget }: GraphConfigProps) {
    // const $texts: SVGTextElement[] = widget.data?.$texts
    
    return <Collapse 
        items={[
            {
                key: 'basic',
                label: t('基本属性'),
                forceRender: true,
                children: <div className='axis-wrapper'>
                    <Form.Item name='background' label={t('svg 背景图')}>
                        <Input.TextArea autoSize={rows} placeholder={t('粘贴 svg 文件内容')} />
                    </Form.Item>
                    
                    <Form.Item name='replay' label={t('历史回放')} tooltip={replay_tooltip}>
                        <Input.TextArea autoSize={rows} placeholder={replay_tooltip} />
                    </Form.Item>
                </div>
            },
            {
                key: 'mappings',
                label: t('数据映射'),
                forceRender: true,
                children: <div className='axis-wrapper svg-mappings'>
                    <Form.Item name='text_mappings' label={t('文本映射')} tooltip={t('一行一个映射，用英文冒号分隔，左边是背景中的文本 id，右边是数据 id，如:\ntext_id_0: data_id_0')}>
                        <Input.TextArea autoSize={rows} placeholder={'text_id_0: data_id_0\ntext_id_1: data_id_1'} />
                    </Form.Item>
                    <Form.Item name='color_mappings' label={t('颜色映射')} tooltip={t('一行一个映射，用英文冒号分隔，左边是背景中的元素选择器，右边是数据 id，如:\nselector_0: data_id_0')}>
                        <Input.TextArea autoSize={rows} placeholder={'selector_0: data_id_0\nselector_1: data_id_1'} />
                    </Form.Item>
                </div>
            }
        ]}
    />
}


const replay_tooltip = t('填写用于查询历史回放的脚本，支持 {{time}} 变量')

const rows = { minRows: 4, maxRows: 4 } as const


interface Data {
    id: string
    value: string
}

export interface IConfigurationConfig {
    background: string
    text_mappings: string
    color_mappings: string
    replay: string
}
