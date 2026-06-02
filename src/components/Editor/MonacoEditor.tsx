import './MonacoEditor.sass'

import { useEffect, useRef } from 'react'

import type { editor } from 'monaco-editor'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
export type { monacoapi }

export type Monaco = typeof monacoapi
export type CodeEditor = monacoapi.editor.IStandaloneCodeEditor

import { delay, load_script, deep_equals } from 'xshell/utils.browser.js'

import { language, t } from '@i18n'


export function MonacoEditor ({
    theme = 'light',
    default_value,
    readonly,
    language = 'plaintext',
    observe_resize,
    options,
    on_change,
    on_loaded,
    before_create_editor,
    on_save,
}: {
    theme?: 'light' | 'dark'
    default_value?: string
    readonly?: boolean
    language?: string
    observe_resize?: boolean
    options?: editor.IStandaloneEditorConstructionOptions
    on_change? (value: string): void
    on_loaded? (
        monaco: Monaco,
        editor: CodeEditor
    ): void
    on_save? (text: string): void
    before_create_editor? (monaco: Monaco): Promise<void>
} = { }) {
    let reditor = useRef<CodeEditor>(undefined)
    
    let rdiv = useRef<HTMLDivElement>(undefined)
    
    let roption = useRef<editor.IStandaloneEditorConstructionOptions>(options)
    
    useEffect(() => {
        (async () => {
            let monaco = await load_monaco()
            
            if (before_create_editor)
                await before_create_editor(monaco)
            
            let editor = reditor.current = monaco.editor.create(
                rdiv.current,
                {
                    model: monaco.editor.createModel(default_value || '\n', language),
                    automaticLayout: observe_resize || false,
                    
                    // 禁用错误波浪线
                    renderValidationDecorations: 'off',
                    
                    readOnly: readonly,
                    domReadOnly: readonly,
                    
                    theme: theme === 'light' ? 'light' : 'vs-dark',
                    
                    ...default_options,
                    
                    ...options
                })
            
            if (on_change)
                editor.getModel().onDidChangeContent(event => {
                    on_change(get_editor_value(editor))
                })
            
            editor.addAction({
                id: 'save',
                
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                ],
                
                label: t('保存代码'),
                
                run () {
                    on_save?.(get_editor_value(editor))
                },
            })
            
            
            editor.addAction({
                id: 'duplicate_line',
                
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
                ],
                
                label: t('向下复制行'),
                
                async run (editor: CodeEditor) {
                    await editor.getAction('editor.action.copyLinesDownAction').run()
                }
            })
            
            editor.addAction({
                id: 'delete_lines',
                
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY
                ],
                
                label: t('删除行'),
                
                async run (editor: CodeEditor) {
                    await editor.getAction('editor.action.deleteLines').run()
                }
            })
            
            try {
                // 使 suggest details 始终保持显示
                // https://github.com/microsoft/monaco-editor/issues/3216
                // monaco@0.35.0 采用 minify 过的代码，在不使用 esm bundle 的情况下，无法直接访问 suggestWidget 的属性
                // 我们采用一种暴力的方法，直接访问 suggestWidget 的私有属性
                // 可以从 esm 包中找到原函数 (monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestWidget.js)
                // 文件内搜索 `_setDetailsVisible` 可以搜 "expandSuggestionDocs" 这个字段
                // 然后对比 dev 包中的代码 (monaco-editor/dev/vs/editor/editor.main.js)
                // 也搜索 "expandSuggestionDocs" 这个字段，找到 `_setDetailsVisible` minify 之后的函数名（现在是 X），写在下面
                // edit: 0.37.0 版本又改回来了，直接调用 _setDetailsVisible 就可以了
                 
                (editor.getContribution('editor.contrib.suggestController') as any).widget.value._setDetailsVisible(true)
            } catch (error) {
                console.warn('failed to set suggest details visible', error)
            }
            
            on_loaded?.(monaco, editor)
        })()
        
        return () => { reditor.current?.dispose() }
    }, [ ])
    
    // options 更新时重新应用
    useEffect(() => {
        if (deep_equals(options, roption.current))
            return
        
        roption.current = options
        reditor.current?.updateOptions(options)
    }, [options])
    
    return <div className={`monaco-editor-container ${theme}`} ref={rdiv} />
}


let monaco: Monaco
let pmonaco: Promise<Monaco>

async function load_monaco () {
    if (monaco)
        return monaco
    
    return pmonaco ??= new Promise<Monaco>(async (resolve, reject) => {
        try {
            await load_script(`${loader_config.paths.vs}/loader.js`)
            const { require } = window as any as { require: Function & { config: Function } }
            require.config(loader_config)
            
            // 需要等一会之后 require 才不报错
            await delay(300)
            
            require(
                ['vs/editor/editor.main'],
                (mod: any) => { resolve(monaco = mod.m) },
                reject)
        } catch (error) {
            reject(error)
        } finally {
            pmonaco = null
        }
    })
}


const get_value_options = { preserveBOM: false, lineEnding: '\n' } as const

export function get_editor_value (editor: CodeEditor) {
    return editor.getValue(get_value_options)
}


const loader_config = {
    paths: {
        // 必须是　vs, 否则 /vs/base/common/worker/simpleWorker.nls.js 路径找不到实际文件
        vs: `${location.origin}/vendors/monaco-editor/${ PRODUCTION ? 'min' : 'dev' }/vs`
    },
    
    ... language === 'zh' ? {
        'vs/nls': {
            availableLanguages: {
                '*': 'zh-cn'
            }
        }
    } : { }
}


const default_options: editor.IStandaloneEditorConstructionOptions = {
    minimap: {
        enabled: false
    },
    
    fontFamily: 'MyFont, monospace',
    fontSize: 18,
    insertSpaces: true,
    codeLensFontFamily: 'MyFont, monospace',
    folding: true,
    largeFileOptimizations: true,
    matchBrackets: 'always',
    smoothScrolling: false,
    suggest: {
        insertMode: 'replace',
        snippetsPreventQuickSuggestions: false
    },
    
    wordBasedSuggestions: 'allDocuments',
    
    mouseWheelZoom: true,
    guides: {
        indentation: false,
        bracketPairs: false,
        highlightActiveIndentation: false
    },
    
    detectIndentation: true,
    tabSize: 4,
    
    codeLens: true,
    roundedSelection: false,
    wordWrap: 'on',
    
    scrollBeyondLastLine: false,
    scrollbar: {
        vertical: 'visible'
    },
    
    find: {
        loop: true,
        seedSearchStringFromSelection: 'selection'
    },
    
    acceptSuggestionOnCommitCharacter: false,
    
    mouseWheelScrollSensitivity: 2,
    dragAndDrop: false,
    renderControlCharacters: true,
    lineNumbers: 'on',
    showFoldingControls: 'mouseover',
    foldingStrategy: 'indentation',
    accessibilitySupport: 'off',
    autoIndent: 'advanced',
    snippetSuggestions: 'none',
    renderLineHighlight: 'none',
    trimAutoWhitespace: false,
    hideCursorInOverviewRuler: true,
    renderWhitespace: 'none',
    overviewRulerBorder: true,
    
    gotoLocation: {
        multipleDeclarations: 'peek',
        multipleTypeDefinitions: 'peek',
        multipleDefinitions: 'peek'
    },
    
    foldingHighlight: false,
    unfoldOnClickAfterEndOfLine: true,
    
    inlayHints: {
        enabled: 'off'
    },
    
    acceptSuggestionOnEnter: 'off',
    
    quickSuggestions: {
        other: true,
        comments: true,
        strings: true
    },
    
    fixedOverflowWidgets: true,
    
    bracketPairColorization: {
        enabled: false
    },
    
    // https://github.com/microsoft/monaco-editor/issues/3829
    // @ts-ignore
    'bracketPairColorization.enabled': false
}
