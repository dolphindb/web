import { generateTokensCSSForColorMap } from 'monaco-editor/esm/vs/editor/common/languages/supports/tokenization.js'
import { Color } from 'monaco-editor/esm/vs/base/common/color.js'


import {
    INITIAL,
    Registry,
    parseRawGrammar,
    type IGrammar,
    type StateStack,
} from 'vscode-textmate'
import type { IRawGrammar } from 'vscode-textmate/release/rawGrammar.js'

import { createOnigScanner, createOnigString } from 'vscode-oniguruma'


import { tm_language } from 'dolphindb/language.js'
import { theme_light } from 'dolphindb/theme.light.js'


import type { monacoapi } from './index.js'


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
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    
    async loadGrammar (scopeName: string): Promise<IRawGrammar | null> {
        const scopeNameInfo = grammars[scopeName]
        if (scopeNameInfo === null || scopeNameInfo === undefined) 
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
    
    theme: theme_light
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
    
    async getGrammar (scopeName: string, encodedLanguageId: number): Promise<IGrammar> {
        const grammar = this.scopeNameToGrammar.get(scopeName)
        if (grammar) 
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
        if (!head) 
            head = document.getElementsByTagName('head')[0]
        
        head?.appendChild(style)
    }
    return style
}


/** 
    Be sure this is done after Monaco injects its default styles so that the
    injected CSS overrides the defaults. */
export function inject_css () {
    const css_colors = registry.getColorMap()
    const colorMap = css_colors.map(Color.Format.CSS.parseHex)
    const css = generateTokensCSSForColorMap(colorMap)
    const style = create_style_element_for_colors_css()
    style.innerHTML = css
}


export async function register_tokenizer (languages: typeof monacoapi.languages) {
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
    
    
    languages.setTokensProvider(
        'dolphindb',
        
        await new TokensProviderCache(registry)
            .createEncodedTokensProvider(
                'source.dolphindb',
                languages.getEncodedLanguageId('dolphindb')
            )
    )
}

