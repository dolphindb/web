import 'xterm/css/xterm.css'

import './shell.sass'


import { default as React, useEffect, useRef, useState } from 'react'

import { Resizable } from 're-resizable'

import type { BasicDataNode } from 'rc-tree'

import { Dropdown, message, Tooltip, Tree, Modal, Form, Input, Select, Button, Popconfirm, Switch } from 'antd'
const { Option } = Select

import { default as _Icon, SyncOutlined, MinusSquareOutlined, SaveOutlined, CaretRightOutlined, EyeOutlined, EditOutlined, FolderOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import dayjs from 'dayjs'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebglAddon } from 'xterm-addon-webgl'
import { WebLinksAddon } from 'xterm-addon-web-links'

import debounce from 'lodash/debounce.js'

import { default as MonacoEditor, loader } from '@monaco-editor/react'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
type Monaco = typeof monacoapi

import { generateTokensCSSForColorMap } from 'monaco-editor/esm/vs/editor/common/languages/supports/tokenization.js'
import { Color } from 'monaco-editor/esm/vs/base/common/color.js'


import {
    INITIAL,
    Registry,
    parseRawGrammar,
    type IGrammar,
    type IRawGrammar,
    type StateStack,
} from 'vscode-textmate'

import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma'


import {
    ddb,
    DdbForm,
    type DdbMessage,
    DdbObj,
    DdbType,
    format,
    DdbFunctionType,
    type DdbFunctionDefValue,
    type InspectOptions,
    type DdbVectorStringObj,
} from 'dolphindb/browser.js'

import { keywords, constants, tm_language } from 'dolphindb/language.js'

// LOCAL: OFF
// import docs from 'dolphindb/docs.zh.json'
import docs_zh from 'dolphindb/docs.zh.json'
import docs_en from 'dolphindb/docs.en.json'

import theme from './shell.theme.js'


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
import SvgDatabase from './shell.icons/database.icon.svg'
import SvgColumn from './shell.icons/column.icon.svg'
import SvgAddColumn from './shell.icons/add-column.icon.svg'
import SvgViewTableStructure from './shell.icons/view-table-structure.icon.svg'


import { delta2str, delay } from 'xshell/utils.browser.js'
import { red, blue, underline } from 'xshell/chalk.browser.js'

import { Model } from 'react-object-model'


import { t, language } from '../i18n/index.js'

import { Obj, DdbObjRef } from './obj.js'

import { model, storage_keys } from './model.js'


const docs = language === 'zh' ? docs_zh : docs_en

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
    
    editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    vars: DdbVar[]
    
    dbs: Map<string, DdbEntity>
    
    options?: InspectOptions
    
    
    executing = false
    
    dirty = false
    
    confirmation_registered = false
    
    
    async load_dbs () {
        let dbs = new Map<string, DdbEntity>()
        for (const path of (await ddb.call<DdbVectorStringObj>('getClusterDFSDatabases')).value)
            dbs.set(path, new DdbEntity({ path }))
            
        // LOCAL: OFF 测试虚拟滚动
        // for (let i = 0;  i < 10000;  i++) {
        //     const path = `dfs://mockdb${i}`
        //     dbs.set(path, new DdbEntity({ path }))
        // }
        
        // 测试多级数据库树
        // for (let i = 0;  i <100 ;  i++) {
        //     for (let j =0; j< 500; j++){
        //         const path = `dfs://${i}.${j}`
        //         const tables = [new TableEntity({name: `table_of_${i}_${j}`, ddb_path:path, labels:['sdsadfs'], column_schema:[{name:'Id', type:5}]})]
        //         dbs.set(path, new DdbEntity({ path ,tables}))
        //     }
        //  }
        
        this.set({ dbs })
    }
    
    async eval (code = this.editor.getValue()) {
        const time_start = dayjs()
        
        this.term.writeln(
            '\n' +
            time_start.format('YYYY.MM.DD HH:mm:ss.SSS')
        )
        
        this.set({ executing: true })
        
        try {
            // TEST
            // throw new Error('xxxxx. RefId: S00001. xxxx RefId:S00002')
            
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
                        case DdbForm.chart:
                        case DdbForm.dict:
                        case DdbForm.matrix:
                        case DdbForm.set:
                        case DdbForm.table:
                        case DdbForm.vector:
                            return blue(
                                ddbobj.inspect_type().trimEnd()
                            ) + '\n'
                        
                        default: {
                            if (ddbobj.type === DdbType.void)
                                return ''
                            
                            return ddbobj.toString({ ...this.options, colors: true, nullstr: true, quote: true }).trimEnd() + '\n'
                        }
                    }
                })() +
                `(${delta2str(
                    dayjs().diff(time_start)
                )})`
            )
        } catch (error) {
            let message = error.message as string
            if (message.includes('RefId:'))
                message = message.replaceAll(/RefId:\s*(\w+)/g, underline(blue('RefId: $1')))
            this.term.writeln(red(message))
            throw error
        } finally {
            this.set({ executing: false })
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
                    obj: undefined as DdbObj,
                    options: this.options,
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
            
            for (let i = 0; i < values.length - 1; i++)
                imutables[i].obj = values[i]
        }
        
        
        this.set({
            vars: vars_data.map(data => 
                new DdbVar(data)
            )
        })
        
        // console.log('vars:', this.vars)
    }
    
    beforeunload (event: BeforeUnloadEvent) {
        event.returnValue = ''
    }
    
    register_confirmation () {
        if (!this.confirmation_registered) {
            window.addEventListener('beforeunload', this.beforeunload)
            this.confirmation_registered = true
        }
    }
    
    unregister_confirmation () {
        if (this.confirmation_registered) {
            window.removeEventListener('beforeunload', this.beforeunload)
            this.confirmation_registered = false
        }
    }
    
    update_title () {
        document.title = `${this.dirty ? '• ' : ''}DolphinDB - ${model.node_alias}`
    }
    
    set_dirty (dirty: boolean) {
        this.set({ dirty })
        if (dirty)
            this.register_confirmation()
        else
            this.unregister_confirmation()
        this.update_title()
    }
}

let shell = new ShellModel()


export function Shell () {
    const { options } = model.use(['options'])
    
    useEffect(() => {
        shell.options = options
        shell.update_vars()
    }, [options])
    
    useEffect(() => {
        shell.load_dbs()
    }, [ ])
    
    return <>
        <Resizable
            className='treeview-resizable'
            defaultSize={{ height: '100%', width: '13%' }}
            enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <TreeView />
        </Resizable>
        
        <div className='content'>
            <Resizable
                className='top'
                defaultSize={{ height: '63%', width: '100%' }}
                enable={{ top: false, right: false, bottom: true, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                onResizeStop={async () => {
                    await delay(200)
                    shell.fit_addon?.fit()
                }}
            >
                <Resizable
                    className='editor-resizable'
                    enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                    defaultSize={{ height: '100%', width: '75%' }}
                    handleStyles={{ bottom: { height: 6, bottom: -3 } }}
                    handleClasses={{ bottom: 'resizable-handle' }}
                    onResizeStop={async () => {
                        await delay(200)
                        shell.fit_addon?.fit()
                    }}
                >
                    <Editor />
                </Resizable>
                
                <Term />
            </Resizable>
            
            <DataView />
        </div>
    </>
}


let monaco: Monaco

let wasm_loaded = false

let module_code = ''


function Editor () {
    const { code_template } = model.use(['code_template'])
    
    const { executing } = shell.use(['executing'])
    
    const [inited, set_inited] = useState(Boolean(shell.editor))
    
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    useEffect(() => {
        (async () => {
            if (inited)
                return
            
            monaco = await loader.init() as any
            
            let { languages } = monaco
            
            const { CompletionItemKind } = languages
            
            
            languages.register({
                id: 'dolphindb',
                // configuration: ''
            })
            
            
            if (!wasm_loaded) {
                wasm_loaded = true
                
                // Using the response directly only works if the server sets the MIME type 'application/wasm'.
                // Otherwise, a TypeError is thrown when using the streaming compiler.
                // We therefore use the non-streaming compiler :(.
                await loadWASM(
                    await fetch('./onig.wasm')
                )
            }
            
            
            languages.setTokensProvider(
                'dolphindb',
                
                await new TokensProviderCache(registry)
                    .createEncodedTokensProvider(
                        'source.dolphindb',
                        languages.getEncodedLanguageId('dolphindb')
                    )
            )
            
            
            
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
                            }) as monacoapi.languages.CompletionItem),
                            ... _constants.map(constant => ({
                                label: constant,
                                insertText: constant,
                                kind: CompletionItemKind.Constant
                            }) as monacoapi.languages.CompletionItem),
                            ...fns.map(fn => ({
                                label: fn,
                                insertText: fn,
                                kind: CompletionItemKind.Function,
                            }) as monacoapi.languages.CompletionItem),
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
            
            
            await document.fonts.ready
            
            set_inited(true)
        })()
    }, [ ])
    
    
    function save () {
        localStorage.setItem(
            storage_keys.code,
            shell.editor.getValue()
        )
        
        message.success(
            t('代码已保存在浏览器中')
        )
        
        shell.set_dirty(false)
    }
    
    async function execute () {
        const { editor } = shell
        
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
    
    
    if (!inited)
        return <div className='editor-loading'>{t('正在加载代码编辑器...')}</div>
    
    
    return <div className='editor'>
        <div className='toolbar'>
            <div className='actions'>
                <span className='action save' title={t('保存代码至浏览器中')} onClick={save}>
                    <SaveOutlined />
                    <span className='text'>{t('保存')}</span>
                </span>
                <span className='action execute' title={t('执行选中代码或光标所在行代码')} onClick={execute}>
                    <CaretRightOutlined />
                    <span className='text'>{t('执行')}</span>
                </span>
            </div>
            
            <div className='settings'>
                <span className='setting' title={t('控制是否显示缩略图')}>
                    <span className='text'>{t('代码地图')}</span>
                    <Switch
                        checked={minimap}
                        size='small'
                        onChange={ checked => {
                            set_minimap(checked)
                            localStorage.setItem(storage_keys.minimap, checked ? '1' : '0')
                        }} />
                </span>
                
                <span className='setting' title={t('控制除了 Tab 键以外，Enter 键是否同样可以接受建议。这能减少“插入新行”和“接受建议”命令之间的歧义。')}>
                    <span className='text'>{t('回车补全')}</span>
                    <Switch
                        checked={enter_completion}
                        size='small'
                        onChange={ checked => {
                            set_enter_completion(checked)
                            localStorage.setItem(storage_keys.enter_completion, checked ? '1' : '0')
                        }} />
                </span>
            </div>
            
            <div className='padding' />
            
            <div className='statuses'>{
                executing ?
                    <Popconfirm
                        title={t('是否取消执行中的作业？')}
                        okText={t('取消作业')}
                        cancelText={t('不要取消')}
                        onConfirm={async () => { await ddb.cancel() }}
                    >
                        <span className='status executing'>{t('执行中')}</span>
                    </Popconfirm>
                :
                    <span className='status idle'>{t('空闲中')}</span>
            }</div>
        </div>
        
        <MonacoEditor
            defaultLanguage='dolphindb'
            
            language='dolphindb'
            
            theme='dolphindb-theme'
            // theme='Dark+ (default dark)'
            
            options={{
                minimap: {
                    enabled: minimap
                },
                
                fontFamily: 'Menlo, \'Ubuntu Mono\', Consolas, PingFangSC, \'Noto Sans CJK SC\', \'Microsoft YaHei\'',
                fontSize: 16,
                insertSpaces: true,
                codeLensFontFamily: 'Menlo, \'Ubuntu Mono\', Consolas, PingFangSC, \'Noto Sans CJK SC\', \'Microsoft YaHei\'',
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
                
                acceptSuggestionOnEnter: enter_completion ? 'on' : 'off',
                
                quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true,
                },
            }}
            
            onMount={(editor, monaco: Monaco) => {
                editor.setValue(
                    module_code || 
                    localStorage.getItem(storage_keys.code) || 
                    ''
                )
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    run: execute
                })
                
                editor.addAction({
                    id: 'dolphindb.save',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                    ],
                    
                    label: t('DolphinDB: 保存代码'),
                    
                    run: save,
                })
                
                editor.addAction({
                    id: 'duplicate_line',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
                    ],
                    
                    label: t('向下复制行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.copyLinesDownAction').run()
                    }
                })
                
                editor.addAction({
                    id: 'delete_lines',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY
                    ],
                    
                    label: t('删除行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.deleteLines').run()
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
                
                inject_css()
                
                shell.set({ editor, monaco })
            }}
            
            onChange={(value, event) => {
                module_code = value
                if (shell.dirty)
                    shell.update_title()
                else
                    shell.set_dirty(true)
            }}
        />
    </div>
}


function Term () {
    const { collapsed } = model.use(['collapsed'])
    
    const rterminal = useRef<HTMLDivElement>()
    
    const [font_loaded, set_font_loaded] = useState(false)
    
    useEffect(() => {
        if (!font_loaded) {
            ;(async () => {
                await document.fonts.ready
                console.log(t('字体已全部加载'))
                set_font_loaded(true)
            })()
            return
        }
        
        function printer ({ type, data }: DdbMessage) {
            if (type === 'print')
                shell.term.writeln(data as string)
        }
        
        const on_resize = debounce(
            () => {
                shell.fit_addon?.fit()
            },
            500,
            { leading: false, trailing: true }
        )
        
        window.addEventListener('resize', on_resize)
        
        ;(async () => {
            // --- init term
            let term = shell.term = new Terminal({
                fontFamily: 'Menlo, Ubuntu Mono, Consolas, PingFangSC, Noto Sans CJK SC, Microsoft YaHei',
                fontSize: 16,
                
                cursorStyle: 'bar',
                
                disableStdin: true,
                
                convertEol: true,
                
                allowProposedApi: true,
                
                theme: {
                    background: '#ffffff',
                    foreground: '#000000',
                    cyan: '#821717',
                    yellow: '#ec7600',
                    blue: '#0070c0',
                    brightBlack: '#8e908c',
                    magenta: '#800080',
                    red: '#df0000',
                    selectionBackground: '#add6ff'
                }
            })
            
            term.loadAddon(shell.fit_addon = new FitAddon())
            
            term.loadAddon(
                new WebLinksAddon(
                    (event, url) => {
                        console.log(t('点击了 RefId 链接:'), url)
                        window.open(
                            (language === 'zh' ? 'https://dolphindb.cn/cn/' : 'https://dolphindb.com/') +
                            `help/${model.version?.startsWith('1.30') ? '130/' : ''}ErrorCode${ language === 'zh' ? 'List' : 'Reference' }/${url.slice('RefId: '.length)}/index.html`,
                            '_blank'
                        )
                    },
                    { urlRegex: /(RefId: \w+)/ }))
            
            term.open(rterminal.current)
            
            term.loadAddon(new WebglAddon())
            
            ddb.listeners.push(printer)
            
            rterminal.current.children[0]?.dispatchEvent(new Event('mousedown'))
            
            term.writeln(
                t('左侧编辑器使用指南:\n') +
                t('按 Tab 或 Enter 补全函数\n') +
                t('按 Ctrl + E 执行选中代码或光标所在行代码\n') +
                t('按 Ctrl + S 保存代码\n') +
                t('按 Ctrl + D 向下复制行\n') +
                t('按 Ctrl + Y 删除行\n') +
                t('按 F1 查看更多编辑器命令')
            )
        })()
        
        return () => {
            ddb.listeners = ddb.listeners.filter(handler => handler !== printer)
            
            window.removeEventListener('resize', on_resize)
        }
    }, [font_loaded])
    
    useEffect(() => {
        // wait for container ready
        ;(async () => {
            await delay(500)
            shell.fit_addon?.fit()
        })()
    }, [collapsed])
    
    return font_loaded ?
        <div className='term' ref={rterminal} />
    :
        <div className='term-loading'>{t('正在加载字体...')}</div>
}


function TreeView () {
    const [db_height, set_db_height] = useState(256)
    
    return <div className='treeview-content'>
        <Resizable
            className='treeview-resizable-split treeview-resizable-split1'
            enable={{
                top: false,
                right: false,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false
            }}
            minHeight='22px'
            handleStyles={{ bottom: { height: 20, bottom: -10 } }}
            handleClasses={{ bottom: 'resizable-handle' }}
            // 这个 Resizable 包括 TitleBar 和 TreeContent, TitleBar 占 27px 高度
            defaultSize={{ height: 256 + 27, width: '100%' }}
            onResizeStop={
                (event, direction, elementRef, delta) => {
                    set_db_height(db_height + delta.height)
                }
            }
        >
            <div className='databases treeview-split treeview-split1'>
                <DBs height={db_height} />
            </div>
        </Resizable>
        <div className='treeview-resizable-split2'>
            <div className='treeview-resizable-split21'>
                <Variables shared={false} />
            </div>
            <Resizable
                className='treeview-resizable-split treeview-resizable-split22'
                enable={{
                    top: true,
                    right: false,
                    bottom: false,
                    left: false,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false
                }}
                defaultSize={{ height: '100px', width: '100%' }}
                minHeight='22px'
                handleStyles={{ bottom: { height: 20, bottom: -10 } }}
                handleClasses={{ bottom: 'resizable-handle' }}
            >
                <Variables shared />
            </Resizable>
        </div>
    </div>
}


function DataView () {
    const { result } = shell.use(['result'])
    const { options } = model.use(['options'])
    
    return <div className='dataview result embed'>{
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
                <Obj obj={data} ddb={ddb} ctx='embed' options={options} />
            :
                <Obj objref={data} ddb={ddb} ctx='embed' options={options} />
        })()
    }</div>
}


interface ContextMenu {
    /** TreeItem key */
    key: string
    open: boolean
    command?: string
    database: string
    table?: string
    column?: string
}

interface MenuItem {
    label: string
    key: string
    open: boolean
    command: string
    icon?: React.ReactNode
}

const table_menu_items: MenuItem[] = [
    { label: t('查看数据表结构'),   key: '1', open: false, command: 'ShowSchema', icon: <Icon component={SvgViewTableStructure} /> },
    { label: t('查看前一百行数据'), key: '2', open: false, command: 'ShowRows', icon: <EyeOutlined /> },
    { label: t('添加列'),           key: '3', open: true,  command: 'AddColumn', icon: <Icon component={SvgAddColumn} /> },
]

const column_menu_items: MenuItem[] = [
    { label: t('修改注释'), key: '1', open: true, command: 'EditComment', icon: <EditOutlined /> }
]

/** 数据库 context menu item 调用 Modal */
const context_menu_modal_items = {
    EditComment,
    AddColumn
}

/** 数据库 context menu item 调用函数 */
const context_menu_function_items = {
    ShowRows: async (triad: DBTriad) => {
        const { database, table } = triad
        try {
            const ddbobj = await ddb.eval(`select top 100 * from loadTable("${database}", "${table}")`)
            ddbobj.name = `${table} (${t('前 100 行')})`
            shell.set({ result: { type: 'object', data: ddbobj } })
        } catch (error) {
            message.error(JSON.stringify(error))
            throw error
        }
    },
    
    ShowSchema: async (triad: DBTriad) => {
        const { database, table } = triad
        try {
            const ddbobj = await ddb.eval(`select * from schema(loadTable("${database}","${table}")).colDefs`)
            ddbobj.name = `${table}.schema`
            shell.set({ result: { type: 'object', data: ddbobj } })
        } catch (error) {
            message.error(JSON.stringify(error))
            throw error
        }
    }
}



function AddColumn ({
    database,
    table,
    onOk,
    onCancel,
    loadData
}: {
    database: string
    table: string
    onOk: () => void
    onCancel: () => void
    loadData: ({ key, needLoad }: { key: string, needLoad: boolean }) => void
}) {
    const coltypes = [
        'BOOL',
        'CHAR',
        'SHORT',
        'INT',
        'LONG',
        'DATE',
        'MONTH',
        'TIME',
        'MINUTE',
        'SECOND',
        'DATETIME',
        'TIMESTAMP',
        'NANOTIME',
        'NANOTIMESTAMP',
        'FLOAT',
        'DOUBLE',
        'SYMBOL',
        'STRING',
        'UUID',
        'DICT',
        'IPADDR',
        'INT128',
        'BLOB',
        'COMPLEX',
        'POINT'
    ] as const
    
    const [form] = Form.useForm()
    const onFinish = async values => {
        const { column, type } = values
        if (database && table) 
            try {
                await ddb.eval(`addColumn(loadTable(database("${database}"), "${table}"), ["${column}"], [${type.toUpperCase()}])`)
                message.success(t('添加成功'))
                loadData({ key: database, needLoad: true })
            } catch (error) {
                message.error(error.message)
            }
        
        form.resetFields()
        onOk()
    }
    
    const onAbord = () => {
        form.resetFields()
        onCancel()
    }
    
    return <Form className='db-modal-form' name='add-column' labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item label={t('列名')} name='column' rules={[{ required: true, message: t('请输入列名！') }]}>
            <Input placeholder={t('输入名字')} />
        </Form.Item>
        <Form.Item label={t('类型')} name='type' rules={[{ required: true, message: t('请选择该列的类型！') }]}>
            <Select showSearch placeholder={t('选择类型')}>
                {coltypes.map(v => (
                    <Option key={v}>{v}</Option>
                ))}
            </Select>
        </Form.Item>
        <Form.Item className='db-modal-content-button-group'>
            <Button type='primary' htmlType='submit'>
                {t('确定')}
            </Button>
            <Button htmlType='button' onClick={onAbord}>
                {t('取消')}
            </Button>
        </Form.Item>
    </Form>
}

function EditComment ({
    database,
    table,
    column,
    onOk,
    onCancel
}: {
    database: string
    table: string
    column: string
    onOk: () => void
    onCancel: () => void
}) {
    const [form] = Form.useForm()
    const onFinish = async values => {
        const { comment } = values
        if (database && table && column) 
            try {
                await ddb.eval(`setColumnComment(loadTable(database("${database}"), "${table}"), { "${column}": "${comment.replaceAll('"', '\\"')}" })`)
                message.success(t('修改注释成功'))
            } catch (error) {
                message.error(error)
            }
        
        form.resetFields()
        onOk()
    }
    const onAbord = () => {
        form.resetFields()
        onCancel()
    }
    return (
        <Form
            labelWrap
            name='edit-comment'
            onFinish={onFinish}
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 20 }}
            className='db-modal-form'
            form={form}
        >
            <Form.Item label={t('注释')} name='comment' rules={[{ required: true, message: t('请输入注释') }]}>
                <Input />
            </Form.Item>
            <Form.Item className='db-modal-content-button-group'>
                <Button type='primary' htmlType='submit'>
                    {t('确定')}
                </Button>
                <Button htmlType='button' onClick={onAbord}>
                    {t('取消')}
                </Button>
            </Form.Item>
        </Form>
    )
}

interface DBTriad {
    type: 'database' | 'table' | 'column'
    database: string
    table?: string
    column?: string
}

/** 数据库表，数据库列的标题和右键菜单 */
function DBItemTitle ({
    entity,
    items,
    _key: key,
    onChange,
    extra,
}: {
    entity: DBTriad
    items: MenuItem[]
    _key: string
    onChange: (menu: ContextMenu) => void
    extra?: string
}) {
    const name = entity[entity.type]
    
    const onClick = async ({ key: _key }) => {
        const item = items.filter(item => item.key === _key)[0]
        if (item.open) 
            onChange({
                key: _key,
                open: true,
                command: item.command,
                ...entity
            })
         else {
            await context_menu_function_items[item.command](entity)
            onChange({
                key: _key,
                open: false,
                ...entity
            })
        }
    }
    
    
    return <Dropdown
        trigger={['contextMenu']}
        onOpenChange={open => {
            if (open) 
                onChange({ key, open: false, ...entity })
        }}
        menu={{
            className: 'db-context-menu',
            items,
            onClick,
        }}
    >
        <span
            className={`db-item-${entity.type}`}
            onClick={async event => {
                if (entity.type === 'table') {
                    await context_menu_function_items.ShowRows(entity)
                    onChange({ key, open: false, ...entity })
                }
            }}
        >
            <span className='name'>{name}</span>
            {extra ? `: ${extra}` : ''}
        </span>
    </Dropdown>
}


class TreeDataItem implements BasicDataNode {
    title: React.ReactElement
    key: string
    children?: TreeDataItem[]
    icon?: any
    tooltip?: string
    isLeaf?: boolean
    needLoad?: boolean
    className?: string
    
    constructor (
        title: string | React.ReactElement,
        key: string,
        icon?: any,
        children?: TreeDataItem[],
        tooltip?: string,
        isLeaf?: boolean,
        needLoad?: boolean,
        className?: string
    ) {
        const name = typeof title === 'string' ? /^(\w+)/.exec(title)[1] : ''
        
        this.title = <>{typeof title === 'string' ? (
                <>
                    <span className='name'>{name}</span>
                    {title.slice(name.length)}
                </>
            ) : title}</>
        
        this.key = key
        this.children = children
        this.icon = icon || <Icon component={SvgVar} />
        this.tooltip = tooltip
        this.isLeaf = isLeaf
        this.needLoad = needLoad || false
        this.className = className
    }
}


class DdbEntity {
    path: string

    empty = false // after load

    tables: TableEntity[] = []

    path_part1: string
    path_part2: string
    
    constructor(data: Partial<DdbEntity>) {
        Object.assign(this, data)
        const [part1, ...part2_] = this.path.slice(6).split('.')
        const part2 = part2_.join('.')
        // dfs://a.b   ->   [part1, part2] = [a, b]
        this.path_part1 = part1
        this.path_part2 = part2
    }
    
    to_tree_data_item (on_menu): TreeDataItem {
        return new TreeDataItem(
            <span className='name'>{this.path_part2 || this.path}</span>,
            this.path,
            <Icon component={SvgDatabase} />,
            this.tables.map(table => table.to_tree_data_item(on_menu)),
            null,
            false,
            true,
            this.empty ? 'ant-tree-treenode-empty' : null
        )
    }
}



class TableEntity {
    name: string
    
    ddb_path: string
    
    labels: string[]
    
    column_schema: { name: string, type: DdbType }[]
    
    constructor(data: Partial<TableEntity>) {
        Object.assign(this, data)
        this.labels = this.column_schema?.map(obj =>
            `${obj.name}<${DdbType[obj.type]}>`
        )
    }
    
    to_tree_data_item (onChange: (menu: ContextMenu) => void): TreeDataItem {
        return new TreeDataItem(
            <DBItemTitle 
                entity={{ type: 'table', database: this.ddb_path, table: this.name }}
                items={table_menu_items}
                _key={`${this.ddb_path}/${this.name}`}
                onChange={onChange}
            />,
            
            `${this.ddb_path}/${this.name}`,
            
            <Icon component={SvgTable} />,
            
            this.column_schema.map(column => {
                const key = `${this.ddb_path}/${this.name}/${column.name}`
                
                return new TreeDataItem(
                    <DBItemTitle 
                        entity={{ type: 'column', database: this.ddb_path, table: this.name, column: column.name }}
                        items={column_menu_items}
                        _key={key}
                        onChange={onChange}
                        extra={DdbType[column.type]}
                    />,
                    key,
                    <Icon component={SvgColumn} />,
                    null, null, true)
            }),
            null,
            false
        )
    }
}


function DBs ({ height }: { height: number }) {
    const { dbs } = shell.use(['dbs'])
    const [expanded_keys, set_expanded_keys] = useState([])
    const [loaded_keys, set_loaded_keys] = useState([])
    const [menu, on_menu] = useState<ContextMenu | null>()
    const [selected_keys, set_selected_keys] = useState([])
    
    /*
        tree_data 每个节点都是一个 DdbEntity 或者 TableEntity, 在构造 tree_data 时会调用 to_tree_data_item 将上述 entity 转化为真正的 TreeDataItem
        
        当库 / 表很多的时候，如果更新其中一项就要重新构造整个 tree_data 的话就会发生很多次不必要的 to_tree_data_item 调用
        
        此处做一个缓存操作，tree_data 只会在首次加载组件时完成一次从头到尾的构建，并构造一个 map，键是 TreeDataItem 的 key，值是这个 TreeDataItem 在树中的位置 position
        
        每次展开一个树节点时，会调用 load_data, 读取当前正在操作的 key，更新 TreeDataItem 。通过 treeData[position] = new_TreeDataItem 的方式更新树。这样每次调用 load_data 就只会发生一次 to_tree_data_item 调用
    */
   
    const [tree_data, set_tree_data] = useState<TreeDataItem[]>([])
    const index_of_path_in_grouped_tree_data = useRef<Map<string, number[]>>(new Map())
    
    useEffect(() => {
        if (menu?.key)
            set_selected_keys([menu.key])
    }, [menu])
    
    useEffect(() => {
        if (!dbs) 
            return
        
        //  dfs://a.b 形式的库将会被归入 group_with_path_part2   dfs://xxx 的普通数据库将会被归入 dbs_without_path_part2
        
        const group_with_path_part2: TreeDataItem[] = []
        const dbs_without_path_part2: TreeDataItem[] = []
        
        // 记录某个 group 底下有哪些数据库
        const part1_group_map: Map<string, DdbEntity[]> = new Map()
        
        for (const db of dbs.values()) {
            const [part1, ...part2_] = db.path.slice(6).split('.')
            const part2 = part2_?.join('.')
            
            if (!part2) {
                dbs_without_path_part2.push(db.to_tree_data_item(on_menu))
                continue
            }
            
            if (!part1_group_map.has(part1)) part1_group_map.set(part1, [db])
            else part1_group_map.get(part1).push(db)
        }
        
        for (const key of part1_group_map.keys()) {
            const new_group = new TreeDataItem(
                <span className='name'>{`dfs://${key}`}</span>,
                `group-${key}`,
                <FolderOutlined color='#4a5eed' />,
                part1_group_map.get(key).map(ddb_entity => ddb_entity.to_tree_data_item(on_menu))
            )
            group_with_path_part2.push(new_group)
        }
        
        const tree_data = dbs_without_path_part2.concat(group_with_path_part2)
        
        for (let i = 0; i < tree_data.length; i++) 
            if (tree_data[i].key.startsWith('group-')) {
                const children_length = tree_data[i].children.length
                for (let j = 0; j < children_length; j++)
                    index_of_path_in_grouped_tree_data.current.set(tree_data[i].children[j].key, [i, j])
            } else
                index_of_path_in_grouped_tree_data.current.set(tree_data[i].key, [i])
        
        set_tree_data(tree_data)
    }, [dbs])
    
    if (!dbs)
        return
    
    async function load_data ({ key, needLoad }: Partial<TreeDataItem>) {
        if (!needLoad)
            return
        
        let tables_ = null
        try {
            const tables = (await ddb.eval<DdbObj<DdbObj[]>>(`each(def (x): loadTable("${key}", x, memoryMode=false), getTables(database("${key}")))`))
                .value.map(tb =>
                    new TableEntity({
                        name: tb.name,
                        ddb_path: key,
                        column_schema: (tb.value as DdbObj[]).map(col => ({ name: col.name, type: col.type }))
                    })
                )
            
            tables_ = tables
        } catch (error) {
            let i = (error.message as string).indexOf('<NotAuthenticated>')
            if (i === -1)
                i = (error.message as string).indexOf('<NoPrivilege>')
            const errmsg = i === -1 ? error.message as string : (error.message as string).slice(i)
            set_loaded_keys([...loaded_keys, key])
            message.error(errmsg)
            shell.term.writeln(red(errmsg))
            throw error
        } finally{
            const [part1, ...part2_] = key.slice(6).split('.')
            const part2 = part2_.join('.')
            
            const grouped_tree_data_ = [...tree_data]
            if (part2) {
                const [index1, index2] = index_of_path_in_grouped_tree_data.current.get(key)
                grouped_tree_data_[index1].children[index2] = tables_
                    ? new DdbEntity({ path: key, tables: tables_ }).to_tree_data_item(on_menu)
                    : new DdbEntity({ path: key, empty: true }).to_tree_data_item(on_menu)
            } else {
                const [index] = index_of_path_in_grouped_tree_data.current.get(key)
                grouped_tree_data_[index] = tables_
                    ? new DdbEntity({ path: key, tables: tables_ }).to_tree_data_item(on_menu)
                    : new DdbEntity({ path: key, empty: true }).to_tree_data_item(on_menu)
            }
            
            set_tree_data(grouped_tree_data_)
        }
    }
    
    
    return <div className='database-panel'>
        <div className='type'>
            {t('数据库')}
            <span className='extra'>
                <span onClick={async () => {
                    await shell.load_dbs()
                    set_expanded_keys([])
                    set_loaded_keys([])
                }}>
                    <Tooltip title={t('刷新')} color={'grey'}>
                        <SyncOutlined />
                    </Tooltip>
                </span>
                <span
                    onClick={() => {
                        set_expanded_keys([])
                    }}
                >
                    <Tooltip title={t('全部折叠')} color={'grey'}>
                        <MinusSquareOutlined />
                    </Tooltip>
                </span>
            </span>
        </div>
        
        <div className='tree-content'>
            <Tree
                className='database-tree'
                showIcon
                focusable={false}
                blockNode
                showLine
                // 启用虚拟滚动
                height={height}
                treeData={tree_data}
                loadData={load_data}
                onLoad={keys => {
                    set_loaded_keys([...keys])
                }}
                expandedKeys={expanded_keys}
                loadedKeys={loaded_keys}
                onExpand={keys => {
                    set_expanded_keys([...keys])
                }}
                selectedKeys={selected_keys}
                onContextMenu={event => { event.preventDefault() }}
                onSelect={keys => {
                    set_selected_keys(keys)
                }}
            />
        </div>
        
        <DBModal
            open={menu && menu.open}
            command={menu ? menu.command : ''}
            database={menu?.database}
            table={menu?.table}
            column={menu?.column}
            loadData={load_data}
        />
    </div>
}


function DBModal ({ open, database, table, column, command, loadData }: {
    open: boolean
    database?: string,
    table?: string,
    column?: string,
    command: string,
    loadData: ({ key, needLoad }: { key: string, needLoad: boolean }) => void,
}) {
    const [is_modal_open, set_is_modal_open] = useState<boolean>(open)
    
    useEffect(() => {
        set_is_modal_open(open)
    }, [open])
    
    const ModalContent = context_menu_modal_items[command] || (() => <div />)
    
    const genTitle = (command: string): string => {
        return table_menu_items.find(v => v.command === command)?.label || column_menu_items.find(v => v.command === command)?.label || ''
    }
    
    return <Modal className='db-modal' open={is_modal_open} onOk={() => { set_is_modal_open(false) }} onCancel={() => { set_is_modal_open(false) }} title={genTitle(command)}>
        <div className='db-modal-content'>
            <ModalContent
                database={database}
                table={table}
                column={column}
                onOk={() => { set_is_modal_open(false) }}
                onCancel={() => { set_is_modal_open(false) }}
                loadData={loadData} />
        </div>
    </Modal>
}



function Variables ({ shared }: { shared?: boolean }) {
    const { vars } = shell.use(['vars'])
    
    const [expandedKeys, setExpandedKeys] = useState(Array(10).fill(0).map((_x, i) => i.toString()))
    
    const vars_ = vars ? vars.filter(v => {
        return v.shared === shared
    }) : []
    
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
    
    let treedata = [scalar, object, pair, vector, set, dict, matrix, table, chart].filter(node => node.children)
    
    // console.log('treedata', treedata)
    
    function onExpand (keys, obj) {
        setExpandedKeys([...keys])
    }
    
    return <div
        className={`variables treeview-split ${shared ? 'treeview-split3 shared' : 'treeview-split2 local'}`}>
        <div className='type'>{shared ? t('共享变量') : t('本地变量')}
            <span onClick={() => { setExpandedKeys([]) }}>
                <Tooltip title={t('全部折叠')} color={'grey'}>
                <MinusSquareOutlined />
                </Tooltip>
            </span>
        </div>
        <div className='tree-content'>
            <Tree
                showIcon
                defaultExpandAll
                focusable={false}
                blockNode
                showLine
                motion={null}
                treeData={treedata}
                expandedKeys={expandedKeys}
                onExpand={onExpand}
                onSelect={async ([key]) => {
                    if (!key)
                        return

                    const v = vars.find(node => node.name === key)
                    
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
    </div >
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
    
    options?: InspectOptions
    
    
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
                        return ' = ' + format(this.type, this.obj.value, this.obj.le, { ...this.options, quote: true, nullstr: true })
                        
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
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0; i < items.length; i++)
                                    items[i] = format(this.type, value.subarray(16 * i, 16 * (i + 1)), this.obj.le, options)
                                
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            case DdbType.complex:
                            case DdbType.point: {
                                const limit = 20 as const
                                
                                const value = this.obj.value as Float64Array
                                
                                const len_data = value.length / 2
                                
                                let items = new Array(Math.min(limit, len_data))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0; i < items.length; i++)
                                    items[i] = format(this.type, value.subarray(2 * i, 2 * (i + 1)), this.obj.le, options)
                                
                                return ' = ' + format_array(items, len_data > limit)
                            }
                            
                            default: {
                                const limit = 50 as const
                                
                                let items = new Array(Math.min(limit, (this.obj.value as any[]).length))
                                
                                const options = { ...this.options, quote: true, nullstr: true }
                                
                                for (let i = 0; i < items.length; i++)
                                    items[i] = format(this.type, this.obj.value[i], this.obj.le, options)
                                
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


// ------------ tokenizer
// 方法来自: https://github.com/bolinfest/monaco-tm/

interface ScopeNameInfo {
    /** 
        If set, this is the id of an ILanguageExtensionPoint. This establishes the
        mapping from a MonacoLanguage to a TextMate grammar.
    */
    language?: string
    
    /** 
        Scopes that are injected *into* this scope. For example, the
        `text.html.markdown` scope likely has a number of injections to support
        fenced code blocks.
    */
    injections?: string[]
}


interface DemoScopeNameInfo extends ScopeNameInfo {
    path: string
}


const grammars: {
    [scopeName: string]: DemoScopeNameInfo
} = {
    'source.dolphindb': {
        language: 'dolphindb',
        path: 'dolphindb.tmLanguage.json'
    }
}


let registry = new Registry({
    onigLib: Promise.resolve({
        createOnigScanner,
        createOnigString
    }),
    
    async loadGrammar (scopeName: string): Promise<IRawGrammar | null> {
        const scopeNameInfo = grammars[scopeName]
        if (scopeNameInfo == null) 
            return null
        
        const grammar_text: string = JSON.stringify(tm_language)
        
        // If this is a JSON grammar, filePath must be specified with a `.json`
        // file extension or else parseRawGrammar() will assume it is a PLIST
        // grammar.
        return parseRawGrammar(grammar_text, 'dolphindb.json')
    },
    
    /** 
        For the given scope, returns a list of additional grammars that should be
        "injected into" it (i.e., a list of grammars that want to extend the
        specified `scopeName`). The most common example is other grammars that
        want to "inject themselves" into the `text.html.markdown` scope so they
        can be used with fenced code blocks.
        
        In the manifest of a VS Code extension,  grammar signals that it wants
        to do this via the "injectTo" property:
        https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#injection-grammars
    */
    getInjections (scopeName: string): string[] | undefined {
        const grammar = grammars[scopeName]
        return grammar ? grammar.injections : undefined
    },
    
    theme
})


class TokensProviderCache {
    private scopeNameToGrammar: Map<string, Promise<IGrammar>> = new Map()
    
    constructor (private registry: Registry) { }
    
    async createEncodedTokensProvider (scopeName: string, encodedLanguageId: number): Promise<monacoapi.languages.EncodedTokensProvider> {
        const grammar = await this.getGrammar(scopeName, encodedLanguageId)
        
        return {
            getInitialState () {
                return INITIAL
            },
            
            tokenizeEncoded (line: string, state: monacoapi.languages.IState): monacoapi.languages.IEncodedLineTokens {
                const tokenizeLineResult2 = grammar.tokenizeLine2(line, state as StateStack)
                const { tokens, ruleStack: endState } = tokenizeLineResult2
                return { tokens, endState }
            }
        }
    }
    
    getGrammar (scopeName: string, encodedLanguageId: number): Promise<IGrammar> {
        const grammar = this.scopeNameToGrammar.get(scopeName)
        if (grammar != null) 
            return grammar
        
        
        // This is defined in vscode-textmate and has optional embeddedLanguages
        // and tokenTypes fields that might be useful/necessary to take advantage of
        // at some point.
        const grammarConfiguration = { }
        
        // We use loadGrammarWithConfiguration() rather than loadGrammar() because
        // we discovered that if the numeric LanguageId is not specified, then it
        // does not get encoded in the TokenMetadata.
        //
        // Failure to do so means that the LanguageId cannot be read back later,
        // which can cause other Monaco features, such as "Toggle Line Comment",
        // to fail.
        const promise = this.registry
            .loadGrammarWithConfiguration(scopeName, encodedLanguageId, grammarConfiguration)
            .then((grammar: IGrammar | null) => {
                if (grammar) 
                    return grammar
                 else 
                    throw Error(`failed to load grammar for ${scopeName}`)
            })
        this.scopeNameToGrammar.set(scopeName, promise)
        return promise
    }
}


function create_style_element_for_colors_css (): HTMLStyleElement {
    // We want to ensure that our <style> element appears after Monaco's so that
    // we can override some styles it inserted for the default theme.
    const style = document.createElement('style')
    
    // We expect the styles we need to override to be in an element with the class
    // name 'monaco-colors' based on:
    // https://github.com/microsoft/vscode/blob/f78d84606cd16d75549c82c68888de91d8bdec9f/src/vs/editor/standalone/browser/standaloneThemeServiceImpl.ts#L206-L214
    const monacoColors = document.getElementsByClassName('monaco-colors')[0]
    if (monacoColors) 
        monacoColors.parentElement?.insertBefore(style, monacoColors.nextSibling)
     else {
        // Though if we cannot find it, just append to <head>.
        let { head } = document
        if (head == null) 
            head = document.getElementsByTagName('head')[0]
        
        head?.appendChild(style)
    }
    return style
}

/** 
    Be sure this is done after Monaco injects its default styles so that the
    injected CSS overrides the defaults.
*/
function inject_css () {
    const css_colors = registry.getColorMap()
    const colorMap = css_colors.map(Color.Format.CSS.parseHex)
    const css = generateTokensCSSForColorMap(colorMap)
    const style = create_style_element_for_colors_css()
    style.innerHTML = css
}


// ------------ 函数补全、文档

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
    const func_doc = docs[keyword] || docs[keyword + '!']
    
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
    } as monacoapi.IMarkdownString
}


/** 利用当前光标找出函数参数开始位置及函数名, 若找不到返回 -1 */
function find_func_start (
    document: monacoapi.editor.ITextModel,
    position: monacoapi.Position
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
    document: monacoapi.editor.ITextModel,
    position: monacoapi.Position,
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


