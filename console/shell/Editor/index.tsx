import './index.sass'

import { useEffect, useMemo, useState } from 'react'

import { Editor as MonacoEditor, loader, type OnChange, type OnMount } from '@monaco-editor/react'

import type monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
export type Monaco = typeof monacoapi
export type { monacoapi }

import { MonacoDolphinDBEditor } from 'monaco-dolphindb/react'

import { loadWASM } from 'vscode-oniguruma'


import type { Docs } from 'dolphindb/docs.js'

import { request_json } from 'xshell/net.browser.js'

import { t, language } from '../../../i18n/index.js'

import { model } from '../../model.js'


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

// 缓存
let _docs: Docs


export function Editor ({
    readonly,
    default_value,
    value,
    minimap = false,
    enter_completion,
    on_mount,
    on_change,
    options,
    theme = 'light'
}: {
    readonly?: boolean
    default_value?: string
    value?: string
    minimap?: boolean
    enter_completion?: boolean
    on_mount?: OnMount
    on_change?: OnChange
    options?: monacoapi.editor.IStandaloneEditorConstructionOptions
    theme?: 'light' | 'dark'
}) {
    const [docs, set_docs] = useState<Docs>(_docs)
    
    useEffect(() => {
        (async () => {
            if (!_docs) 
                set_docs(_docs = await request_json(`docs.${ language === 'zh' ? 'zh' : 'en' }.json`))
        })()
    }, [ ])
    
    const monaco_options = useMemo<monacoapi.editor.IStandaloneEditorConstructionOptions>(() => ({
            fontSize: 16,
            
            minimap: { enabled: minimap },
            
            fixedOverflowWidgets: true,
            
            acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
            
            ... readonly ? {
                readOnly: true,
                domReadOnly: true,
            } : { },
            
            ...options,
        }),
        [minimap, enter_completion, readonly, options]
    )
    
    return docs && <MonacoDolphinDBEditor
            dolphinDBLanguageOptions={{
                docs,
                theme
            }}
            
            wrapperProps={{ className: `monaco-editor-container ${theme}` }}
            
            value={value}
            
            theme={theme === 'light' ? 'vs' : 'vs-dark'}
            
            defaultValue={default_value}
            
            loading={<div className='editor-loading'>{t('正在加载代码编辑器...')}</div>}
            
            beforeMonacoInit={async () => loadWASM(await fetch('./vendors/vscode-oniguruma/release/onig.wasm')) }
            
            onMonacoInitFailed={error => { model.show_error({ error }) }}
            
            options={monaco_options}
            
            onMount={on_mount}
            
            onChange={on_change}
        />
}

