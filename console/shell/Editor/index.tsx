import './index.sass'

import { default as React, useEffect, useState } from 'react'

import { Editor as MonacoEditor, loader, type OnChange, type OnMount } from '@monaco-editor/react'

import type monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
export type Monaco = typeof monacoapi
export type { monacoapi }

import { loadWASM } from 'vscode-oniguruma'


import { t, language } from '../../../i18n/index.js'

import { register_tokenizer, inject_css } from './tokenizer.js'
import { load_docs, register_docs, set_details_visible } from './docs.js'
import { settings } from './settings.js'


// 在 React DevTool 中显示的组件名字
MonacoEditor.displayName = 'MonacoEditor'

loader.config({
    paths: {
        // vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs'
        
        // 必须是　vs, 否则 /vs/base/common/worker/simpleWorker.nls.js 路径找不到实际文件
        vs: './vs'
    },
    ... language === 'zh' ? {
        'vs/nls': {
            availableLanguages: {
                '*': 'zh-cn'
            }
        }
    } : { },
})


let monaco: Monaco

let wasm_loaded = false


export function Editor ({
    readonly,
    default_value,
    value,
    minimap,
    enter_completion,
    on_mount,
    on_change,
}: {
    readonly?: boolean
    default_value?: string
    value?: string
    minimap?: boolean
    enter_completion?: boolean
    on_mount?: OnMount
    on_change?: OnChange
}) {
    const [monaco_inited, set_monaco_inited] = useState(Boolean(monaco))
    
    useEffect(() => {
        (async () => {
            if (!monaco_inited) {
                monaco = await loader.init() as typeof monacoapi
                
                if (!wasm_loaded) {
                    wasm_loaded = true
                    
                    load_docs()
                    
                    // Using the response directly only works if the server sets the MIME type 'application/wasm'.
                    // Otherwise, a TypeError is thrown when using the streaming compiler.
                    // We therefore use the non-streaming compiler :(.
                    await loadWASM(await fetch('./vendors/vscode-oniguruma/release/onig.wasm'))
                }
                
                let { languages } = monaco
                
                languages.register({ id: 'dolphindb' })
                
                await register_tokenizer(languages)
                
                register_docs(languages)
                
                await document.fonts.ready
                
                set_monaco_inited(true)
            }
        })()
    }, [ ])
    
    
    return monaco_inited ?
        <MonacoEditor
            defaultLanguage='dolphindb'
            
            language='dolphindb'
            
            value={value}
            
            defaultValue={default_value}
            
            options={{
                ...settings,
                
                minimap: {
                    ... settings.minimap,
                    enabled: minimap
                },
                
                acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
                
                ... readonly ? {
                    readOnly: true,
                    domReadOnly: true,
                } : { },
            }}
            
            onMount={(editor, monaco) => {
                set_details_visible(editor)
                
                inject_css()
                
                on_mount?.(editor, monaco)
            }}
            
            onChange={on_change}
        />
    :
        <div className='editor-loading'>{t('正在加载代码编辑器...')}</div>
}

