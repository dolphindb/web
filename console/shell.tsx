import 'xterm/css/xterm.css'

import './shell.sass'


import { default as React, useEffect, useRef, useState } from 'react'

import { message, Tabs as AntTabs } from 'antd'

import dayjs from 'dayjs'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import { default as MonacoEditor } from '@monaco-editor/react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
type Monaco = typeof monaco

import {
    ddb,
    DdbForm,
    type DdbMessage,
    DdbObj,
    DdbType
} from 'dolphindb/browser'
import { delta2str, delay } from 'xshell/utils.browser'

import { red } from 'xshell/chalk.browser'
import { Model } from 'react-object-model'


import { Obj } from './obj'

import { t } from '../i18n/index'

import icon_run from './run.svg'


import { keywords, constants } from './dolphindb.language'

import docs from './docs.zh.json'

const constants_lower = constants.map(constant => 
    constant.toLowerCase())

const funcs = Object.keys(docs)
const funcs_lower = funcs.map(func => 
    func.toLowerCase())


class ShellModel extends Model<ShellModel> {
    term: Terminal
    
    monaco: Monaco
    
    editor: monaco.editor.IStandaloneCodeEditor
    
    result: DdbObj
    
    tab: 'terminal' | 'dataview' = 'terminal'
    
    
    async eval (code = this.editor.getValue()) {
        const time_start = dayjs()
        
        this.term.writeln(
            time_start.format('YYYY.MM.DD HH:mm:ss.SSS')
        )
        
        try {
            let ddbobj = await ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            
            console.log(ddbobj)
            
            this.set({
                result: ddbobj,
                tab: (ddbobj.form === DdbForm.scalar || ddbobj.form === DdbForm.pair) ?
                        'terminal'
                    :
                        'dataview'
            })
            
            this.term.writeln(
                (ddbobj.form === DdbForm.scalar && ddbobj.type === DdbType.void ?
                    ''
                :
                    ddbobj.toString().trimEnd() + '\n' 
                ) +
                `(${delta2str(
                    dayjs().diff(time_start)
                )})\n` + 
                '\n'
            )
        } catch (error) {
            this.term.writeln(
                red(error.message) + '\n'
            )
            this.set({
                tab: 'terminal'
            })
            throw error
        }
    }
}

let shell = new ShellModel()


export function Shell () {
    return <>
        <Editor />
        <Tabs />
    </>
}


function Editor () {
    return <div className='editor'>
        <MonacoEditor 
            height={600}
            
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
                
                if (shell.monaco)
                    return
                
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
        
        <button
            className='run'
            onClick={async () => {
                await shell.eval()
            }}
        >
            <img className='icon' src={icon_run} />
            <span className='text'>运行</span>
        </button>
    </div>
}


function Tabs () {
    const { tab } = shell.use(['tab'])
    
    return <AntTabs
        className='tabs'
        type='card'
        activeKey={tab}
        onChange={key => {
            shell.set({
                tab: key as ShellModel['tab']
            })
        }}
    >
        <AntTabs.TabPane className='tab-terminal' key='terminal' tab={t('终端')}>
            <Term />
        </AntTabs.TabPane>
        <AntTabs.TabPane className='tab-dataview result' key='dataview' tab={t('数据视图')}>
            <DataView />
        </AntTabs.TabPane>
    </AntTabs>
}


function Term () {
    const rterminal = useRef<HTMLDivElement>()
    
    useEffect(() => {
        function printer ({ type, data }: DdbMessage) {
            if (type === 'print')
                shell.term.writeln(data)
        }
        
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
            
            const fit_addon = new FitAddon()
            
            term.loadAddon(fit_addon)
            
            term.open(rterminal.current)
            
            ddb.listeners.push(printer)
            
            // wait for container ready
            await delay(200)
            
            fit_addon.fit()
        })()
        
        return () => {
            ddb.listeners = ddb.listeners.filter(handler => 
                handler !== printer)
        }
    }, [ ])
    
    return <div className='term' ref={rterminal} />
}


function DataView () {
    const { result } = shell.use(['result'])
    
    if (
        !result ||
        result.form === DdbForm.scalar ||
        result.form === DdbForm.pair
    )
        return null
    
    return <Obj obj={result} remote={null} />
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


