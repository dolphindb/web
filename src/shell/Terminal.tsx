import '@xterm/xterm/css/xterm.css'

import { useEffect, useRef, useState } from 'react'

import { Terminal as XTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'

import { debounce } from 'lodash'

import { delay } from 'xshell/utils.browser.js'

import type { DdbMessage } from 'dolphindb/browser.js'


import { t } from '@i18n'

import { model } from '../model.js'

import { shell } from './model.js'


export function Terminal () {
    const { collapsed } = model.use(['collapsed'])
    
    const rterminal = useRef<HTMLDivElement>(undefined)
    
    const [font_loaded, set_font_loaded] = useState(false)
    
    useEffect(() => {
        if (!font_loaded) {
            (async () => {
                await document.fonts.ready
                console.log(t('字体已全部加载'))
                set_font_loaded(true)
            })()
            return
        }
        
        function printer ({ type, data }: DdbMessage) {
            if (type === 'print')
                shell.term.writeln(data as string)
        }
        
        const on_resize = debounce(
            () => {
                shell.fit_addon?.fit()
            },
            500,
            { leading: false, trailing: true }
        )
        
        window.addEventListener('resize', on_resize)
        
        ;(async () => {
            // --- init term
            let term = shell.term = new XTerminal({
                fontFamily: 'MyFont, Menlo, Ubuntu Mono, Consolas, Dejavu Sans Mono, Noto Sans Mono, PingFangSC, Microsoft YaHei, monospace',
                fontSize: 16,
                
                cursorStyle: 'bar',
                
                disableStdin: true,
                
                convertEol: true,
                
                allowProposedApi: true,
                
                scrollback: 100000,
                
                theme: {
                    background: '#ffffff',
                    foreground: '#000000',
                    cyan: '#821717',
                    yellow: '#ec7600',
                    blue: '#0070c0',
                    brightBlack: '#8e908c',
                    magenta: '#800080',
                    red: '#df0000',
                    selectionBackground: '#add6ff'
                }
            })
            
            term.loadAddon(shell.fit_addon = new FitAddon())
            
            if (document.createElement('canvas').getContext('webgl2'))
                term.loadAddon(new WebglAddon())
            
            term.attachCustomKeyEventHandler(event => {
                const is_win = navigator.platform.includes('Win')
                const is_linux = navigator.platform.includes('Linux')
                if ((is_win || is_linux) && event.ctrlKey && event.key === 'c' && term.hasSelection()) {
                    document.execCommand('copy')
                    return false
                }
                return true
            })
            
            term.open(rterminal.current)
            
            
            model.ddb.listeners.push(printer)
            
            // 删去这句话，首次点击会失效
            rterminal.current.children[0]?.dispatchEvent(new Event('mousedown'))
            
            term.writeln(
                t('左侧编辑器使用指南:\n') +
                t('按 Tab 或 Enter 补全函数\n') +
                t('按 Ctrl + E 执行选中代码或光标所在行代码，点击 执行中 可取消作业\n') +
                t('按 Ctrl + Shift + E 执行选中代码或全部代码\n') +
                t('按 Ctrl + D 向下复制行\n') +
                t('按 Ctrl + Y 删除行\n') +
                t('按 F1 查看更多编辑器命令')
            )
        })()
        
        return () => {
            model.ddb.listeners = model.ddb.listeners.filter(handler => handler !== printer)
            
            window.removeEventListener('resize', on_resize)
        }
    }, [font_loaded])
    
    useEffect(() => {
        // wait for container ready
        (async () => {
            await delay(500)
            shell.fit_addon?.fit()
        })()
    }, [collapsed])
    
    return font_loaded ?
        <div className='term' ref={rterminal} />
    :
        <div className='term-loading'>{t('正在加载字体...')}</div>
}
