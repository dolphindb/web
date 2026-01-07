import './index.sass'

import { useEffect, useRef } from 'react'
import { Collapse } from 'antd'
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
                [{
                    type: 'surface',
                    // { data: number[][], row_labels: string[], col_labels: string[] }
                    z: (data as any).data
                }],
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
        
        Plotly.relayout(
            rdiv.current, 
            get_layout(size, config))
    }, [size, config])
    
    return <div className='surface' ref={rdiv} />
}


function get_layout (
    { width, height }: { width: number, height: number },
    { title, title_size }: ISurfaceConfig
): Partial<Plotly.Layout> {
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
        ...layout
    }
}


const layout: Partial<Plotly.Layout> = {
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
    }, 
    xaxis: {
        gridcolor: '#888888',
        zerolinecolor: '#888888'
    },
    yaxis: {
        gridcolor: '#888888',
        zerolinecolor: '#888888'
    },
    modebar: {
        remove: ['logo'] as any
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
                </div>
            }
        ]}
    />
}


export interface ISurfaceConfig {
    title?: string
    title_size?: number
}
