import './Surface.sass'

import { useEffect, useRef } from 'react'
import { useSize } from 'ahooks'

import { delay, load_script } from 'xshell/utils.browser.js'

import { dark_background } from '@theme'
import type { ChartConfig } from '@/obj.tsx'


let Plotly: typeof import('plotly.js-dist-min')


export function Surface ({
    data,
    options,
    plotlyjs
}: {
    data: number[][]
    options: SurfaceOptions
    plotlyjs: string
}) {
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let size = useSize(rdiv)
    
    let rinited = useRef<boolean>(false)
    
    
    useEffect(() => {
        let { current: div } = rdiv
        
        ;(async () => {
            const pdelay = delay(100)
            
            if (!Plotly) {
                await load_script(plotlyjs)
                ;({ default: Plotly } = await import('plotly.js-dist-min'))
            }
            
            await pdelay
            
            Plotly.newPlot(
                div,
                get_data(data),
                get_layout(
                    { width: div.clientWidth, height: div.clientHeight },
                    options))
            
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
            get_layout(size, options))
    }, [size, options, data])
    
    return <div className='surface-chart' ref={rdiv} />
}


function get_data (data: any) {
    return [{
        type: 'surface',
        z: data
    }] satisfies Plotly.Data[]
}


export function get_surface_options ({ titles, font }: ChartConfig): SurfaceOptions {
    return {
        // title: titles.chart,
        font,
        ... Object.fromEntries(
            axises.map(a => [`${a}axis`, titles[`${a}_axis`]])),
    }
}


function get_layout (
    { width, height }: { width: number, height: number },
    options: SurfaceOptions
): Partial<Plotly.Layout> {
    const { title, title_size, font } = options
    
    return {
        width,
        height,
        
        title: {
            yanchor: 'top',
            y: 5,
            text: title,
            font: {
                color: '#ffffff',
                size: title_size || 13,
            }
        },
        
        scene: Object.fromEntries(
            axises.map(a => {
                const axis = `${a}axis`
                
                return [axis, {
                    title: { text: options[axis] },
                    gridcolor: '#888888'
                } satisfies Partial<Plotly.SceneAxis>]
            })),
        
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
            ... font ? { family: font } : { }
        }
    }
}


export interface SurfaceOptions {
    title?: string
    title_size?: number
    
    xaxis?: string
    yaxis?: string
    zaxis?: string
    
    font?: string
}


export const axises = ['x', 'y', 'z'] as const


export function get_plotlyjs (assets_root: string) {
    return `${assets_root}vendors/plotly.js-dist-min/plotly.min.js`
}

