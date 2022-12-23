import 'xterm/css/xterm.css'

import './shell.sass'


import { default as React, useRef, useEffect, useState } from 'react'

import { Typography } from 'antd'
const { Title } = Typography

import { PageHeader } from '@ant-design/pro-layout'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebglAddon } from 'xterm-addon-webgl'
// import { WebLinksAddon } from 'xterm-addon-web-links'

import debounce from 'lodash/debounce.js'

import { connect_websocket } from 'xshell/net.browser.js'

import { t } from '../i18n/index.js'

import { model } from './model.js'


export function Shell () {
    const rterminal = useRef<HTMLDivElement>()
    
    const [font_loaded, set_font_loaded] = useState(false)
    
    useEffect(() => {
        if (!font_loaded) {
            ;(async () => {
                await document.fonts.ready
                console.log(t('字体已全部加载'))
                set_font_loaded(true)
            })()
            return
        }
        
        let term = new Terminal({
            fontFamily: 'MyFont, Menlo, Ubuntu Mono, Consolas, PingFangSC, Noto Sans CJK SC, Microsoft YaHei',
            fontSize: 16,
            
            cursorStyle: 'bar',
            
            cursorBlink: true,
            
            disableStdin: false,
            
            convertEol: true,
            
            allowProposedApi: true,
            
            theme: {
                background: '#ffffff',
                foreground: '#000000',
                cyan: '#821717',
                yellow: '#ec7600',
                blue: '#0070c0',
                brightBlack: '#8e908c',
                magenta: '#800080',
                red: '#df0000',
                selectionBackground: '#add6ff',
                cursor: '#000000'
            },
        })
        
        const fit_addon = new FitAddon()
        // const weblinks_addon = new WebLinksAddon()
        
        let ws: WebSocket
        
        term.loadAddon(fit_addon)
        // term.loadAddon(weblinks_addon)
        
        term.onData(input => {
            // console.log('input:', input)
            ws.send(JSON.stringify({ type: 'input', input }))
        })
        
        term.open(rterminal.current)
        
        term.loadAddon(new WebglAddon())
        
        fit_addon.fit()
        
        term.focus()
        
        
        function send_size () {
            ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }))
        }
        
        const params = new URLSearchParams(location.search)
        
        const node = params.get('node')
        
        document.title = `${node} - DolphinDB`
        
        const url = `${ location.protocol === 'https:' ? 'wss' : 'ws' }://${location.host}/v1/dolphindbs/${params.get('namespace')}/${params.get('cluster')}/instances/${node}/terminal`
        
        ;(async () => {
            ws = await connect_websocket(url, {
                on_close (event, ws) {
                    term.writeln(
                        t('连接已关闭')
                    )
                },
                
                on_error (event, ws) {
                    term.writeln(
                        t('连接出错: ') + url
                    )
                },
                
                on_message ({ data }, ws) {
                    if (typeof data === 'string')
                        term.write(data)
                    else
                        term.write(
                            new Uint8Array(data)
                        )
                }
            })
            
            term.writeln(
                t('已连接到: ') + url + '\n'
            )
            
            send_size()
        })()
        
        const on_resize = debounce(
            () => {
                fit_addon.fit()
                send_size()
            },
            500
        )
        
        window.addEventListener('resize', on_resize)
        
        return () => {
            ws?.close()
            
            term.dispose()
            
            window.removeEventListener('resize', on_resize)
        }
    }, [font_loaded])
    
    
    return <>
        <PageHeader
            className='shell-header'
            title={
                <Title level={3}>Shell</Title>
            }
            onBack={() => {
                model.set({ view: 'cloud' })
            }}
        />
        {font_loaded ?
            <div className='term' ref={rterminal} />
        :
            <div className='term-loading'>{t('正在加载字体...')}</div>
        }
    </>
}
