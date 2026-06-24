import type { DocsProvider } from 'dolphindb/docs.js'

import type { Monaco, monacoapi } from './MonacoEditor.tsx'


/** 最大搜索行数 */
const MAX_MATCH_LINES = 30

let docs_provider: DocsProvider


export function set_docs_provider (_docs_provider: DocsProvider) {
    docs_provider = _docs_provider
}


export function register_monaco_language_providers (monaco: Monaco) {
    const { languages } = monaco
    const { CompletionItemKind } = languages
    
    if (!docs_provider)
        throw new Error('You must set docs_provider first')
    
    function wrap_markdown_string (md: string) {
        return {
            isTrusted: true,
            supportHtml: true,
            value: md
        }
    }
    
    languages.registerCompletionItemProvider('dolphindb', {
        provideCompletionItems (model, pos) {
            const keyword = model.getWordAtPosition(pos)?.word ?? ''
            
            const { functions, constants, keywords } = docs_provider.complete(keyword)
            
            return {
                suggestions: [
                    ...keywords.map(kw => ({
                        label: kw,
                        insertText: kw,
                        kind: CompletionItemKind.Keyword
                    })),
                    ...constants.map(constant => ({
                        label: constant,
                        insertText: constant,
                        kind: CompletionItemKind.Constant
                    })),
                    ...functions.map(fn => ({
                        label: fn,
                        insertText: fn,
                        kind: CompletionItemKind.Function
                    }))
                ] as monacoapi.languages.CompletionItem[]
            }
        },
        
        resolveCompletionItem (item) {
            const md = docs_provider.get_function_markdown(item.label as string)
            
            if (md) 
                item.documentation = wrap_markdown_string(md)
            
            
            return item
        }
    })
    
    languages.registerHoverProvider('dolphindb', {
        provideHover (doc, pos, _canceller) {
            const word = doc.getWordAtPosition(pos)
            
            if (!word) 
                return
            
            const md = docs_provider.get_function_markdown(word.word)
            
            if (!md) 
                return
            
            
            return {
                contents: [wrap_markdown_string(md)]
            }
        }
    })
    
    languages.registerSignatureHelpProvider('dolphindb', {
        signatureHelpTriggerCharacters: ['(', ','],
        
        provideSignatureHelp (doc, pos) {
            const text = doc.getValueInRange({
                startLineNumber: Math.max(pos.lineNumber - MAX_MATCH_LINES, 0),
                startColumn: 0,
                endLineNumber: pos.lineNumber,
                endColumn: pos.column
            })
            
            const result = docs_provider.get_signature_help(text)
            if (!result) 
                return
            
            const { signature, active_parameter, documentation_md } = result
            
            return {
                dispose () { },
                
                value: {
                    activeSignature: 0,
                    activeParameter: -1,
                    signatures: [
                        {
                            label: signature.full,
                            activeParameter: active_parameter,
                            documentation: documentation_md ? wrap_markdown_string(documentation_md) : undefined,
                            parameters: signature.parameters.map(param => ({
                                label: param.full
                            }))
                        }
                    ]
                }
            }
        }
    })
}
