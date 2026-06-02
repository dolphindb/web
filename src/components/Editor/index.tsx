import './index.sass'

import { useEffect, useMemo } from 'react'

import { loadWASM } from 'vscode-oniguruma'

import { request_json } from 'xshell/net.browser.js'

import { DocsProvider } from 'dolphindb/docs.js'

import { use_rerender } from 'react-object-model/hooks.js'

import { t, language } from '@i18n'

import { model } from '@model'

import { MonacoEditor, monacoapi, Monaco, type CodeEditor } from './MonacoEditor.tsx'
import { register_monaco_language_providers, set_docs_provider } from './docs.ts'
import { register_tokenizer, set_color_map } from './tokenizer.ts'

export type { monacoapi, Monaco } from './MonacoEditor.tsx'


let docs_initing = false
let oniguruma: undefined | 'loading' | 'loaded'
let dolphindb_registered = false


/** language 为 dolphindb 的 editor */
export function Editor ({
    default_value,
    readonly = false,
    minimap = false,
    enter_completion,
    on_loaded,
    on_change,
    on_save,
    options,
    theme = 'light'
}: {
    default_value?: string
    readonly?: boolean
    minimap?: boolean
    enter_completion?: boolean
    on_loaded? (
        monaco: Monaco,
        editor: CodeEditor
    ): void
    on_change? (value: string): void
    on_save? (text: string): void
    options?: monacoapi.editor.IStandaloneEditorConstructionOptions
    theme?: 'light' | 'dark'
}) {
    const { docs } = model.use(['docs'])
    
    let rerender = use_rerender()
    
    const monaco_options = useMemo<monacoapi.editor.IStandaloneEditorConstructionOptions>(() => ({
            minimap: { enabled: minimap },
            
            acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
            ...options,
        }),
        [minimap, enter_completion, options])
    
    
    useEffect(() => {
        if (docs || docs_initing)
            return
        
        ;(async () => {
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
        })()
    }, [ ])
    
    useEffect(() => {
        if (oniguruma)
            return
        
        ;(async () => {
            oniguruma = 'loading'
            
            try {
                await loadWASM(await fetch(`${model.assets_root}vendors/vscode-oniguruma/release/onig.wasm`))
                
                oniguruma = 'loaded'
                
                rerender()
            } catch (error) {
                oniguruma = undefined
                
                throw error
            }
        })()
    }, [ ])
    
    
    if (!docs || !oniguruma)
        return <div className='editor-loading'>{t('正在加载代码编辑器...')}</div>
    
    return <MonacoEditor
        readonly={readonly}
        default_value={default_value}
        on_change={on_change}
        language='dolphindb'
        options={monaco_options}
        on_loaded={on_loaded}
        on_save={on_save}
        
        // 注册 dolphindb 语言相关
        before_create_editor={async monaco => {
            if (dolphindb_registered)
                return
            
            dolphindb_registered = true
            
            let { languages } = monaco
            
            languages.register({ id: 'dolphindb' })
            
            set_docs_provider(new DocsProvider(docs))
            register_monaco_language_providers(monaco)
            
            await register_tokenizer(languages)
            
            set_color_map(monaco, theme ?? 'light')
        }}
    />
}
