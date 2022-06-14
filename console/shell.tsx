import 'xterm/css/xterm.css'

import './shell.sass'


import { default as React, useEffect, useRef } from 'react'

import { Resizable } from 're-resizable'

import { message } from 'antd'

import dayjs from 'dayjs'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import debounce from 'lodash/debounce.js'

import { default as MonacoEditor, loader } from '@monaco-editor/react'

import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
type Monaco = typeof monaco

import {
    ddb,
    DdbForm,
    type DdbMessage,
    DdbObj,
    DdbType
} from 'dolphindb/browser.js'

import { keywords, constants } from 'dolphindb/language.js'

// LOCAL
// import docs from 'dolphindb/docs.zh.json'
import docs_zh from 'dolphindb/docs.zh.json'
import docs_en from 'dolphindb/docs.en.json'


import { delta2str, delay } from 'xshell/utils.browser.js'
import { red, blue } from 'xshell/chalk.browser.js'

import { Model } from 'react-object-model'


import { t, language } from '../i18n/index.js'

import { Obj } from './obj.js'

import { model } from './model.js'


const docs = language === 'zh' ? docs_zh : docs_en

loader.config({
    paths: {
        vs: './monaco'
    },
    ... language === 'zh' ? {
        'vs/nls': {
            availableLanguages: {
                '*': 'zh-cn'
            }
        }
    } : { },
})


const constants_lower = constants.map(constant => 
    constant.toLowerCase())

const funcs = Object.keys(docs)
const funcs_lower = funcs.map(func => 
    func.toLowerCase())


class ShellModel extends Model<ShellModel> {
    term: Terminal
    
    fit_addon: FitAddon
    
    monaco: Monaco
    
    editor: monaco.editor.IStandaloneCodeEditor
    
    result: DdbObj
    
    
    async eval (code = this.editor.getValue()) {
        const time_start = dayjs()
        
        this.term.writeln(
            '\n\n' +
            time_start.format('YYYY.MM.DD HH:mm:ss.SSS')
        )
        
        try {
            let ddbobj = await ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            
            console.log(ddbobj)
            
            this.set({
                result: ddbobj,
            })
            
            this.term.writeln(
                (() => {
                    switch (ddbobj.form) {
                        case DdbForm.vector:
                        case DdbForm.set:
                        case DdbForm.matrix:
                        case DdbForm.table:
                        case DdbForm.chart:
                            return blue(
                                ddbobj.inspect_type().trimEnd()
                            ) + '\n'
                        
                        default: {
                            if (ddbobj.type === DdbType.void)
                                return ''
                            
                            return ddbobj.toString(true).trimEnd() + '\n'
                        }
                    }
                })() +
                `(${delta2str(
                    dayjs().diff(time_start)
                )})`
            )
        } catch (error) {
            this.term.writeln(
                red(error.message)
            )
            throw error
        }
    }
}

let shell = new ShellModel()


export function Shell () {
    return <>
        <Resizable
            className='editor-resizable'
            defaultSize={{ height: '100%', width: '60%' }}
            enable={{ top: false, right: true, bottom: false, left:false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <Editor />
        </Resizable>
        
        {/* <Resizable
            className='variables-resizable'
            defaultSize={{ height: '100%', width: '10%' }}
            enable={{ top: false, right: true, bottom: false, left:false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            variables
        </Resizable> */}
        
        <Display />
    </>
}


function Editor () {
    return <div className='editor'>
        <MonacoEditor
            defaultLanguage='dolphindb'
            
            language='dolphindb'
            
            theme='dolphindb-theme'
            
            options={{
                minimap: {
                    enabled: false
                },
                
                fontFamily: 'MyFont',
                fontSize: 16,
                insertSpaces: true,
                codeLensFontFamily: 'MyFont',
                folding: true,
                largeFileOptimizations: true,
                matchBrackets: 'always',
                smoothScrolling: false,
                suggest: {
                    insertMode: 'replace',
                    snippetsPreventQuickSuggestions: false,
                },
                
                wordBasedSuggestions: true,
                
                mouseWheelZoom: true,
                guides: {
                    indentation: false,
                    bracketPairs: false,
                    highlightActiveIndentation: false,
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
                    seedSearchStringFromSelection: 'selection',
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
                    multipleDefinitions: 'peek',
                },
                
                foldingHighlight: false,
                unfoldOnClickAfterEndOfLine: true,
                
                inlayHints: {
                    enabled: false,
                },
                
                acceptSuggestionOnEnter: 'off',
                
                quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true,
                },
            }}
            
            // theme='dolphindb-theme'
            
            beforeMount={monaco => {
                if (shell.monaco)
                    return
                
                let { languages, editor } = monaco
                const { CompletionItemKind } = languages
                
                languages.register({
                    id: 'dolphindb',
                    // configuration: ''
                })
                
                languages.setMonarchTokensProvider('dolphindb', {
                    defaultToken: 'invalid',
                    
                    keywords,
                    
                    operators: [
                        '||', '&&',
                        '<=', '==', '>=', '!=',
                        '<<', '>>',
                        '**', '<-', '->', '..',
                        '<', '>', '|', '^', '&', '+', '-', '*', '/', '\\', '%', '$', ':', '!', '.'
                    ],
                    
                    tokenizer: {
                        root: [
                            [/\/\/.*$/, 'comment'],
                            
                            [/'(.*?)'/, 'string'],
                            [/"(.*?)"/, 'string'],
                            
                            [/\w+!? ?(?=\()/, 'call'],
                            
                            [/\d+/, 'number'],
                            
                            [/\w+( join| by)?/, { cases: { '@keywords': 'keyword' } }],
                            
                            [/[!$%^&*|<=>\\.]+/, { cases: { '@operators': 'operator' } }],
                            
                            [/[;,.]/, 'delimiter'],
                        ],
                    },
                })
                
                editor.defineTheme('dolphindb-theme', {
                    base: 'vs',
                    inherit: true,
                    rules: [
                        // { token: 'keywords.dolphindb', foreground: '#ff0000' }
                        { token: 'comment', foreground: '#000000' },
                        { token: 'types', foreground: '#0f96be' },
                        { token: 'operator', foreground: '#ff0000' },
                        { token: 'invalid', foreground: '#000000' },
                        { token: 'keyword', foreground: '#af00db' },
                        { token: 'number', foreground: '#00a000' },
                        { token: 'call',  foreground: '#000000', fontStyle: 'bold' },
                    ],
                    colors: {
                        
                    }
                })
                
                languages.setLanguageConfiguration('dolphindb', {
                    comments: {
                        // symbol used for single line comment. Remove this entry if your language does not support line comments
                        lineComment: '//',
                        
                        // symbols used for start and end a block comment. Remove this entry if your language does not support block comments
                        blockComment: ['/*', '*/']
                    },
                    
                    // symbols used as brackets
                    brackets: [
                        ['{', '}'],
                        ['[', ']'],
                        ['(', ')']
                    ],
                    
                    // symbols that are auto closed when typing
                    autoClosingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"', notIn: ['string'] },
                        { open: "'", close: "'", notIn: ['string'] },
                        { open: '/**', close: ' */', notIn: ['string'] },
                        { open: '/*', close: ' */', notIn: ['string'] }
                    ],
                    
                    // symbols that that can be used to surround a selection
                    surroundingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: "'", close: "'" },
                        { open: '<', close: '>' },
                    ],
                    
                    folding: {
                        markers: {
                            start: new RegExp('^\\s*//\\s*#?region\\b'),
                            end: new RegExp('^\\s*//\\s*#?endregion\\b')
                        }
                    },
                    
                    wordPattern: new RegExp('(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\\'\\"\\,\\.\\<\\>\\/\\?\\s]+)'),
                    
                    indentationRules: {
                        increaseIndentPattern: new RegExp('^((?!\\/\\/).)*(\\{[^}"\'`]*|\\([^)"\'`]*|\\[[^\\]"\'`]*)$'),
                        decreaseIndentPattern: new RegExp('^((?!.*?\\/\\*).*\\*/)?\\s*[\\}\\]].*$')
                    }
                })
                
                languages.registerCompletionItemProvider('dolphindb', {
                    provideCompletionItems (doc, pos, ctx, canceller) {
                        if (canceller.isCancellationRequested)
                            return
                        
                        const keyword = doc.getWordAtPosition(pos).word
                        
                        
                        let fns: string[]
                        let _constants: string[]
                        
                        if (keyword.length === 1) {
                            const c = keyword[0].toLowerCase()
                            fns = funcs.filter((func, i) => 
                                funcs_lower[i].startsWith(c)
                            )
                            _constants = constants.filter((constant, i) => 
                                constants_lower[i].startsWith(c)
                            )
                        } else {
                            const keyword_lower = keyword.toLowerCase()
                            
                            fns = funcs.filter((func, i) => {
                                const func_lower = funcs_lower[i]
                                let j = 0
                                for (const c of keyword_lower) {
                                    j = func_lower.indexOf(c, j) + 1
                                    if (!j)  // 找不到则 j === 0
                                        return false
                                }
                                
                                return true
                            })
                            
                            _constants = constants.filter((constant, i) => {
                                const constant_lower = constants_lower[i]
                                let j = 0
                                for (const c of keyword_lower) {
                                    j = constant_lower.indexOf(c, j) + 1
                                    if (!j)  // 找不到则 j === 0
                                        return false
                                }
                                
                                return true
                            })
                        }
                        
                        return {
                            suggestions: [
                                ...keywords.filter(kw => 
                                    kw.startsWith(keyword)
                                ).map(kw => ({
                                    label: kw,
                                    insertText: kw,
                                    kind: CompletionItemKind.Keyword,
                                }) as monaco.languages.CompletionItem),
                                ... _constants.map(constant => ({
                                    label: constant,
                                    insertText: constant,
                                    kind: CompletionItemKind.Constant
                                }) as monaco.languages.CompletionItem),
                                ...fns.map(fn => ({
                                    label: fn,
                                    insertText: fn,
                                    kind: CompletionItemKind.Function,
                                }) as monaco.languages.CompletionItem),
                            ]
                        }
                    },
                    
                    resolveCompletionItem (item, canceller) {
                        if (canceller.isCancellationRequested)
                            return
                        
                        item.documentation = get_func_md(item.label as string)
                        
                        return item
                    }
                })
                
                languages.registerHoverProvider('dolphindb', {
                    provideHover (doc, pos, canceller) {
                        if (canceller.isCancellationRequested)
                            return
                        
                        const word = doc.getWordAtPosition(pos)
                        
                        if (!word)
                            return
                        
                        const md = get_func_md(word.word)
                        
                        if (!md)
                            return
                        
                        return {
                            contents: [md]
                        }
                    }
                })
                
                languages.registerSignatureHelpProvider('dolphindb', {
                    signatureHelpTriggerCharacters: ['(', ','],
                    
                    provideSignatureHelp (doc, pos, canceller, ctx) {
                        if (canceller.isCancellationRequested)
                            return
                        
                        const { func_name, param_search_pos } = find_func_start(doc, pos)
                        if (param_search_pos === -1) 
                            return
                        
                        const index = find_active_param_index(doc, pos, param_search_pos)
                        if (index === -1) 
                            return
                        
                        const signature_and_params = get_signature_and_params(func_name)
                        if (!signature_and_params)
                            return
                        
                        const { signature, params } = signature_and_params
                        
                        return {
                            dispose () { },
                            
                            value: {
                                activeParameter: index > params.length - 1 ? params.length - 1 : index,
                                signatures: [{
                                    label: signature,
                                    documentation: get_func_md(func_name),
                                    parameters: params.map(param => ({
                                        label: param
                                    }))
                                }],
                                activeSignature: 0,
                            }
                        }
                    }
                })
            }}
            
            onMount={(editor, monaco) => {
                editor.setValue(
                    localStorage.getItem('dolphindb.code') || ''
                )
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    async run (editor) {
                        const selection = editor.getSelection()
                        const model = editor.getModel()
                        
                        await shell.eval(
                            selection.isEmpty() ?
                                model.getLineContent(selection.startLineNumber)
                            :
                                model.getValueInRange(selection, monaco.editor.EndOfLinePreference.LF)
                        )
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.save',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                    ],
                    
                    label: t('DolphinDB: 保存代码'),
                    
                    async run (editor) {
                        localStorage.setItem(
                            'dolphindb.code',
                            editor.getValue()
                        )
                        
                        message.success(
                            t('代码已保存在浏览器中')
                        )
                    }
                })
                
                let { widget } = editor.getContribution('editor.contrib.suggestController') as any
                
                if (widget) {
                    const { value: suggest_widget } = widget
                    suggest_widget._setDetailsVisible(true)
                    // suggest_widget._persistedSize.store({
                    //     width: 200,
                    //     height: 256
                    // })
                }
                
                shell.set({
                    editor,
                    monaco
                })
            }}
        />
    </div>
}


function Display () {
    return <div className='display'>
        <Resizable
            className='dataview-resizable'
            enable={{ top: false, right: false, bottom: true, left:false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            defaultSize={{ height: '50%', width: '100%' }}
            handleStyles={{ bottom: { height: 20, bottom: -10 } }}
            handleClasses={{ bottom: 'resizable-handle' }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <DataView />
        </Resizable>
        
        <Term />
        {/* <div>Term</div> */}
    </div>
}


function Term () {
    const { collapsed } = model.use(['collapsed'])
    
    const rterminal = useRef<HTMLDivElement>()
    
    useEffect(() => {
        function printer ({ type, data }: DdbMessage) {
            if (type === 'print')
                shell.term.writeln(data)
        }
        
        const on_resize = debounce(
            () => {
                shell.fit_addon?.fit()
            },
            500
        )
        
        window.addEventListener('resize', on_resize)
        
        ;(async () => {
            // --- init term
            let term = shell.term = new Terminal({
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
                    selection: '#add6ff'
                }
            })
            
            term.loadAddon(
                shell.fit_addon = new FitAddon()
            )
            
            term.open(rterminal.current)
            
            ddb.listeners.push(printer)
            
            term.writeln(
                t('左侧编辑器使用指南:\n') +
                t('按 Ctrl + E 执行选中代码或光标所在行代码\n') +
                t('按 Ctrl + S 保存代码\n') +
                t('按 F1 查看更多编辑器命令')
            )
        })()
        
        return () => {
            ddb.listeners = ddb.listeners.filter(handler => 
                handler !== printer)
            
            window.removeEventListener('resize', on_resize)
        }
    }, [ ])
    
    useEffect(() => {
        // wait for container ready
        ;(async () => {
            await delay(500)
            shell.fit_addon?.fit()
        })()
    }, [collapsed])
    
    return <div className='term' ref={rterminal} />
}


function DataView () {
    const { result } = shell.use(['result'])
    
    return <div className='dataview result'>{
        !result ||
        result.form === DdbForm.scalar ||
        result.form === DdbForm.pair ?
            null
        :
            <Obj obj={result} remote={null} ctx='embed' />
    }</div>
}


/** 最大搜索行数 */
const max_lines_to_match = 30 as const

// 栈 token 匹配表
const token_map = {
    ')': '(',
    '}': '{',
    ']': '['
} as const

const token_ends = new Set(
    Object.values(token_map)
)

function get_func_md (keyword: string) {
    const func_doc = docs[keyword]
    
    if (!func_doc)
        return
    
    let str = 
        // 标题
        `#### ${func_doc.title}\n` +
        
        // 链接
        `https://www.dolphindb.cn/cn/help/FunctionsandCommands/${ func_doc.type === 'command' ? 'CommandsReferences' : 'FunctionReferences' }/${func_doc.title[0]}/${func_doc.title}.html\n`
    
    
    for (const para of func_doc.children) {
        // 加入段
        str += `#### ${para.title}\n`
        
        for (const x of para.children)
            if (x.type === 'text' && para.type !== 'example') 
                // 对于参数段落，以 markdown 插入
                str += x.value.join_lines()
            else
                // x.type === 'code' || para.type === 'example'
                str += 
                    '```' + (x.language === 'console' ? 'dolphindb' : (x.language || '')) + '\n' +
                    x.value.join_lines() +
                    '```\n'
        
        str += '\n'
    }
    
    return {
        isTrusted: true,
        value: str
    } as monaco.IMarkdownString
}


/** 利用当前光标找出函数参数开始位置及函数名, 若找不到返回 -1 */
function find_func_start (
    document: monaco.editor.ITextModel,
    position: monaco.Position
): {
    func_name: string
    param_search_pos: number
} {
    const func_name_regex = /[a-z|A-Z|0-9|\!|_]/
    
    const text = document.getValueInRange({
        startLineNumber: Math.max(position.lineNumber - max_lines_to_match, 0),
        startColumn: 0,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    })
    
    
    let stack_depth = 0
    let param_search_pos = -1
    for (let i = text.length; i >= 0; i--) {
        let char = text[i]
        // 遇到右括号，入栈，增加一层括号语境深度
        if (char === ')') {
            stack_depth++
            continue
        }
        // 遇到左括号，出栈，退出一层括号语境深度
        else if (char === '(') {
            stack_depth--
            continue
        }
        
        // 栈深度小于0，且遇到合法函数名字符，跳出括号语境，搜索结束：参数搜索开始位置
        if (func_name_regex.test(char) && stack_depth < 0) {
            param_search_pos = i
            break
        }
    }
    
    // 找不到参数搜索开始位置，返回null
    if (param_search_pos === -1) 
        return { param_search_pos: -1, func_name: '' }
    
    
    // 往前找函数名
    let func_name_end = -1
    let func_name_start = 0
    for (let i = param_search_pos; i >= 0; i--) {
        let char = text[i]
        
        // 空字符跳过
        if (func_name_end === -1 && char === ' ') 
            continue
        
        // 合法函数名字字符，继续往前找
        if (func_name_regex.test(char)) {
            // 标记函数名字末尾位置
            if (func_name_end === -1) 
                func_name_end = i
            
            continue
        }
        
        // 不合法函数名字符，标记函数名字开头位置
        func_name_start = i + 1
        break
    }
    
    // 找不到函数名
    if (func_name_end === -1) 
        return { param_search_pos: -1, func_name: '' }
    
    return {
        param_search_pos: param_search_pos + 1,
        func_name: text.slice(func_name_start, func_name_end + 1)
    }
}



/** 根据函数参数开始位置分析参数语义，提取出当前参数索引  */
function find_active_param_index (
    document: monaco.editor.ITextModel,
    position: monaco.Position,
    start: number
) {
    const text = document.getValueInRange({
        startLineNumber: Math.max(position.lineNumber - max_lines_to_match, 0),
        startColumn: 0,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    })
    
    let index = 0
    let stack = []
    
    // 分隔符，此处为逗号
    const seperator = ','
    
    let ncommas = 0
    
    // 搜索
    for (let i = start; i < text.length; i++) {
        const char = text[i]
        
        // 空字符跳过
        if (/\s/.test(char)) 
            continue
        
        // 字符串内除引号全部忽略
        if (stack[stack.length - 1] === '"' || stack[stack.length - 1] === "'") {
            // 遇到相同引号，出栈
            if ((stack[stack.length - 1] === '"' && char === '"') || (stack[stack.length - 1] === "'" && char === "'")) 
                stack.pop()
            continue
        }
        
        // 开括号入栈
        if (token_ends.has(char as any) || char === '"' || char === "'") {
            stack.push(char)
            continue
        } else if (char in token_map)  // 括号匹配，出栈，括号不匹配，返回null
            if (stack[stack.length - 1] === token_map[char]) {
                stack.pop()
                continue
            } else // 括号不匹配，返回-1
                return -1
        
        // 栈深度为1 且为左小括号：当前语境
        if (stack.length === 1 && stack[0] === '(') 
            // 遇到逗号，若之前有合法参数，计入逗号
            if (char === seperator)
                ncommas++
        
        // 根据逗号数量判断高亮参数索引值
        index = ncommas
    }
    
    return index
}


/** 根据函数名提取出相应的文件对象，提取出函数signature和参数 */
function get_signature_and_params (func_name: string): {
    signature: string
    params: string[]
} | null {
    const para = docs[func_name]?.children.filter(para => para.type === 'grammer')[0]
    if (!para) 
        return null
    
    // 找出语法内容块的第一个非空行
    const funcLine = para.children[0].value.filter(line => line.trim() !== '')[0].trim()
    const matched = funcLine.match(/[a-zA-z0-9\!]+\((.*)\)/)
    if (!matched) 
        return null
    
    const signature = matched[0]
    const params = matched[1].split(',').map(s => s.trim())
    return { signature, params }
}


