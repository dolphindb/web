import './index.sass'

import { useEffect, useMemo } from 'react'

import { Editor as MonacoEditor, loader, type OnChange, type OnMount } from '@monaco-editor/react'

import type monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
export type Monaco = typeof monacoapi
export type { monacoapi }

import { MonacoDolphinDBEditor } from 'monaco-dolphindb/react'

import { loadWASM } from 'vscode-oniguruma'

import { request_json } from 'xshell/net.browser.js'

import { t, language } from '../../../i18n/index.js'

import { model } from '@/model.ts'


// 在 React DevTool 中显示的组件名字
MonacoEditor.displayName = 'MonacoEditor'

loader.config({
    paths: {
        // 必须是　vs, 否则 /vs/base/common/worker/simpleWorker.nls.js 路径找不到实际文件
        // 必须是完整 https 前缀，不能只是路径，否则会报错
        vs: `${location.origin}${model.assets_root}vendors/monaco-editor/${ PRODUCTION ? 'min' : 'dev' }/vs`
    },
    ... language === 'zh' ? {
        'vs/nls': {
            availableLanguages: {
                '*': 'zh-cn'
            }
        }
    } : { },
})

let docs_initing = false


export function Editor ({
    class_name = 'editor',
    readonly = false,
    default_value,
    value,
    height,
    minimap = false,
    enter_completion,
    on_mount,
    on_change,
    options,
    theme = 'light'
}: {
    class_name?: string
    readonly?: boolean
    default_value?: string
    value?: string
    height?: number
    minimap?: boolean
    enter_completion?: boolean
    on_mount?: OnMount
    on_change?: OnChange
    options?: monacoapi.editor.IStandaloneEditorConstructionOptions
    theme?: 'light' | 'dark'
}) {
    const { docs } = model.use(['docs'])
    
    useEffect(() => {
        (async () => {
            if (!docs && !docs_initing) {
                docs_initing = true
                try {
                    model.set({
                        docs: await request_json(
                            `${model.assets_root}docs.${ language === 'zh' ? 'zh' : 'en' }.json`, 
                            { timeout: 1000 * 60 /* 文档可能比较大，默认 5s 超时可能会导致弱网环境出现文档加载超时错误的问题 */ })
                    })
                } finally {
                    docs_initing = false
                }
            }
        })()
    }, [ ])
    
    const monaco_options = useMemo<monacoapi.editor.IStandaloneEditorConstructionOptions>(() => ({
            fontSize: 16,
            
            minimap: { enabled: minimap },
            
            fixedOverflowWidgets: true,
            
            acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
            
            readOnly: readonly,
            domReadOnly: readonly,
            
            ...options,
        }),
        [minimap, enter_completion, readonly, options]
    )
    
    return docs ?
        <MonacoDolphinDBEditor
            className={class_name}
            
            dolphinDBLanguageOptions={{ docs, theme }}
            
            wrapperProps={{ className: `monaco-editor-container ${theme}` }}
            
            value={value}
            
            height={height}
            
            theme={theme === 'light' ? 'vs' : 'vs-dark'}
            
            defaultValue={default_value}
            
            loading={<div className='editor-loading'>{t('正在加载代码编辑器...')}</div>}
            
            beforeMonacoInit={async () => loadWASM(await fetch(`${model.assets_root}vendors/vscode-oniguruma/release/onig.wasm`)) }
            
            onMonacoInitFailed={error => { model.show_error({ error }) }}
            
            options={monaco_options}
            
            onMount={on_mount}
            
            onChange={on_change}
        />
    :
        <div className='editor-loading'>{t('正在加载代码编辑器...')}</div>
}

