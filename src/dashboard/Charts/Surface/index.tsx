import './index.sass'

import { useEffect, useRef } from 'react'
import { Collapse, Form, Input } from 'antd'
import { useSize } from 'ahooks'

import { delay, load_script } from 'xshell/utils.browser.js'

import { t } from '@i18n'
import { dark_background } from '@theme'
import { model } from '@model'
import type { GraphComponentProps } from '@/dashboard/graphs.ts'
import { TitleFields } from '@/dashboard/ChartFormFields/components/Title.tsx'


let Plotly: typeof import('plotly.js-dist-min')


export function Surface ({ widget, data_source }: GraphComponentProps) {
    const config = widget.config as ISurfaceConfig
    
    const { data } = data_source
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let size = useSize(rdiv)
    
    let rinited = useRef<boolean>(false)
    
    
    useEffect(() => {
        let { current: div } = rdiv
        
        ;(async () => {
            const pdelay = delay(100)
            
            if (!Plotly) {
                await load_script(`${model.assets_root}vendors/plotly.js-dist-min/plotly.min.js`)
                ;({ default: Plotly } = await import('plotly.js-dist-min'))
            }
            
            await pdelay
            
            Plotly.newPlot(
                div,
                get_data(data),
                get_layout(
                    { width: div.clientWidth, height: div.clientHeight },
                    config))
            
            rinited.current = true
        })()
        
        return () => { Plotly?.purge(div) }
    }, [ ])
    
    
    useEffect(() => {
        if (!rinited.current || !size)
            return
        
        Plotly.react(
            rdiv.current,
            get_data(data),
            get_layout(size, config))
    }, [size, config, data])
    
    return <div className='surface' ref={rdiv} />
}


function get_data (data: any) {
    return [{
        type: 'surface',
        // { data: number[][], row_labels: string[], col_labels: string[] }
        z: data.data
    }] satisfies Plotly.Data[]
}


function get_layout (
    { width, height }: { width: number, height: number },
    config: ISurfaceConfig
): Partial<Plotly.Layout> {
    const { title, title_size } = config
    
    return {
        width,
        height,
        
        title: {
            yanchor: 'top',
            y: 5,
            text: title,
            font: {
                color: '#ffffff',
                size: title_size || 13
            }
        },
        
        scene: axises.reduce(
            (scene, a) => {
                const axis = `${a}axis`
                const name = config[axis]
                if (name)
                    scene[axis] = { title: { text: name } }
                return scene
            },
            { } as Partial<Plotly.Layout['scene']>),
        
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 35
        },
        
        paper_bgcolor: dark_background, // 图表外部背景
        plot_bgcolor: dark_background, // 绘图区域背景
        font: {
            // 默认文字颜色
            color: '#ffffff',
            ... model.shf ? { family: 'MyFont' } : { }
        }
    }
}


export function SurfaceConfig () {
    return <Collapse
        items={[
            {
                key: 'basic',
                label: t('基本属性'),
                forceRender: true,
                children: <div className='axis-wrapper'>
                    <TitleFields />
                    {axises.map(a => 
                        <AxisNameField axis={a} key={a} />)}
                </div>
            }
        ]}
    />
}


export interface ISurfaceConfig {
    title?: string
    title_size?: number
    
    xaxis?: string
    yaxis?: string
    zaxis?: string
}


const axises = ['x', 'y', 'z'] as const


function AxisNameField ({ axis }: { axis: 'x' | 'y' | 'z' }) {
    return <Form.Item name={`${axis}axis`} label={t('{{axis}} 轴名称', { axis })}>
        <Input />
    </Form.Item>
}
