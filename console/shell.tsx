import 'xterm/css/xterm.css'

import './shell.sass'


import { default as React, useEffect, useRef } from 'react'

import { Resizable } from 're-resizable'

import { message, Tree } from 'antd'
import { default as Icon } from '@ant-design/icons'

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
    DdbType,
    format,
    DdbFunctionType,
    type DdbFunctionDefValue,
} from 'dolphindb/browser.js'

import { keywords, constants } from 'dolphindb/language.js'

// LOCAL
// import docs from 'dolphindb/docs.zh.json'
import docs_zh from 'dolphindb/docs.zh.json'
import docs_en from 'dolphindb/docs.en.json'


import SvgVar from './shell.icons/variable.icon.svg'

import SvgScalar from './shell.icons/scalar.icon.svg'
import SvgVector from './shell.icons/vector.icon.svg'
import SvgPair from './shell.icons/pair.icon.svg'
import SvgMatrix from './shell.icons/matrix.icon.svg'
import SvgSet from './shell.icons/set.icon.svg'
import SvgDict from './shell.icons/dict.icon.svg'
import SvgTable from './shell.icons/table.icon.svg'
import SvgChart from './shell.icons/chart.icon.svg'
import SvgObject from './shell.icons/object.icon.svg'


import { delta2str, delay } from 'xshell/utils.browser.js'
import { red, blue } from 'xshell/chalk.browser.js'

import { Model } from 'react-object-model'


import { t, language } from '../i18n/index.js'

import { Obj, DdbObjRef } from './obj.js'

import { model, storage_keys } from './model.js'


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


type Result = { type: 'object', data: DdbObj } | { type: 'objref', data: DdbObjRef }

class ShellModel extends Model<ShellModel> {
    term: Terminal
    
    fit_addon: FitAddon
    
    monaco: Monaco
    
    editor: monaco.editor.IStandaloneCodeEditor
    
    result: Result
    
    vars: DdbVar[]
    
    
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
            
            if (
                ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector
            )
                this.set({
                    result: {
                        type: 'object',
                        data: ddbobj
                    },
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
    
    
    async update_vars () {
        let objs = await ddb.call('objs', [true])
        
        const vars_data = objs
            .to_rows()
            .map(
                ({
                    name,
                    type,
                    form,
                    rows,
                    columns,
                    bytes,
                    shared,
                    extra
                }: {
                    name: string
                    type: string
                    form: string
                    rows: number
                    columns: number
                    bytes: bigint
                    shared: boolean
                    extra: string
                }) => ({
                    name,
                    type: (() => {
                        const _type = type.toLowerCase()
                        return _type.endsWith('[]') ? DdbType[_type.slice(0, -2)] + 64 : DdbType[_type]
                    })(),
                    form: (() => {
                        const _form = form.toLowerCase()
                        switch (_form) {
                            case 'dictionary':
                                return DdbForm.dict
                                
                            case 'sysobj':
                                return DdbForm.object
                                
                            default:
                                return DdbForm[_form]
                        }
                    })(),
                    rows,
                    cols: columns,
                    bytes,
                    shared,
                    extra,
                    obj: undefined as DdbObj
                })
            )
            .filter(
                v =>
                    v.name !== 'pnode_run' &&
                    !(
                        v.form === DdbForm.object &&
                        (v.name === 'list' || v.name === 'tuple' || v.name === 'dict' || v.name === 'set' || v.name === '_ddb')
                    )
            )
            
        let imutables = vars_data.filter(v => v.form === DdbForm.scalar || v.form === DdbForm.pair)
        
        if (imutables.length) {
            const { value: values } = await ddb.eval<DdbObj<DdbObj[]>>(
                `(${imutables.map(({ name }) => name).join(', ')}, 0)${ddb.python ? '.toddb()' : ''}`
            )
            
            for (let i = 0; i < values.length - 1; i++) imutables[i].obj = values[i]
        }
        
        
        this.set({
            vars: vars_data.map(data => 
                new DdbVar(data)
            )
        })
        
        console.log('vars:', this.vars)
    }
}

let shell = new ShellModel()


export function Shell () {
    return <>
        <Resizable
            className='variables-resizable'
            defaultSize={{ height: '100%', width: '13%' }}
            enable={{ top: false, right: true, bottom: false, left:false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <div className='variables'>
                <Variables shared={false} />
                <Variables shared />
            </div>
        </Resizable>
        
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
                    localStorage.getItem(storage_keys.code) || ''
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
                        
                        await shell.update_vars()
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
                            storage_keys.code,
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
                    // @ts-ignore
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
            enable={{ top: false, right: false, bottom: true, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
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
        (() => {
            if (!result)
                return
            
            const { type, data } = result
            
            if (
                data.form === DdbForm.scalar || 
                data.form === DdbForm.pair
            )
                return
            
            return type === 'object' ?
                <Obj obj={data} ddb={ddb} ctx='embed' />
            :
                <Obj objref={data} ddb={ddb} ctx='embed' />
        })()
    }</div>
}


function Variables ({ shared }: { shared?: boolean }) {
    const { vars } = shell.use(['vars'])
    
    if (!vars)
        return
    
    const vars_ = vars.filter(v => {
        return v.shared === shared
    })
    
    let scalar = new TreeDataItem('scalar', '0', <Icon component={SvgScalar} />)
    let vector = new TreeDataItem('vector', '1', <Icon component={SvgVector} />)
    let pair = new TreeDataItem('pair', '2', <Icon component={SvgPair} />)
    let matrix = new TreeDataItem('matrix', '3', <Icon component={SvgMatrix} />)
    let set = new TreeDataItem('set', '4', <Icon component={SvgSet} />)
    let dict = new TreeDataItem('dict', '5', <Icon component={SvgDict} />)
    let table = new TreeDataItem('table', '6', <Icon component={SvgTable} />)
    let chart = new TreeDataItem('chartr', '7', <Icon component={SvgChart} />)
    let object = new TreeDataItem('object', '9', <Icon component={SvgObject} />)
    
    let scalars: TreeDataItem[] = []
    let vectors: TreeDataItem[] = []
    let pairs: TreeDataItem[] = []
    let matrixs: TreeDataItem[] = []
    let sets: TreeDataItem[] = []
    let dicts: TreeDataItem[] = []
    let tables: TreeDataItem[] = []
    let charts: TreeDataItem[] = []
    let objects: TreeDataItem[] = []
    
    for (const v of vars_)
        switch (v.form) {
            case DdbForm.scalar:
                scalars.push(new TreeDataItem(v.label, v.name))
                scalar.children = scalars
                break
                
            case DdbForm.vector:
                vectors.push(new TreeDataItem(v.label, v.name))
                vector.children = vectors
                break
                
            case DdbForm.pair:
                pairs.push(new TreeDataItem(v.label, v.name))
                pair.children = pairs
                break
                
            case DdbForm.matrix:
                matrixs.push(new TreeDataItem(v.label, v.name))
                matrix.children = matrixs
                break
                
            case DdbForm.set:
                sets.push(new TreeDataItem(v.label, v.name))
                set.children = sets
                break
                
            case DdbForm.dict:
                dicts.push(new TreeDataItem(v.label, v.name))
                dict.children = dicts
                break
                
            case DdbForm.table:
                tables.push(new TreeDataItem(v.label, v.name))
                table.children = tables
                break
                
            case DdbForm.chart:
                charts.push(new TreeDataItem(v.label, v.name))
                chart.children = charts
                break
                
            case DdbForm.object:
                objects.push(new TreeDataItem(v.label, v.name))
                object.children = objects
                break
        }
    
    let treedata = [scalar, object, pair, vector, set, dict, matrix, table, chart].filter(node => 
        node.children)
    
    console.log('treedata', treedata)
    
    if (!treedata.length)
        return
    
    return <div className={ shared ? 'shared' : 'local' }>
        <div className='type'>{ shared ? t('共享变量') : t('本地变量')}</div>
        <Tree
            showIcon
            defaultExpandAll
            focusable={false}
            blockNode
            showLine
            motion={null}
            treeData={treedata}
            // switcherIcon={<DownOutlined />}
            // titleRender={node => {
            //     return <div>title</div>
            // }}
            onSelect={async ([key]) => {
                if (!key)
                    return
                
                const v = vars.find(node => 
                    node.name === key
                )
                
                if (!v)
                    return
                
                if (
                    v.form === DdbForm.chart ||
                    v.form === DdbForm.dict ||
                    v.form === DdbForm.matrix ||
                    v.form === DdbForm.set ||
                    v.form === DdbForm.table ||
                    v.form === DdbForm.vector
                )
                    shell.set({
                        result: v.obj ? {
                            type: 'object',
                            data: v.obj
                        } : {
                            type: 'objref',
                            data: new DdbObjRef(v)
                        }
                    })
            }}
        />
    </div>
}

class TreeDataItem {
    title: React.ReactElement
    key: string
    children?: TreeDataItem[]
    icon?: any
    tooltip?: string
    
    constructor (title: string, key: string, icon?: any, children?: TreeDataItem[], tooltip?: string) {
        const name = /^(\w+)/.exec(title)[1]
        this.title = <>
            <span className='name'>{name}</span>
            {title.slice(name.length)}
        </>
        
        this.key = key
        this.children = children
        this.icon = icon || <Icon component={SvgVar} />
        this.tooltip = tooltip
    }
}


class DdbVar <T extends DdbObj = DdbObj> {
    static size_limit = 10240n as const
    
    label: string
    
    shared: boolean
    
    type: DdbType
    
    name: string
    
    form: DdbForm
    
    rows: number
    
    cols: number
    
    bytes: bigint
    
    tooltip: string
    
    obj: T
    
    constructor (data: Partial<DdbVar>) {
        Object.assign(this, data)
        
        this.label = (() => {
            const tname = DdbType[this.type]
            
            const type = (() => {
                switch (this.form) {
                    case DdbForm.scalar:
                        if (this.type === DdbType.functiondef)
                            return `<functiondef<${DdbFunctionType[(this.obj.value as DdbFunctionDefValue).type]}>>`
                            
                        return `<${tname}>`
                        
                    case DdbForm.pair:
                        return `<${tname}>`
                        
                    case DdbForm.vector:
                        return `<${64 <= this.type && this.type < 128 ? `${DdbType[this.type - 64]}[]` : tname}> ${this.rows} rows`
                        
                    case DdbForm.set:
                        return `<${tname}> ${this.rows} keys`
                        
                    case DdbForm.table:
                        return ` ${this.rows}r × ${this.cols}c`
                        
                    case DdbForm.dict:
                        return ` ${this.rows} keys`
                        
                    case DdbForm.matrix:
                        return `<${tname}> ${this.rows}r × ${this.cols}c`
                        
                    case DdbForm.object:
                        return ''
                        
                    default:
                        return ` ${DdbForm[this.form]} ${tname}`
                }
            })()
            
            const value = (() => {
                switch (this.form) {
                    case DdbForm.scalar:
                        return ' = ' + format(this.type, this.obj.value, this.obj.le)
                        
                    // 类似 DdbObj[inspect.custom] 中 format data 的逻辑
                    case DdbForm.pair: {
                        function format_array (items: string[], ellipsis: boolean) {
                            const str_items = items.join(', ') + (ellipsis ? ', ...' : '')
                            
                            return str_items.bracket('square')
                        }
                        
                        switch (this.type) {
                            case DdbType.uuid:
                            case DdbType.int128:
                            case DdbType.ipaddr: {
                                const limit = 10 as const
                                
                                const value = this.obj.value as Uint8Array
                                
                                const len_data = value.length / 16
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                for (let i = 0; i < items.length; i++) items[i] = format(this.type, value.subarray(16 * i, 16 * (i + 1)), this.obj.le)
                                
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            case DdbType.complex:
                            case DdbType.point: {
                                const limit = 20 as const
                                
                                const value = this.obj.value as Float64Array
                                
                                const len_data = value.length / 2
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                for (let i = 0; i < items.length; i++) items[i] = format(this.type, value.subarray(2 * i, 2 * (i + 1)), this.obj.le)
                                
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            default: {
                                const limit = 50 as const
                                
                                let items = new Array(Math.min(limit, (this.obj.value as any[]).length))
                                
                                for (let i = 0; i < items.length; i++) items[i] = format(this.type, this.obj.value[i], this.obj.le)
                                
                                return ' = ' + format_array(items, (this.obj.value as any[]).length > limit)
                            }
                        }
                    }
                    
                    case DdbForm.object:
                        return ''
                        
                    default:
                        return ` [${Number(this.bytes).to_fsize_str().replace(' ', '')}]`
                }
            })()
            
            return this.name + type + value
        })()
    }
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


