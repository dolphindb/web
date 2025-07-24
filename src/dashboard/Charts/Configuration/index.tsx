import './index.sass'

import { useEffect, useRef, useState } from 'react'

import { Button, Collapse, DatePicker, Form, Input, Slider, Tooltip, Select } from 'antd'

import { CaretRightOutlined, FundViewOutlined, PauseOutlined } from '@ant-design/icons'

import dayjs from 'dayjs'

import { check, datetime_format } from 'xshell/utils.browser.js'

import { use_ref_state } from 'react-object-model/hooks.js'

import { DdbForm, type DdbTableData } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { model } from '@model'

import type { GraphComponentProps } from '@/dashboard/graphs.ts'
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
    
    let rsvg = useRef<SVGSVGElement>(undefined)
    
    const now = dayjs()
    
    let [min_time, set_min_time] = useState(now.startOf('day'))
    let [max_time, set_max_time] = useState(now.endOf('day'))
    
    let [playing, rplaying, set_playing] = use_ref_state<number>(0)
    
    /** 存储 slider 时间值 */
    let [slider_time, rslider_time, set_slider_time] = use_ref_state(max_time.valueOf())
    
    /** 播放速率 */
    let rrate = useRef<number>(1)
    
    const realtime = slider_time === max_time.valueOf()
    
    
    async function update_svg_data (time: number) {
        update_svg(
            rsvg.current,
            await update_data(data_source, replay, time),
            text_mappings_config,
            color_mappings_config)
    }
    
    
    function switch_playing () {
        if (rplaying.current) {
            clearInterval(rplaying.current)
            set_playing(0)
        } else
            set_playing(
                setInterval(
                    async () => {
                        const time_ = rslider_time.current + rrate.current * 1000
                        
                        // 到达最大时间后回放结束，切换为实时模式
                        if (time_ >= max_time.valueOf()) {
                            set_slider_time(max_time.valueOf())
                            if (rplaying.current) { // 应该总是为 true 的
                                switch_playing()
                                model.message.info(t('回放已到达结束时间，切换回实时模式'))
                            } else
                                console.warn('rplaying.current 不为 true, 很奇怪')
                        } else {
                            set_slider_time(time_)
                            await update_svg_data(time_)
                        }
                    },
                    1000
                ) as any as number
            )
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
            model.message.error({ content: t('非 svg 背景图') })
    }, [background])
    
    // 当 background, data, 图表配置 变化时，更新 svg 数据
    useEffect(() => {
        if (rslider_time.current === max_time.valueOf())
            update_svg(rsvg.current, data, text_mappings_config, color_mappings_config)
    }, [background, data, text_mappings_config, color_mappings_config])
    
    
    // 组件卸载时清理 interval
    useEffect(() => {
        return () => {
            if (rplaying.current) {
                clearInterval(rplaying.current)
                set_playing(0)
            }
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
                allowClear={false}
                value={min_time}
                onChange={value => {
                    set_min_time(value)
                    if (value > max_time)
                        set_max_time(value)
                }}
            />
            
            <Slider
                className='slider'
                value={slider_time}
                min={min_time.valueOf()}
                max={max_time.valueOf()}
                tooltip={{ formatter: value => dayjs(value).format(datetime_format) }}
                onChange={(time: number) => {
                    set_slider_time(time)
                }}
                onChangeComplete={(time: number) => {
                    set_slider_time(time)
                    update_svg_data(time)
                }}
            />
            
            <Tooltip title={realtime ? t('实时') : t('从选定的时间开始回放')}>
                { realtime ?
                    <FundViewOutlined className='player-icon realtime' />
                :
                    <Button className='player' type='text' onClick={switch_playing}>
                        { playing
                            ? <PauseOutlined className='player-icon' />
                            : <CaretRightOutlined className='player-icon' />}
                    </Button>
                 }
            </Tooltip>
            
            <Tooltip title={t('回放速率')}>
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
                allowClear={false}
                value={max_time}
                onChange={value => {
                    if (value < min_time)
                        model.message.warning('结束时间不能小于起始时间')
                    else
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
    
    return obj.data<Data[]>()
}


function update_svg ($svg: SVGSVGElement, data: Data[], text_mappings_config: string, color_mappings_config: string) {
    if (!data || !$svg?.children)
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


export function ConfigurationConfig () {
    return <Collapse 
        items={[
            {
                key: 'basic',
                label: t('基本属性'),
                forceRender: true,
                children: <div className='axis-wrapper'>
                    <Form.Item
                        name='background'
                        label={t('svg 背景图')}
                        tooltip={t('svg 中顶层的 text 元素且含有 id 属性可以被下面的文本映射替换为动态文本;\n有 id 或 class 属性的元素可以设置动态颜色\n数据源的格式为 id, value 两列的表')}
                    >
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
                    <Form.Item
                        name='text_mappings'
                        label={t('文本映射')}
                        tooltip={t('一行一个映射，用英文冒号分隔，左边是背景中的文本 id，右边是数据 id，如:\ntext_id_0: data_id_0')}
                    >
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
