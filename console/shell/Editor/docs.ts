// ------------ 函数补全、文档
import { request_json } from 'xshell/net.browser.js'

import { keywords, constants } from 'dolphindb/language.js'


import { t, language } from '../../../i18n/index.js'

import type { monacoapi } from './index.js'


const constants_lower = constants.map(constant => constant.toLowerCase())

let docs = { }

let funcs: string[] = [ ]
let funcs_lower: string[] = [ ]


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


export async function load_docs () {
    const fname = `docs.${ language === 'zh' ? 'zh' : 'en' }.json`
    
    docs = await request_json(`./${fname}`)
    
    funcs = Object.keys(docs)
    funcs_lower = funcs.map(func => func.toLowerCase())
    
    console.log(t('函数文档 {{fname}} 已加载', { fname }))
}


export function register_docs (languages: typeof monacoapi.languages) {
    const { CompletionItemKind } = languages
    
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
}


/** 使 suggest details 始终保持显示 */
export function set_details_visible (editor: monacoapi.editor.IStandaloneCodeEditor) {
    // https://github.com/microsoft/monaco-editor/issues/3216
    // monaco@0.35.0 采用 minify 过的代码，在不使用 esm bundle 的情况下，无法直接访问 suggestWidget 的属性
    // 我们采用一种暴力的方法，直接访问 suggestWidget 的私有属性
    // 可以从 esm 包中找到原函数 (monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestWidget.js)
    // 文件内搜索 `_setDetailsVisible` 可以搜 "expandSuggestionDocs" 这个字段
    // 然后对比 dev 包中的代码 (monaco-editor/dev/vs/editor/editor.main.js)
    // 也搜索 "expandSuggestionDocs" 这个字段，找到 `_setDetailsVisible` minify 之后的函数名（现在是 X），写在下面
    // edit: 0.37.0 版本又改回来了，直接调用 _setDetailsVisible 就可以了
    
    (editor.getContribution('editor.contrib.suggestController') as any).widget.value._setDetailsVisible(true)
    
    // suggest_widget._persistedSize.store({
    //     width: 200,
    //     height: 256
    // })
}