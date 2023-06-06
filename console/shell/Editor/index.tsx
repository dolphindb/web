import './index.sass'

import { default as React, useEffect, useState } from 'react'

import { Editor as MonacoEditor, loader, type OnChange, type OnMount } from '@monaco-editor/react'

import type monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
export type Monaco = typeof monacoapi
export type { monacoapi }

import { loadWASM } from 'vscode-oniguruma'


import { t, language } from '../../../i18n/index.js'

import { model } from '../../model.js'

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

let monaco_initing = false


export function Editor ({
    readonly,
    default_value,
    value,
    minimap,
    enter_completion,
    on_mount,
    on_change,
    options,
}: {
    readonly?: boolean
    default_value?: string
    value?: string
    minimap?: boolean
    enter_completion?: boolean
    on_mount?: OnMount
    on_change?: OnChange
    options?: monacoapi.editor.IStandaloneEditorConstructionOptions
}) {
    const [monaco_inited, set_monaco_inited] = useState(Boolean(monaco))
    
    useEffect(() => {
        (async () => {
            if (!monaco && !monaco_initing) {
                monaco_initing = true
                
                try {
                    let _monaco = await loader.init() as typeof monacoapi
                    
                    const pdocs = load_docs()
                    
                    // Using the response directly only works if the server sets the MIME type 'application/wasm'.
                    // Otherwise, a TypeError is thrown when using the streaming compiler.
                    // We therefore use the non-streaming compiler :(.
                    await loadWASM(await fetch('./vendors/vscode-oniguruma/release/onig.wasm'))
                    
                    let { languages } = _monaco
                    
                    languages.register({ id: 'dolphindb' })
                    
                    await register_tokenizer(languages)
                    
                    register_docs(languages)
                    
                    await document.fonts.ready
                    
                    await pdocs
                    
                    monaco = _monaco
                    
                    set_monaco_inited(true)
                    
                    console.log('monaco 已初始化')
                } catch (error) {
                    model.show_error(error)
                    throw error
                } finally {
                    monaco_initing = false
                }
            }
        })()
    }, [ ])
    
    
    return monaco_inited ?
        <MonacoEditor
            wrapperProps={{ className: 'monaco-editor-container' }}
            
            defaultLanguage='dolphindb'
            
            language='dolphindb'
            
            value={value}
            
            defaultValue={default_value}
            
            options={{
                ...settings,
                
                minimap: {
                    ... settings.minimap,
                    ... minimap === undefined ? { } : { enabled: minimap }
                },
                
                acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
                
                ... readonly ? {
                    readOnly: true,
                    domReadOnly: true,
                } : { },
                
                ...options,
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

