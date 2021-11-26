import './shell.sass'

import 'xterm/css/xterm.css'

import 'prismjs/themes/prism.css'

import { default as React, useEffect, useRef, useState } from 'react'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import CodeEditor from 'react-simple-code-editor'

import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'

import { red } from 'xshell/chalk.browser'
import { ddb, DdbForm, DdbObj, DdbType } from './ddb.browser'

import icon_run from './run.svg'


export let term: Terminal

export function Shell () {
    const rterminal = useRef<HTMLDivElement>()
    
    useEffect(() => {
        (async () => {
            // --- init term
            term = new Terminal({
                fontFamily: 'MyFont',
                fontSize: 16,
                
                cursorStyle: 'bar',
                
                disableStdin: true,
                
                rendererType: 'canvas',
                
                convertEol: true,
                
                theme: {
                    background: '#ffffff',
                    foreground: '#000000',
                    cyan: '#821717',
                    yellow: '#ec7600',
                    blue: '#0070c0',
                    brightBlack: '#8e908c',
                    magenta: '#800080',
                    red: '#df0000',
                    selection: '#444444'
                }
            })
            
            const fit_addon = new FitAddon()
            
            term.loadAddon(fit_addon)
            
            term.open(rterminal.current)
            
            fit_addon.fit()
            
            // const result = await ddb.call('getEnv', ['PATH'])
            
            
            // --- 大数据上传测试
            const url = new URL(location.href)
            const length = url.searchParams.get('length')
            
            if (length) {
                let bigarr = new Float64Array(
                    Number(length)
                )
                bigarr.fill(1)
                
                const result = await ddb.call('typestr', [
                    new DdbObj({
                        form: DdbForm.vector,
                        type: DdbType.double,
                        length: 0,
                        rows: bigarr.length,
                        cols: 1,
                        value: bigarr
                    })
                ])
                
                term.writeln(
                    result.toString()
                )
            }
        })()
    }, [ ])
    
    return <div className='shell'>
        <div className='term' ref={rterminal} />
        <Editor />
    </div>
}

const default_code = '' as const

function Editor () {
    const [code, set_code] = useState<string>(default_code)
    
    async function run () {
        term.writeln(`[${new Date().to_str()}]`)
        term.writeln(code)
        term.writeln('---')
        
        try {
            let ddbobj = await ddb.eval(code)
            
            console.log(ddbobj)
            
            term.writeln(ddbobj.toString() + '\n\n')
        } catch (error) {
            term.writeln(red(error.message))
            throw error
        }
        
        set_code(default_code)
    }
    
    return <div className='editor'>
        <CodeEditor
            className='code-editor'
            value={code}
            onValueChange={ code => { set_code(code) } }
            highlight={ code => highlight(code, languages.ts) }
            padding={10}
            style={{
                fontFamily: 'MyFont',
                fontSize: 16,
                height: '20vh'
            }}
            tabSize={4}
            onKeyDown={(event /*: React.KeyboardEvent<HTMLTextAreaElement> */) => {
                const { key } = event
                const ctrl = event.getModifierState('Control')
                if (!ctrl || key !== 'Enter') return
                
                run()
                event.preventDefault()
            }}
        />
        
        <button
            className='run'
            onClick={() => { run() }}
        >
            <img className='icon' src={icon_run} />
            <span className='text'>运行</span>
        </button>
    </div>
}

export default Shell
